package com.norte.norte_api.dto;

/**
 * Payload opcional de entrada para revogação de sessão no logout.
 *
 * @param refreshToken token opaco a ser revogado no servidor
 */
public record LogoutRequestDTO(
        String refreshToken
) {
}
