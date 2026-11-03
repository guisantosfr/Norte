package com.norte.norte_api.dto;

import java.time.Instant;
import java.util.UUID;

import com.norte.norte_api.models.UserModel;

public record UserResponseDTO(
        UUID id,
        String name,
        String email,
        Instant createdAt,
        Instant updatedAt) {
    public static UserResponseDTO from(UserModel user) {
        return new UserResponseDTO(
                user.getId(),
                user.getName(),
                user.getEmail(),
                user.getCreatedAt(),
                user.getUpdatedAt());
    }
}