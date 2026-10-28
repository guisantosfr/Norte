package com.norte.norte_api.security;

import java.io.IOException;

import org.springframework.http.MediaType;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.stereotype.Component;

import tools.jackson.databind.ObjectMapper;
import com.norte.norte_api.exception.ApiErrorResponse;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

/**
 * Chamado pelo Spring Security quando uma requisição a um endpoint protegido
 * chega sem autenticação válida (token ausente, expirado ou com assinatura inválida).
 *
 * <p>Esta classe trata o caso <em>antes</em> dos controllers — o filtro JWT rejeitou
 * silenciosamente o token e o {@code SecurityContextHolder} ficou vazio. O Spring
 * Security detecta a ausência de autenticação e delega aqui.
 *
 * <p>Resposta: {@code 401 Unauthorized} no mesmo envelope {@link ApiErrorResponse}
 * usado pelo {@code GlobalExceptionHandler}, garantindo formato uniforme em toda a API.
 */
@Component
public class JwtAuthenticationEntryPoint implements AuthenticationEntryPoint {

    private final ObjectMapper objectMapper;

    public JwtAuthenticationEntryPoint(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    @Override
    public void commence(HttpServletRequest request,
                         HttpServletResponse response,
                         AuthenticationException authException) throws IOException {

        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding("UTF-8");

        ApiErrorResponse body = ApiErrorResponse.unauthorized(
                request.getRequestURI(),
                "Autenticação necessária. Forneça um token Bearer válido.");

        objectMapper.writeValue(response.getWriter(), body);
    }
}
