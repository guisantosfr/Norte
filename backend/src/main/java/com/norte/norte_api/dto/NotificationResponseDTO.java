package com.norte.norte_api.dto;

import java.time.Instant;
import java.util.UUID;

import com.norte.norte_api.models.NotificationModel;
import com.norte.norte_api.models.NotificationStatus;
import com.norte.norte_api.models.NotificationType;

public record NotificationResponseDTO(
        UUID id,
        UUID transactionId,
        String title,
        String message,
        NotificationType type,
        NotificationStatus status,
        Instant readAt,
        Instant createdAt
) {
    public static NotificationResponseDTO from(NotificationModel notification) {
        return new NotificationResponseDTO(
                notification.getId(),
                notification.getTransactionId(),
                notification.getTitle(),
                notification.getMessage(),
                notification.getType(),
                notification.getStatus(),
                notification.getReadAt(),
                notification.getCreatedAt()
        );
    }
}
