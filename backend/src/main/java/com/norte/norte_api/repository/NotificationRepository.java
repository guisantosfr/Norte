package com.norte.norte_api.repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.norte.norte_api.models.NotificationModel;

public interface NotificationRepository extends JpaRepository<NotificationModel, UUID>, JpaSpecificationExecutor<NotificationModel> {

    @EntityGraph(attributePaths = "transaction")
    Optional<NotificationModel> findByIdAndUserId(UUID id, UUID userId);

    @Override
    @EntityGraph(attributePaths = "transaction")
    List<NotificationModel> findAll(Specification<NotificationModel> spec, Sort sort);

    long countByUserIdAndReadAtIsNull(UUID userId);

    @Modifying(clearAutomatically = true)
    @Query("UPDATE NotificationModel n SET n.readAt = :readAt WHERE n.userId = :userId AND n.readAt IS NULL")
    int markAllAsRead(@Param("userId") UUID userId, @Param("readAt") Instant readAt);
}
