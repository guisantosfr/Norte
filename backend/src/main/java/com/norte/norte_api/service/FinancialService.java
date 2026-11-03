package com.norte.norte_api.service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.norte.norte_api.dto.CategoryFinancialSummaryDTO;
import com.norte.norte_api.dto.CategoryTransactionsReportDTO;
import com.norte.norte_api.dto.FinancialSummaryDTO;
import com.norte.norte_api.dto.TransactionResponseDTO;
import com.norte.norte_api.exception.BusinessRuleException;
import com.norte.norte_api.models.CategoryModel;
import com.norte.norte_api.models.TransactionModel;
import com.norte.norte_api.models.TransactionStatus;
import com.norte.norte_api.models.TransactionType;
import com.norte.norte_api.repository.TransactionRepository;

import jakarta.persistence.criteria.Predicate;

@Service
public class FinancialService {

    private static final String UNCATEGORIZED_LABEL = "Sem categoria";

    private final TransactionRepository transactionRepository;
    private final CategoryService categoryService;

    public FinancialService(
            TransactionRepository transactionRepository,
            CategoryService categoryService
    ) {
        this.transactionRepository = transactionRepository;
        this.categoryService = categoryService;
    }

    @Transactional(readOnly = true)
    public FinancialSummaryDTO getSummary(UUID userId, LocalDate startDate, LocalDate endDate) {
        validateDateRange(startDate, endDate);

        Sort sort = Sort.by(Sort.Order.desc("date"), Sort.Order.desc("createdAt"));

        // Transações acumuladas (globais ou até endDate, quando informado) para saldo atual e projetado
        List<TransactionModel> cumulativeTransactions = transactionRepository.findAll(
                buildSpec(userId, null, endDate, null, null, null, true),
                sort
        );

        BigDecimal currentBalance = calculateCurrentBalance(cumulativeTransactions);
        BigDecimal projectedBalance = calculateProjectedBalance(cumulativeTransactions);

        // Transações do período [startDate, endDate]
        List<TransactionModel> periodTransactions = (startDate == null)
                ? cumulativeTransactions
                : transactionRepository.findAll(
                        buildSpec(userId, startDate, endDate, null, null, null, true),
                        sort
                );

        Accumulator periodAcc = accumulate(periodTransactions);

        return new FinancialSummaryDTO(
                startDate,
                endDate,
                periodAcc.realizedIncome,
                periodAcc.realizedExpense,
                periodAcc.pendingIncome,
                periodAcc.pendingExpense,
                periodAcc.netRealizedResult(),
                periodAcc.netProjectedResult(),
                currentBalance,
                projectedBalance
        );
    }

    @Transactional(readOnly = true)
    public List<CategoryFinancialSummaryDTO> getSummaryByCategory(
            UUID userId,
            LocalDate startDate,
            LocalDate endDate,
            TransactionType type,
            TransactionStatus status
    ) {
        validateDateRange(startDate, endDate);

        Sort sort = Sort.by(Sort.Order.desc("date"), Sort.Order.desc("createdAt"));
        List<TransactionModel> transactions = transactionRepository.findAll(
                buildSpec(userId, startDate, endDate, null, type, status, status == null),
                sort
        );

        Map<UUID, List<TransactionModel>> grouped = new LinkedHashMap<>();
        List<TransactionModel> uncategorized = new ArrayList<>();

        for (TransactionModel tx : transactions) {
            if (tx.getCategoryId() == null) {
                uncategorized.add(tx);
            } else {
                grouped.computeIfAbsent(tx.getCategoryId(), k -> new ArrayList<>()).add(tx);
            }
        }

        List<CategoryFinancialSummaryDTO> result = new ArrayList<>();

        for (Map.Entry<UUID, List<TransactionModel>> entry : grouped.entrySet()) {
            List<TransactionModel> groupTxs = entry.getValue();
            String categoryName = groupTxs.getFirst().getCategoryName();
            result.add(buildCategorySummary(entry.getKey(), categoryName, groupTxs));
        }

        result.sort(Comparator.comparing(
                CategoryFinancialSummaryDTO::categoryName,
                String.CASE_INSENSITIVE_ORDER
        ));

        if (!uncategorized.isEmpty()) {
            result.add(buildCategorySummary(null, UNCATEGORIZED_LABEL, uncategorized));
        }

        return result;
    }

    @Transactional(readOnly = true)
    public CategoryTransactionsReportDTO getCategoryTransactionsReport(
            UUID userId,
            UUID categoryId,
            LocalDate startDate,
            LocalDate endDate,
            TransactionType type,
            TransactionStatus status
    ) {
        validateDateRange(startDate, endDate);

        CategoryModel category = categoryService.findOwnedCategory(userId, categoryId);

        Sort sort = Sort.by(Sort.Order.desc("date"), Sort.Order.desc("createdAt"));
        List<TransactionModel> transactions = transactionRepository.findAll(
                buildSpec(userId, startDate, endDate, categoryId, type, status, status == null),
                sort
        );

        CategoryFinancialSummaryDTO summary = buildCategorySummary(
                category.getId(),
                category.getName(),
                transactions
        );

        List<TransactionResponseDTO> transactionDTOs = transactions.stream()
                .map(TransactionResponseDTO::from)
                .toList();

        return new CategoryTransactionsReportDTO(summary, transactionDTOs);
    }

    private static Specification<TransactionModel> buildSpec(
            UUID userId,
            LocalDate startDate,
            LocalDate endDate,
            UUID categoryId,
            TransactionType type,
            TransactionStatus status,
            boolean excludeCanceled
    ) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.equal(root.get("userId"), userId));

            if (excludeCanceled) {
                predicates.add(cb.notEqual(root.get("status"), TransactionStatus.CANCELED));
            }
            if (status != null) {
                predicates.add(cb.equal(root.get("status"), status));
            }
            if (type != null) {
                predicates.add(cb.equal(root.get("type"), type));
            }
            if (categoryId != null) {
                predicates.add(cb.equal(root.get("category").get("id"), categoryId));
            }
            if (startDate != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("date"), startDate));
            }
            if (endDate != null) {
                predicates.add(cb.lessThanOrEqualTo(root.get("date"), endDate));
            }

            return cb.and(predicates.toArray(Predicate[]::new));
        };
    }

    private static BigDecimal calculateCurrentBalance(List<TransactionModel> transactions) {
        Accumulator acc = accumulate(transactions);
        return acc.netRealizedResult();
    }

    private static BigDecimal calculateProjectedBalance(List<TransactionModel> transactions) {
        Accumulator acc = accumulate(transactions);
        return acc.netProjectedResult();
    }

    private static CategoryFinancialSummaryDTO buildCategorySummary(
            UUID categoryId,
            String categoryName,
            List<TransactionModel> transactions
    ) {
        Accumulator acc = accumulate(transactions);
        return new CategoryFinancialSummaryDTO(
                categoryId,
                categoryName,
                acc.realizedIncome,
                acc.realizedExpense,
                acc.pendingIncome,
                acc.pendingExpense,
                acc.netRealizedResult(),
                acc.netProjectedResult(),
                acc.count
        );
    }

    private static Accumulator accumulate(List<TransactionModel> transactions) {
        Accumulator acc = new Accumulator();
        for (TransactionModel tx : transactions) {
            if (tx.getStatus() == TransactionStatus.CANCELED) {
                continue;
            }
            acc.count++;

            if (tx.getStatus() == TransactionStatus.COMPLETED) {
                BigDecimal value = tx.getRealizedAmount() != null ? tx.getRealizedAmount() : tx.getAmount();
                if (tx.getType() == TransactionType.INCOME) {
                    acc.realizedIncome = acc.realizedIncome.add(value);
                } else if (tx.getType() == TransactionType.EXPENSE) {
                    acc.realizedExpense = acc.realizedExpense.add(value);
                }
            } else if (tx.getStatus() == TransactionStatus.PENDING) {
                BigDecimal value = tx.getAmount();
                if (tx.getType() == TransactionType.INCOME) {
                    acc.pendingIncome = acc.pendingIncome.add(value);
                } else if (tx.getType() == TransactionType.EXPENSE) {
                    acc.pendingExpense = acc.pendingExpense.add(value);
                }
            }
        }
        return acc;
    }

    private static void validateDateRange(LocalDate startDate, LocalDate endDate) {
        if (startDate != null && endDate != null && startDate.isAfter(endDate)) {
            throw new BusinessRuleException("A data inicial não pode ser posterior à data final.");
        }
    }

    private static final class Accumulator {
        private BigDecimal realizedIncome = BigDecimal.ZERO;
        private BigDecimal realizedExpense = BigDecimal.ZERO;
        private BigDecimal pendingIncome = BigDecimal.ZERO;
        private BigDecimal pendingExpense = BigDecimal.ZERO;
        private long count = 0;

        private BigDecimal netRealizedResult() {
            return realizedIncome.subtract(realizedExpense);
        }

        private BigDecimal netProjectedResult() {
            BigDecimal totalIncome = realizedIncome.add(pendingIncome);
            BigDecimal totalExpense = realizedExpense.add(pendingExpense);
            return totalIncome.subtract(totalExpense);
        }
    }
}
