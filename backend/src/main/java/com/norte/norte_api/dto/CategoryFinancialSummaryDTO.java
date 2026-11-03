package com.norte.norte_api.dto;

import java.math.BigDecimal;
import java.util.UUID;

public record CategoryFinancialSummaryDTO(
        UUID categoryId,
        String categoryName,
        BigDecimal realizedIncome,
        BigDecimal realizedExpense,
        BigDecimal pendingIncome,
        BigDecimal pendingExpense,
        BigDecimal netRealizedResult,
        BigDecimal netProjectedResult,
        long transactionCount
) {
}
