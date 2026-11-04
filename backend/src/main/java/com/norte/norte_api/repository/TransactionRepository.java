package com.norte.norte_api.repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.norte.norte_api.models.NotificationType;
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

    @Query("""
            SELECT t FROM TransactionModel t
            WHERE t.status = com.norte.norte_api.models.TransactionStatus.PENDING
              AND t.date = :targetDate
              AND NOT EXISTS (
                  SELECT 1 FROM NotificationModel n
                  WHERE n.transaction = t
                    AND n.type = :notificationType
              )
            """)
    List<TransactionModel> findPendingWithoutNotification(
            @Param("targetDate") LocalDate targetDate,
            @Param("notificationType") NotificationType notificationType
    );
}
