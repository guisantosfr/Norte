package com.norte.norte_api.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import com.norte.norte_api.models.TransactionModel;

public interface TransactionRepository extends JpaRepository<TransactionModel, UUID>, JpaSpecificationExecutor<TransactionModel> {

    @EntityGraph(attributePaths = "category")
    Optional<TransactionModel> findByIdAndUserId(UUID id, UUID userId);

    @Override
    @EntityGraph(attributePaths = "category")
    List<TransactionModel> findAll(Specification<TransactionModel> spec, Sort sort);

    boolean existsByCategory_IdAndUserId(UUID categoryId, UUID userId);
}
