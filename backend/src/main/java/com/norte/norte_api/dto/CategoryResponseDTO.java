package com.norte.norte_api.dto;

import java.time.Instant;
import java.util.UUID;

import com.norte.norte_api.models.CategoryModel;

public record CategoryResponseDTO(
        UUID id,
        UUID userId,
        String name,
        boolean active,
        Instant createdAt,
        Instant updatedAt) {
    public static CategoryResponseDTO from(CategoryModel category) {
        return new CategoryResponseDTO(
                category.getId(),
                category.getUserId(),
                category.getName(),
                category.isActive(),
                category.getCreatedAt(),
                category.getUpdatedAt());
    }
}
