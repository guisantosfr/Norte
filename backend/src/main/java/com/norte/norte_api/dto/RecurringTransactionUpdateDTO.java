package com.norte.norte_api.dto;

import java.math.BigDecimal;
import java.util.UUID;

import com.norte.norte_api.models.TransactionType;

import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

public record RecurringTransactionUpdateDTO(
        @NotNull(message = "O tipo da recorrência é obrigatório")
        TransactionType type,

        @NotBlank(message = "A descrição é obrigatória")
        @Size(max = 255, message = "A descrição deve ter no máximo 255 caracteres")
        String description,

        @NotNull(message = "O valor previsto é obrigatório")
        @Positive(message = "O valor previsto deve ser maior que zero")
        @Digits(integer = 17, fraction = 2, message = "O valor previsto deve ter no máximo 17 dígitos inteiros e 2 casas decimais")
        BigDecimal amount,

        @NotNull(message = "O dia do mês é obrigatório")
        @Min(value = 1, message = "O dia do mês deve ser entre 1 e 31")
        @Max(value = 31, message = "O dia do mês deve ser entre 1 e 31")
        Short dayOfMonth,

        @Positive(message = "A quantidade de ocorrências deve ser maior que zero")
        Integer occurrences,

        UUID categoryId,

        @Size(max = 100, message = "O nome da categoria deve ter no máximo 100 caracteres")
        String categoryName
) {
}
