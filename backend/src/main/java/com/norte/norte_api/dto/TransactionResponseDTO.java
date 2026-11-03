package com.norte.norte_api.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

import com.norte.norte_api.models.TransactionModel;
import com.norte.norte_api.models.TransactionStatus;
import com.norte.norte_api.models.TransactionType;

public record TransactionResponseDTO(
        UUID id,
        UUID userId,
        UUID categoryId,
        String categoryName,
        UUID recurringTransactionId,
        TransactionType type,
        String description,
        BigDecimal amount,
        LocalDate date,
        TransactionStatus status,
        LocalDateTime realizedAt,
        BigDecimal realizedAmount,
        Integer occurrenceNumber,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
    public static TransactionResponseDTO from(TransactionModel transaction) {
        return new TransactionResponseDTO(
                transaction.getId(),
                transaction.getUserId(),
                transaction.getCategoryId(),
                transaction.getCategoryName(),
                transaction.getRecurringTransactionId(),
                transaction.getType(),
                transaction.getDescription(),
                transaction.getAmount(),
                transaction.getDate(),
                transaction.getStatus(),
                transaction.getRealizedAt(),
                transaction.getRealizedAmount(),
                transaction.getOccurrenceNumber(),
                transaction.getCreatedAt(),
                transaction.getUpdatedAt()
        );
    }
}
