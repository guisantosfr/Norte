package com.norte.norte_api.repository;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import com.norte.norte_api.models.TransactionModel;

public interface TransactionRepository extends JpaRepository<TransactionModel, UUID>, JpaSpecificationExecutor<TransactionModel> {

    Optional<TransactionModel> findByIdAndUserId(UUID id, UUID userId);
}
