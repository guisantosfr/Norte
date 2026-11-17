package com.norte.norte_api.service;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.norte.norte_api.dto.CompleteTransactionRequestDTO;
import com.norte.norte_api.dto.TransactionRequestDTO;
import com.norte.norte_api.dto.TransactionResponseDTO;
import com.norte.norte_api.dto.TypedTransactionRequestDTO;
import com.norte.norte_api.exception.BusinessRuleException;
import com.norte.norte_api.exception.ResourceNotFoundException;
import com.norte.norte_api.models.CategoryModel;
import com.norte.norte_api.models.TransactionModel;
import com.norte.norte_api.models.TransactionStatus;
import com.norte.norte_api.models.TransactionType;
import com.norte.norte_api.repository.TransactionRepository;

import jakarta.persistence.criteria.Predicate;

@Service
public class TransactionService {

    private static final String TRANSACTION_NOT_FOUND_MSG = "Transação não encontrada.";

    private final TransactionRepository transactionRepository;
    private final CategoryService categoryService;

    public TransactionService(
            TransactionRepository transactionRepository,
            CategoryService categoryService) {
        this.transactionRepository = transactionRepository;
        this.categoryService = categoryService;
    }

    @Transactional
    public TransactionResponseDTO create(UUID userId, TransactionRequestDTO dto) {
        return createInternal(
                userId,
                dto.type(),
                dto.description(),
                dto.amount(),
                dto.date(),
                dto.status(),
                dto.realizedAmount(),
                dto.realizedAt(),
                dto.categoryId(),
                dto.categoryName());
    }

    @Transactional
    public TransactionResponseDTO createIncome(UUID userId, TypedTransactionRequestDTO dto) {
        TransactionStatus status = dto.status() != null ? dto.status() : TransactionStatus.PENDING;
        return createInternal(
                userId,
                TransactionType.INCOME,
                dto.description(),
                dto.amount(),
                dto.date(),
                status,
                dto.realizedAmount(),
                dto.realizedAt(),
                dto.categoryId(),
                dto.categoryName());
    }

    @Transactional
    public TransactionResponseDTO createExpense(UUID userId, TypedTransactionRequestDTO dto) {
        TransactionStatus status = dto.status() != null ? dto.status() : TransactionStatus.COMPLETED;
        return createInternal(
                userId,
                TransactionType.EXPENSE,
                dto.description(),
                dto.amount(),
                dto.date(),
                status,
                dto.realizedAmount(),
                dto.realizedAt(),
                dto.categoryId(),
                dto.categoryName());
    }

    @Transactional(readOnly = true)
    public List<TransactionResponseDTO> findAll(
            UUID userId,
            TransactionType type,
            TransactionStatus status,
            UUID categoryId,
            UUID recurringTransactionId,
            LocalDate startDate,
            LocalDate endDate) {
        if (startDate != null && endDate != null && startDate.isAfter(endDate)) {
            throw new BusinessRuleException("A data inicial não pode ser posterior à data final.");
        }

        Specification<TransactionModel> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.equal(root.get("userId"), userId));

            if (type != null) {
                predicates.add(cb.equal(root.get("type"), type));
            }
            if (status != null) {
                predicates.add(cb.equal(root.get("status"), status));
            }
            if (categoryId != null) {
                predicates.add(cb.equal(root.get("category").get("id"), categoryId));
            }
            if (recurringTransactionId != null) {
                predicates.add(cb.equal(root.get("recurringTransaction").get("id"), recurringTransactionId));
            }
            if (startDate != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("date"), startDate));
            }
            if (endDate != null) {
                predicates.add(cb.lessThanOrEqualTo(root.get("date"), endDate));
            }

            return cb.and(predicates.toArray(Predicate[]::new));
        };

        Sort sort = Sort.by(Sort.Order.asc("date"), Sort.Order.asc("createdAt"));

        return transactionRepository.findAll(spec, sort)
                .stream()
                .map(TransactionResponseDTO::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public TransactionResponseDTO findById(UUID userId, UUID transactionId) {
        TransactionModel transaction = findOwnedTransaction(userId, transactionId);
        return TransactionResponseDTO.from(transaction);
    }

    @Transactional
    public TransactionResponseDTO update(UUID userId, UUID transactionId, TransactionRequestDTO dto) {
        TransactionModel transaction = findOwnedTransaction(userId, transactionId);

        CategoryModel category = categoryService.resolveCategoryForAssociation(
                userId,
                dto.categoryId(),
                dto.categoryName(),
                transaction.getCategoryId());

        transaction.setType(dto.type());
        transaction.setDescription(dto.description().trim());
        transaction.setAmount(dto.amount());
        transaction.setDate(dto.date());
        transaction.setCategory(category);

        applyStatusAndRealizedFields(
                transaction,
                dto.status(),
                dto.amount(),
                dto.realizedAmount(),
                dto.realizedAt());

        TransactionModel saved = transactionRepository.save(transaction);
        return TransactionResponseDTO.from(saved);
    }

    @Transactional
    public TransactionResponseDTO complete(UUID userId, UUID transactionId, CompleteTransactionRequestDTO dto) {
        TransactionModel transaction = findOwnedTransaction(userId, transactionId);

        BigDecimal realizedAmount = dto != null ? dto.realizedAmount() : null;
        Instant realizedAt = dto != null ? dto.realizedAt() : null;

        applyStatusAndRealizedFields(
                transaction,
                TransactionStatus.COMPLETED,
                transaction.getAmount(),
                realizedAmount,
                realizedAt);

        TransactionModel saved = transactionRepository.save(transaction);
        return TransactionResponseDTO.from(saved);
    }

    @Transactional
    public TransactionResponseDTO cancel(UUID userId, UUID transactionId) {
        TransactionModel transaction = findOwnedTransaction(userId, transactionId);

        transaction.setStatus(TransactionStatus.CANCELED);
        transaction.setRealizedAmount(null);
        transaction.setRealizedAt(null);

        TransactionModel saved = transactionRepository.save(transaction);
        return TransactionResponseDTO.from(saved);
    }

    @Transactional
    public void delete(UUID userId, UUID transactionId) {
        TransactionModel transaction = findOwnedTransaction(userId, transactionId);
        transactionRepository.delete(transaction);
    }

    private TransactionResponseDTO createInternal(
            UUID userId,
            TransactionType type,
            String description,
            BigDecimal amount,
            LocalDate date,
            TransactionStatus status,
            BigDecimal realizedAmount,
            Instant realizedAt,
            UUID categoryId,
            String categoryName) {
        CategoryModel category = categoryService.resolveCategoryForAssociation(
                userId,
                categoryId,
                categoryName,
                null);

        TransactionModel transaction = new TransactionModel();
        transaction.setUserId(userId);
        transaction.setType(type);
        transaction.setDescription(description.trim());
        transaction.setAmount(amount);
        transaction.setDate(date);
        transaction.setCategory(category);

        applyStatusAndRealizedFields(transaction, status, amount, realizedAmount, realizedAt);

        TransactionModel saved = transactionRepository.save(transaction);
        return TransactionResponseDTO.from(saved);
    }

    private TransactionModel findOwnedTransaction(UUID userId, UUID transactionId) {
        return transactionRepository.findByIdAndUserId(transactionId, userId)
                .orElseThrow(() -> new ResourceNotFoundException(TRANSACTION_NOT_FOUND_MSG));
    }

    private static void applyStatusAndRealizedFields(
            TransactionModel transaction,
            TransactionStatus status,
            BigDecimal amount,
            BigDecimal realizedAmount,
            Instant realizedAt) {
        transaction.setStatus(status);

        if (status == TransactionStatus.COMPLETED) {
            transaction.setRealizedAmount(realizedAmount != null ? realizedAmount : amount);
            transaction.setRealizedAt(realizedAt != null ? realizedAt : Instant.now());
        } else {
            transaction.setRealizedAmount(realizedAmount);
            transaction.setRealizedAt(realizedAt);
        }
    }
}
