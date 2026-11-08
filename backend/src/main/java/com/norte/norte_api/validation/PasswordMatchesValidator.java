package com.norte.norte_api.validation;

import com.norte.norte_api.dto.UserRequestDTO;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

/**
 * Valida que {@code password} e {@code confirmPassword} são iguais.
 *
 * <p>Embora a constraint seja declarada no nível da classe, a violação é associada
 * ao campo {@code confirmPassword}. Assim ela chega ao cliente como um erro de
 * campo comum ({@code fieldErrors[].field = "confirmPassword"}), o que simplifica
 * a exibição da mensagem no formulário do frontend.
 */
public class PasswordMatchesValidator implements ConstraintValidator<PasswordMatches, UserRequestDTO> {

    private static final String CONFIRM_PASSWORD_FIELD = "confirmPassword";

    @Override
    public boolean isValid(UserRequestDTO dto, ConstraintValidatorContext context) {
        if (dto == null || dto.password() == null || dto.confirmPassword() == null) {
            // @NotBlank nos campos individuais já cobre o caso de nulo/vazio
            return true;
        }

        if (dto.password().equals(dto.confirmPassword())) {
            return true;
        }

        context.disableDefaultConstraintViolation();
        context.buildConstraintViolationWithTemplate(context.getDefaultConstraintMessageTemplate())
                .addPropertyNode(CONFIRM_PASSWORD_FIELD)
                .addConstraintViolation();
        return false;
    }
}
