package com.norte.norte_api.controller;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.norte.norte_api.dto.CategoryFinancialSummaryDTO;
import com.norte.norte_api.dto.CategoryTransactionsReportDTO;
import com.norte.norte_api.dto.FinancialSummaryDTO;
import com.norte.norte_api.models.TransactionStatus;
import com.norte.norte_api.models.TransactionType;
import com.norte.norte_api.security.UserPrincipal;
import com.norte.norte_api.service.FinancialService;

import io.swagger.v3.oas.annotations.security.SecurityRequirement;

@RestController
@RequestMapping("/financial")
@SecurityRequirement(name = "bearerAuth")
public class FinancialController {

    private final FinancialService financialService;

    public FinancialController(FinancialService financialService) {
        this.financialService = financialService;
    }

    @GetMapping("/summary")
    public FinancialSummaryDTO getSummary(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate
    ) {
        return financialService.getSummary(principal.getId(), startDate, endDate);
    }

    @GetMapping("/by-category")
    public List<CategoryFinancialSummaryDTO> getSummaryByCategory(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(required = false) TransactionType type,
            @RequestParam(required = false) TransactionStatus status
    ) {
        return financialService.getSummaryByCategory(principal.getId(), startDate, endDate, type, status);
    }

    @GetMapping("/by-category/{categoryId}")
    public CategoryTransactionsReportDTO getCategoryTransactionsReport(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID categoryId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(required = false) TransactionType type,
            @RequestParam(required = false) TransactionStatus status
    ) {
        return financialService.getCategoryTransactionsReport(
                principal.getId(),
                categoryId,
                startDate,
                endDate,
                type,
                status
        );
    }
}
