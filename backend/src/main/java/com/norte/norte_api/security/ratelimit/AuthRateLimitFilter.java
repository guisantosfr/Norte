package com.norte.norte_api.security.ratelimit;

import java.io.IOException;
import java.time.Duration;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import com.norte.norte_api.config.AuthProperties;
import com.norte.norte_api.config.AuthProperties.EndpointLimit;
import com.norte.norte_api.exception.ApiErrorResponse;
import com.norte.norte_api.security.ratelimit.AuthRateLimiter.RateLimitDecision;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import tools.jackson.databind.ObjectMapper;

/**
 * Filtro de rate limiting para as rotas públicas de login ({@code POST /auth/login})
 * e cadastro ({@code POST /auth/register}).
 *
 * <p>Instanciado e registrado explicitamente na {@code SecurityFilterChain} após
 * o {@code CorsFilter} e antes dos filtros de autenticação, garantindo que:
 * <ul>
 *   <li>requisições bloqueadas não consumam CPU com {@code BCryptPasswordEncoder};</li>
 *   <li>respostas {@code 429 Too Many Requests} mantenham os headers de CORS intactos.</li>
 * </ul>
 */
public class AuthRateLimitFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(AuthRateLimitFilter.class);

    private static final String LOGIN_PATH = "/auth/login";
    private static final String REGISTER_PATH = "/auth/register";
    private static final String TOO_MANY_REQUESTS_MSG =
            "Muitas tentativas em pouco tempo. Por favor, aguarde alguns instantes antes de tentar novamente.";

    private final AuthRateLimiter rateLimiter;
    private final ClientIpResolver clientIpResolver;
    private final AuthProperties authProperties;
    private final ObjectMapper objectMapper;

    public AuthRateLimitFilter(
            AuthRateLimiter rateLimiter,
            ClientIpResolver clientIpResolver,
            AuthProperties authProperties,
            ObjectMapper objectMapper) {
        this.rateLimiter = rateLimiter;
        this.clientIpResolver = clientIpResolver;
        this.authProperties = authProperties;
        this.objectMapper = objectMapper;
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain) throws ServletException, IOException {

        if (!authProperties.rateLimit().enabled() || !HttpMethod.POST.matches(request.getMethod())) {
            filterChain.doFilter(request, response);
            return;
        }

        String path = resolvePath(request);
        RouteLimit routeLimit = resolveRouteLimit(path);

        if (routeLimit == null) {
            filterChain.doFilter(request, response);
            return;
        }

        String clientIp = clientIpResolver.resolve(request);
        String bucketKey = routeLimit.routeKey() + ":" + clientIp;
        Duration window = Duration.ofSeconds(routeLimit.limit().durationSeconds());

        RateLimitDecision decision = rateLimiter.tryAcquire(bucketKey, routeLimit.limit().capacity(), window);

        if (!decision.allowed()) {
            log.warn("Rate limit excedido em {} para o IP {}", path, clientIp);
            writeTooManyRequestsResponse(request, response, decision.retryAfterSeconds());
            return;
        }

        filterChain.doFilter(request, response);
    }

    private RouteLimit resolveRouteLimit(String path) {
        if (LOGIN_PATH.equals(path)) {
            return new RouteLimit("login", authProperties.rateLimit().login());
        }
        if (REGISTER_PATH.equals(path)) {
            return new RouteLimit("register", authProperties.rateLimit().register());
        }
        return null;
    }

    private static String resolvePath(HttpServletRequest request) {
        String servletPath = request.getServletPath();
        return StringUtils.hasText(servletPath) ? servletPath : request.getRequestURI();
    }

    private void writeTooManyRequestsResponse(
            HttpServletRequest request,
            HttpServletResponse response,
            long retryAfterSeconds) throws IOException {

        response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
        response.setHeader(HttpHeaders.RETRY_AFTER, String.valueOf(retryAfterSeconds));
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding("UTF-8");

        ApiErrorResponse body = ApiErrorResponse.tooManyRequests(
                request.getRequestURI(),
                TOO_MANY_REQUESTS_MSG);

        objectMapper.writeValue(response.getWriter(), body);
    }

    private record RouteLimit(String routeKey, EndpointLimit limit) {
    }
}
