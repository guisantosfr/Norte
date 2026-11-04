package com.norte.norte_api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record NoteRequestDTO(
        @Size(max = 150, message = "O título deve ter no máximo 150 caracteres")
        String title,

        @NotBlank(message = "O conteúdo da anotação é obrigatório")
        @Size(max = 5000, message = "O conteúdo da anotação deve ter no máximo 5000 caracteres")
        String content
) {
}
