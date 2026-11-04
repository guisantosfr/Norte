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

    @EntityGraph(attributePaths = {"category", "recurringTransaction"})
    Optional<TransactionModel> findByIdAndUserId(UUID id, UUID userId);

    @Override
    @EntityGraph(attributePaths = {"category", "recurringTransaction"})
    List<TransactionModel> findAll(Specification<TransactionModel> spec, Sort sort);

    @EntityGraph(attributePaths = {"category", "recurringTransaction"})
    List<TransactionModel> findAllByRecurringTransaction_IdAndUserIdOrderByOccurrenceNumberAsc(UUID recurringId, UUID userId);

    boolean existsByRecurringTransaction_IdAndUserId(UUID recurringId, UUID userId);

    boolean existsByCategory_IdAndUserId(UUID categoryId, UUID userId);
}
