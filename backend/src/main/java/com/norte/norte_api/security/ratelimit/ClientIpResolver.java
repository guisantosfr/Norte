package com.norte.norte_api.security.ratelimit;

import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import com.norte.norte_api.config.AuthProperties;

import jakarta.servlet.http.HttpServletRequest;

/**
 * Resolve o endereço IP de origem da requisição para fins de rate limiting.
 *
 * <p>Por padrão utiliza {@link HttpServletRequest#getRemoteAddr()} para evitar
 * falsificação via cabeçalho {@code X-Forwarded-For}. Quando a API estiver
 * atrás de um proxy reverso ou load balancer confiável, habilite
 * {@code auth.rate-limit.trust-proxy-headers=true}.
 */
@Component
public class ClientIpResolver {

    private static final String X_FORWARDED_FOR_HEADER = "X-Forwarded-For";
    private static final String UNKNOWN_IP = "unknown";

    private final AuthProperties authProperties;

    public ClientIpResolver(AuthProperties authProperties) {
        this.authProperties = authProperties;
    }

    public String resolve(HttpServletRequest request) {
        if (authProperties.rateLimit().trustProxyHeaders()) {
            String forwardedFor = request.getHeader(X_FORWARDED_FOR_HEADER);
            if (StringUtils.hasText(forwardedFor)) {
                String firstIp = forwardedFor.split(",")[0].trim();
                if (StringUtils.hasText(firstIp)) {
                    return firstIp;
                }
            }
        }

        String remoteAddr = request.getRemoteAddr();
        return StringUtils.hasText(remoteAddr) ? remoteAddr.trim() : UNKNOWN_IP;
    }
}
