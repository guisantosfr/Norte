package com.norte.norte_api.security;

import java.io.IOException;

import org.springframework.http.MediaType;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.web.access.AccessDeniedHandler;
import org.springframework.stereotype.Component;

import tools.jackson.databind.ObjectMapper;
import com.norte.norte_api.exception.ApiErrorResponse;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

/**
 * Chamado pelo Spring Security quando um usuário <em>autenticado</em> tenta acessar
 * um recurso para o qual não possui autorização.
 *
 * <p>Resposta: {@code 403 Forbidden} no mesmo envelope {@link ApiErrorResponse}
 * usado pelo {@code GlobalExceptionHandler} e pelo {@link JwtAuthenticationEntryPoint}.
 */
@Component
public class JwtAccessDeniedHandler implements AccessDeniedHandler {

    private final ObjectMapper objectMapper;

    public JwtAccessDeniedHandler(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    @Override
    public void handle(HttpServletRequest request,
                       HttpServletResponse response,
                       AccessDeniedException accessDeniedException) throws IOException {

        response.setStatus(HttpServletResponse.SC_FORBIDDEN);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding("UTF-8");

        ApiErrorResponse body = ApiErrorResponse.forbidden(request.getRequestURI());

        objectMapper.writeValue(response.getWriter(), body);
    }
}
