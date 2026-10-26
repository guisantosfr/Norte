package com.norte.norte_api.validation;

import com.norte.norte_api.dto.UserRequestDTO;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

public class PasswordMatchesValidator implements ConstraintValidator<PasswordMatches, UserRequestDTO> {

    @Override
    public boolean isValid(UserRequestDTO dto, ConstraintValidatorContext context) {
        if (dto.password() == null || dto.confirmPassword() == null) {
            // @NotBlank nos campos individuais já cobre o caso de nulo/vazio
            return true;
        }
        return dto.password().equals(dto.confirmPassword());
    }
}
