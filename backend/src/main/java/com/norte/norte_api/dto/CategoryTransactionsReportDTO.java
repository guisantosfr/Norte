package com.norte.norte_api.dto;

import java.util.List;

public record CategoryTransactionsReportDTO(
        CategoryFinancialSummaryDTO summary,
        List<TransactionResponseDTO> transactions
) {
}
