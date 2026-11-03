package com.norte.norte_api.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.norte.norte_api.models.CategoryModel;

public interface CategoryRepository extends JpaRepository<CategoryModel, UUID> {

    Optional<CategoryModel> findByIdAndUserId(UUID id, UUID userId);

    List<CategoryModel> findAllByUserIdOrderByNameAsc(UUID userId);

    List<CategoryModel> findAllByUserIdAndActiveOrderByNameAsc(UUID userId, boolean active);

    boolean existsByUserIdAndNameIgnoreCase(UUID userId, String name);

    boolean existsByUserIdAndNameIgnoreCaseAndIdNot(UUID userId, String name, UUID id);
}
