package com.norte.norte_api.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

import com.norte.norte_api.models.RecurrenceFrequency;
import com.norte.norte_api.models.RecurringTransactionModel;
import com.norte.norte_api.models.TransactionType;

public record RecurringTransactionResponseDTO(
        UUID id,
        UUID userId,
        UUID categoryId,
        String categoryName,
        TransactionType type,
        String description,
        BigDecimal amount,
        RecurrenceFrequency frequency,
        LocalDate startDate,
        Short dayOfMonth,
        Integer occurrences,
        boolean active,
        LocalDate generatedUntil,
        Instant createdAt,
        Instant updatedAt
) {
    public static RecurringTransactionResponseDTO from(RecurringTransactionModel model) {
        return new RecurringTransactionResponseDTO(
                model.getId(),
                model.getUserId(),
                model.getCategoryId(),
                model.getCategoryName(),
                model.getType(),
                model.getDescription(),
                model.getAmount(),
                model.getFrequency(),
                model.getStartDate(),
                model.getDayOfMonth(),
                model.getOccurrences(),
                model.isActive(),
                model.getGeneratedUntil(),
                model.getCreatedAt(),
                model.getUpdatedAt()
        );
    }
}
