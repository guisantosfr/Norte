package com.norte.norte_api.dto;

/**
 * DTO de saída para login e cadastro bem-sucedidos.
 * Carrega o token de acesso e os dados públicos do usuário autenticado.
 *
 * @param tokenType sempre {@code "Bearer"}, incluído para facilitar o uso pelo cliente
 * @param token     o JWT de acesso assinado
 * @param user      dados públicos do usuário (sem senha)
 */
public record AuthResponseDTO(

        String tokenType,
        String token,
        UserResponseDTO user

) {

    /**
     * Factory method que fixa o tipo de token como {@code "Bearer"}.
     */
    public static AuthResponseDTO of(String token, UserResponseDTO user) {
        return new AuthResponseDTO("Bearer", token, user);
    }
}
