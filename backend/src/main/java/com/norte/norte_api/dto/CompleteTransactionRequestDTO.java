package com.norte.norte_api.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.Positive;

public record CompleteTransactionRequestDTO(
        @Positive(message = "O valor realizado deve ser maior que zero")
        @Digits(integer = 17, fraction = 2, message = "O valor realizado deve ter no máximo 17 dígitos inteiros e 2 casas decimais")
        BigDecimal realizedAmount,

        LocalDateTime realizedAt
) {
}
