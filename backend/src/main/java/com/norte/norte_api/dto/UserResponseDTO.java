package com.norte.norte_api.dto;

import java.time.LocalDateTime;
import java.util.UUID;

import com.norte.norte_api.models.UserModel;

public record UserResponseDTO(
        UUID id,
        String name,
        String username,
        String email,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
    public static UserResponseDTO from(UserModel user) {
        return new UserResponseDTO(
                user.getId(),
                user.getName(),
                user.getUsername(),
                user.getEmail(),
                user.getCreatedAt(),
                user.getUpdatedAt()
        );
    }
}