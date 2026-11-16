package com.norte.norte_api.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

/**
 * Propriedades de configuração de autenticação avançada mapeadas a partir do prefixo {@code auth}.
 *
 * @param refreshToken configurações de ciclo de vida dos refresh tokens
 * @param rateLimit    configurações de proteção contra força bruta nas rotas públicas de autenticação
 */
@Validated
@ConfigurationProperties(prefix = "auth")
public record AuthProperties(
        @NotNull @Valid RefreshTokenProperties refreshToken,
        @NotNull @Valid RateLimitProperties rateLimit
) {

    /**
     * @param expirationDays tempo máximo de vida absoluta de uma família de refresh tokens (em dias)
     * @param inactivityDays tempo máximo de inatividade sem renovação antes da expiração (em dias)
     */
    public record RefreshTokenProperties(
            @Min(value = 1, message = "auth.refresh-token.expiration-days deve ser no mínimo 1")
            int expirationDays,
            @Min(value = 1, message = "auth.refresh-token.inactivity-days deve ser no mínimo 1")
            int inactivityDays
    ) {
    }

    /**
     * @param enabled           habilita/desabilita o rate limiting nas rotas de autenticação
     * @param trustProxyHeaders indica se cabeçalhos {@code X-Forwarded-For} devem ser considerados na resolução do IP
     * @param login             limite para {@code POST /auth/login}
     * @param register          limite para {@code POST /auth/register}
     */
    public record RateLimitProperties(
            boolean enabled,
            boolean trustProxyHeaders,
            @NotNull @Valid EndpointLimit login,
            @NotNull @Valid EndpointLimit register
    ) {
    }

    /**
     * @param capacity        número máximo de requisições permitidas na janela
     * @param durationSeconds duração da janela deslizante (em segundos)
     */
    public record EndpointLimit(
            @Min(value = 1, message = "A capacidade do rate limit deve ser no mínimo 1")
            int capacity,
            @Min(value = 1, message = "A duração da janela do rate limit deve ser no mínimo 1 segundo")
            int durationSeconds
    ) {
    }
}
