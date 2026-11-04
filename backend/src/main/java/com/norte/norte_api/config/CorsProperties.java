package com.norte.norte_api.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

import jakarta.validation.constraints.NotBlank;

/**
 * Propriedades de configuração de CORS mapeadas a partir do prefixo {@code cors}.
 *
 * @param allowedOrigins lista de origens permitidas separadas por vírgula
 */
@Validated
@ConfigurationProperties(prefix = "cors")
public record CorsProperties(
        @NotBlank(message = "A propriedade cors.allowed-origins é obrigatória")
        String allowedOrigins
) {
}
