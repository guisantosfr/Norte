package com.norte.norte_api.service;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.norte.norte_api.dto.NoteRequestDTO;
import com.norte.norte_api.dto.NoteResponseDTO;
import com.norte.norte_api.exception.ResourceNotFoundException;
import com.norte.norte_api.models.NoteModel;
import com.norte.norte_api.repository.NoteRepository;

import jakarta.persistence.criteria.Predicate;

@Service
public class NoteService {

    private static final String NOTE_NOT_FOUND_MSG = "Anotação não encontrada.";

    private final NoteRepository noteRepository;

    public NoteService(NoteRepository noteRepository) {
        this.noteRepository = noteRepository;
    }

    @Transactional
    public NoteResponseDTO create(UUID userId, NoteRequestDTO dto) {
        NoteModel note = new NoteModel();
        note.setUserId(userId);
        note.setTitle(normalizeTitle(dto.title()));
        note.setContent(dto.content().trim());

        NoteModel saved = noteRepository.save(note);
        return NoteResponseDTO.from(saved);
    }

    @Transactional(readOnly = true)
    public List<NoteResponseDTO> findAll(UUID userId, String search) {
        Specification<NoteModel> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.equal(root.get("userId"), userId));

            if (search != null && !search.isBlank()) {
                String pattern = "%" + search.trim().toLowerCase(Locale.ROOT) + "%";
                Predicate titleMatch = cb.like(cb.lower(root.get("title")), pattern);
                Predicate contentMatch = cb.like(cb.lower(root.get("content")), pattern);
                predicates.add(cb.or(titleMatch, contentMatch));
            }

            return cb.and(predicates.toArray(Predicate[]::new));
        };

        Sort sort = Sort.by(Sort.Order.desc("updatedAt"));

        return noteRepository.findAll(spec, sort)
                .stream()
                .map(NoteResponseDTO::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public NoteResponseDTO findById(UUID userId, UUID noteId) {
        NoteModel note = findOwnedNote(userId, noteId);
        return NoteResponseDTO.from(note);
    }

    @Transactional
    public NoteResponseDTO update(UUID userId, UUID noteId, NoteRequestDTO dto) {
        NoteModel note = findOwnedNote(userId, noteId);

        note.setTitle(normalizeTitle(dto.title()));
        note.setContent(dto.content().trim());

        NoteModel saved = noteRepository.save(note);
        return NoteResponseDTO.from(saved);
    }

    @Transactional
    public void delete(UUID userId, UUID noteId) {
        NoteModel note = findOwnedNote(userId, noteId);
        noteRepository.delete(note);
    }

    private NoteModel findOwnedNote(UUID userId, UUID noteId) {
        return noteRepository.findByIdAndUserId(noteId, userId)
                .orElseThrow(() -> new ResourceNotFoundException(NOTE_NOT_FOUND_MSG));
    }

    private static String normalizeTitle(String title) {
        if (title == null || title.isBlank()) {
            return null;
        }
        return title.trim();
    }
}
