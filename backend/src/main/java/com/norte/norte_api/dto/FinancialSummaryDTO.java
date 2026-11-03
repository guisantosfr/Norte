package com.norte.norte_api.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

public record FinancialSummaryDTO(
        LocalDate startDate,
        LocalDate endDate,
        BigDecimal realizedIncome,
        BigDecimal realizedExpense,
        BigDecimal pendingIncome,
        BigDecimal pendingExpense,
        BigDecimal periodRealizedResult,
        BigDecimal periodProjectedResult,
        BigDecimal currentBalance,
        BigDecimal projectedBalance
) {
}
