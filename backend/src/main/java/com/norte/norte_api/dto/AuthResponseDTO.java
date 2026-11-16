package com.norte.norte_api.dto;

/**
 * DTO de saída para login, cadastro e renovação de sessão bem-sucedidos.
 * Carrega o token de acesso JWT, o refresh token opaco e os dados públicos do usuário.
 *
 * @param tokenType    sempre {@code "Bearer"}, incluído para facilitar o uso pelo cliente
 * @param token        o JWT de acesso assinado (curta duração)
 * @param refreshToken token opaco utilizado para renovar a sessão sem exigir novo login
 * @param user         dados públicos do usuário (sem senha)
 */
public record AuthResponseDTO(

        String tokenType,
        String token,
        String refreshToken,
        UserResponseDTO user

) {

    /**
     * Factory method que fixa o tipo de token como {@code "Bearer"}.
     */
    public static AuthResponseDTO of(String token, String refreshToken, UserResponseDTO user) {
        return new AuthResponseDTO("Bearer", token, refreshToken, user);
    }
}
