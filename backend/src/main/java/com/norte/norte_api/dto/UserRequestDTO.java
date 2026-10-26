package com.norte.norte_api.dto;

import com.norte.norte_api.validation.PasswordMatches;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

@PasswordMatches
public record UserRequestDTO(
        @NotBlank(message = "O nome é obrigatório") @Size(max = 100, message = "O nome deve ter no máximo 100 caracteres") String name,

        @NotBlank(message = "O nome de usuário é obrigatório") @Size(max = 50, message = "O nome de usuário deve ter no máximo 50 caracteres") String username,

        @NotBlank(message = "O e-mail é obrigatório") @Email(message = "O e-mail informado não é válido") @Size(max = 255, message = "O e-mail deve ter no máximo 255 caracteres") String email,

        @NotBlank(message = "A senha é obrigatória") @Size(min = 8, max = 72, message = "A senha deve ter entre 8 e 72 caracteres") String password,

        @NotBlank(message = "A confirmação de senha é obrigatória") String confirmPassword
) {
}
