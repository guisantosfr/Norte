package com.norte.norte_api.dto;

import java.time.LocalDateTime;
import java.util.UUID;

import com.norte.norte_api.models.CategoryModel;

public record CategoryResponseDTO(
        UUID id,
        UUID userId,
        String name,
        boolean active,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
    public static CategoryResponseDTO from(CategoryModel category) {
        return new CategoryResponseDTO(
                category.getId(),
                category.getUserId(),
                category.getName(),
                category.isActive(),
                category.getCreatedAt(),
                category.getUpdatedAt()
        );
    }
}
