package com.norte.norte_api.dto;

import java.time.Instant;
import java.util.UUID;

import com.norte.norte_api.models.NoteModel;

public record NoteResponseDTO(
        UUID id,
        UUID userId,
        String title,
        String content,
        Instant createdAt,
        Instant updatedAt
) {
    public static NoteResponseDTO from(NoteModel note) {
        return new NoteResponseDTO(
                note.getId(),
                note.getUserId(),
                note.getTitle(),
                note.getContent(),
                note.getCreatedAt(),
                note.getUpdatedAt()
        );
    }
}
