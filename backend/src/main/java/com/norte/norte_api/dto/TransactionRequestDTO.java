package com.norte.norte_api.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.Instant;
import java.util.UUID;

import com.norte.norte_api.models.TransactionStatus;
import com.norte.norte_api.models.TransactionType;

import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

public record TransactionRequestDTO(
                @NotNull(message = "O tipo da transação é obrigatório") TransactionType type,

                @NotBlank(message = "A descrição é obrigatória") @Size(max = 255, message = "A descrição deve ter no máximo 255 caracteres") String description,

                @NotNull(message = "O valor previsto é obrigatório") @Positive(message = "O valor previsto deve ser maior que zero") @Digits(integer = 17, fraction = 2, message = "O valor previsto deve ter no máximo 17 dígitos inteiros e 2 casas decimais") BigDecimal amount,

                @NotNull(message = "A data prevista é obrigatória") LocalDate date,

                @NotNull(message = "O status da transação é obrigatório") TransactionStatus status,

                @Positive(message = "O valor realizado deve ser maior que zero") @Digits(integer = 17, fraction = 2, message = "O valor realizado deve ter no máximo 17 dígitos inteiros e 2 casas decimais") BigDecimal realizedAmount,

                Instant realizedAt,

                UUID categoryId,

                @Size(max = 100, message = "O nome da categoria deve ter no máximo 100 caracteres") String categoryName) {
}
