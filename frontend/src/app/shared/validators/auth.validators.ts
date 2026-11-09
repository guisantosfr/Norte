import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/**
 * Espelha a validação de backend `@MaxUtf8Bytes(max = 72)` exigida pelo BCrypt.
 */
export function maxUtf8BytesValidator(maxBytes = 72): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value as string | null | undefined;
    if (!value) {
      return null;
    }

    const byteLength = new TextEncoder().encode(value).length;
    if (byteLength > maxBytes) {
      return {
        maxUtf8Bytes: {
          max: maxBytes,
          actual: byteLength,
        },
      };
    }

    return null;
  };
}

/**
 * Espelha a validação de classe `@PasswordMatches` do UserRequestDTO no backend.
 */
export function passwordMatchValidator(
  passwordControlName = 'password',
  confirmControlName = 'confirmPassword'
): ValidatorFn {
  return (group: AbstractControl): ValidationErrors | null => {
    const passwordControl = group.get(passwordControlName);
    const confirmControl = group.get(confirmControlName);

    if (!passwordControl || !confirmControl) {
      return null;
    }

    const password = passwordControl.value as string | null | undefined;
    const confirmPassword = confirmControl.value as string | null | undefined;

    if (!confirmPassword) {
      return null;
    }

    if (password !== confirmPassword) {
      return { passwordMismatch: true };
    }

    return null;
  };
}
