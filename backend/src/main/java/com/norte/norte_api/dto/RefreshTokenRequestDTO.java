package com.norte.norte_api.dto;

import jakarta.validation.constraints.NotBlank;

/**
 * Payload de entrada para renovação de sessão via refresh token.
 *
 * @param refreshToken token opaco obtido no login, cadastro ou renovação anterior
 */
public record RefreshTokenRequestDTO(
        @NotBlank(message = "O refresh token é obrigatório.")
        String refreshToken
) {
}
