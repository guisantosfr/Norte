package com.norte.norte_api.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import com.norte.norte_api.models.RecurringTransactionModel;

public interface RecurringTransactionRepository extends JpaRepository<RecurringTransactionModel, UUID>, JpaSpecificationExecutor<RecurringTransactionModel> {

    @EntityGraph(attributePaths = "category")
    Optional<RecurringTransactionModel> findByIdAndUserId(UUID id, UUID userId);

    @Override
    @EntityGraph(attributePaths = "category")
    List<RecurringTransactionModel> findAll(Specification<RecurringTransactionModel> spec, Sort sort);

    boolean existsByCategory_IdAndUserId(UUID categoryId, UUID userId);
}
