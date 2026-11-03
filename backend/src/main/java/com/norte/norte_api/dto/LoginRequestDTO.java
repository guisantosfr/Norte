package com.norte.norte_api.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * DTO de entrada para o endpoint de login.
 * Carrega apenas as credenciais necessárias para autenticação.
 */
public record LoginRequestDTO(

                @NotBlank(message = "O e-mail é obrigatório") @Email(message = "O e-mail informado não é válido") @Size(max = 100, message = "O e-mail deve ter no máximo 100 caracteres") String email,

                @NotBlank(message = "A senha é obrigatória") @Size(min = 8, max = 72, message = "A senha deve ter entre 8 e 72 caracteres") String password

) {
}
