package com.norte.norte_api.validation;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;

/**
 * Valida que a string codificada em UTF-8 não excede o limite de bytes especificado.
 *
 * <p>Útil para senhas processadas pelo BCrypt, cujo limite real é de 72 bytes em UTF-8
 * (e não 72 caracteres Unicode).
 */
@Documented
@Constraint(validatedBy = MaxUtf8BytesValidator.class)
@Target({ ElementType.FIELD, ElementType.PARAMETER, ElementType.RECORD_COMPONENT })
@Retention(RetentionPolicy.RUNTIME)
public @interface MaxUtf8Bytes {

    int max() default 72;

    String message() default "O campo deve ter no máximo {max} bytes em UTF-8";

    Class<?>[] groups() default {};

    Class<? extends Payload>[] payload() default {};
}
