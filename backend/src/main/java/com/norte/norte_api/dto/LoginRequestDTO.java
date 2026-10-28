package com.norte.norte_api.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

/**
 * DTO de entrada para o endpoint de login.
 * Carrega apenas as credenciais necessárias para autenticação.
 */
public record LoginRequestDTO(

        @NotBlank(message = "O e-mail é obrigatório")
        @Email(message = "O e-mail informado não é válido")
        String email,

        @NotBlank(message = "A senha é obrigatória")
        String password

) {}
