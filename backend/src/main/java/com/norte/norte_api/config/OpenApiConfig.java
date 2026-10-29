package com.norte.norte_api.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;

/**
 * Metadados da documentação OpenAPI — carregado apenas no perfil {@code dev}.
 *
 * <p>Registra o esquema {@code bearerAuth} (JWT) para que o Swagger UI exiba o
 * botão "Authorize" e envie o header {@code Authorization: Bearer <token>}.
 */
@Configuration
@Profile("dev")
public class OpenApiConfig {

    private static final String BEARER_SCHEME = "bearerAuth";

    @Bean
    public OpenAPI norteOpenApi() {
        return new OpenAPI()
                .info(new Info()
                        .title("Norte API")
                        .version("v1")
                        .description("API REST do Norte. Obtenha um token em /auth/register ou "
                                + "/auth/login e use o botão Authorize."))
                .components(new Components()
                        .addSecuritySchemes(BEARER_SCHEME, new SecurityScheme()
                                .type(SecurityScheme.Type.HTTP)
                                .scheme("bearer")
                                .bearerFormat("JWT")))
                .addSecurityItem(new SecurityRequirement().addList(BEARER_SCHEME));
    }
}
