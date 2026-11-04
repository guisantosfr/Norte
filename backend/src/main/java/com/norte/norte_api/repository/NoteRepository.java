package com.norte.norte_api.repository;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import com.norte.norte_api.models.NoteModel;

public interface NoteRepository extends JpaRepository<NoteModel, UUID>, JpaSpecificationExecutor<NoteModel> {

    Optional<NoteModel> findByIdAndUserId(UUID id, UUID userId);
}
