package com.norte.norte_api.security;

import java.io.IOException;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

/**
 * Filtro de autenticação JWT executado uma vez por requisição.
 *
 * <p>
 * Extrai o Bearer token do header {@code Authorization}, valida assinatura e
 * expiração via {@link JwtTokenProvider}, e popula o
 * {@link SecurityContextHolder}
 * caso o token seja válido. Requisições sem token ou com token inválido passam
 * adiante sem autenticação — o Spring Security rejeita o acesso a rotas
 * protegidas
 * através do {@code AuthenticationEntryPoint} configurado na
 * {@code SecurityConfig}.
 *
 * <p>
 * Apenas {@link UsernameNotFoundException} (usuário do token removido) é
 * tratada aqui. Outras falhas — por exemplo, banco indisponível — propagam
 * normalmente, para não serem mascaradas como falha de autenticação.
 */
@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(JwtAuthenticationFilter.class);

    private static final String BEARER_PREFIX = "Bearer ";

    private final JwtTokenProvider jwtTokenProvider;
    private final UserDetailsServiceImpl userDetailsService;

    public JwtAuthenticationFilter(JwtTokenProvider jwtTokenProvider,
            UserDetailsServiceImpl userDetailsService) {
        this.jwtTokenProvider = jwtTokenProvider;
        this.userDetailsService = userDetailsService;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain) throws ServletException, IOException {

        String token = extractToken(request);

        if (token != null) {
            jwtTokenProvider.extractSubjectIfValid(token)
                    .ifPresent(email -> authenticate(email, request));
        }

        filterChain.doFilter(request, response);
    }

    private void authenticate(String email, HttpServletRequest request) {
        UserPrincipal principal;
        try {
            principal = userDetailsService.loadPrincipalByEmail(email);
        } catch (UsernameNotFoundException ex) {
            // Token válido, mas o usuário não existe mais: a requisição segue como
            // anônima e rotas protegidas respondem 401 pelo entry point.
            log.debug("Token JWT válido para usuário inexistente; requisição seguirá sem autenticação.");
            return;
        }

        UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
                principal, null, principal.getAuthorities());
        authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));

        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(authentication);

        SecurityContextHolder.setContext(context);
    }

    /**
     * Extrai o token bruto do header Authorization.
     *
     * @return o token sem o prefixo {@code "Bearer "}, ou {@code null} se ausente
     *         ou mal formado
     */
    private String extractToken(HttpServletRequest request) {
        String header = request.getHeader("Authorization");
        if (StringUtils.hasText(header) && header.startsWith(BEARER_PREFIX)) {
            return header.substring(BEARER_PREFIX.length());
        }
        return null;
    }
}
