package com.norte.norte_api.controller;

import java.util.List;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.norte.norte_api.dto.NoteRequestDTO;
import com.norte.norte_api.dto.NoteResponseDTO;
import com.norte.norte_api.security.UserPrincipal;
import com.norte.norte_api.service.NoteService;

import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/notes")
@SecurityRequirement(name = "bearerAuth")
public class NoteController {

    private final NoteService noteService;

    public NoteController(NoteService noteService) {
        this.noteService = noteService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public NoteResponseDTO create(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody NoteRequestDTO requestDTO
    ) {
        return noteService.create(principal.getId(), requestDTO);
    }

    @GetMapping
    public List<NoteResponseDTO> findAll(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam(required = false) String search
    ) {
        return noteService.findAll(principal.getId(), search);
    }

    @GetMapping("/{id}")
    public NoteResponseDTO findById(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID id
    ) {
        return noteService.findById(principal.getId(), id);
    }

    @PutMapping("/{id}")
    public NoteResponseDTO update(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID id,
            @Valid @RequestBody NoteRequestDTO requestDTO
    ) {
        return noteService.update(principal.getId(), id, requestDTO);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID id
    ) {
        noteService.delete(principal.getId(), id);
    }
}
