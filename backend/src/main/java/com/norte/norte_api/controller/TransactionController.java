package com.norte.norte_api.controller;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.norte.norte_api.dto.CompleteTransactionRequestDTO;
import com.norte.norte_api.dto.TransactionRequestDTO;
import com.norte.norte_api.dto.TransactionResponseDTO;
import com.norte.norte_api.dto.TypedTransactionRequestDTO;
import com.norte.norte_api.models.TransactionStatus;
import com.norte.norte_api.models.TransactionType;
import com.norte.norte_api.security.UserPrincipal;
import com.norte.norte_api.service.TransactionService;

import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/transactions")
@SecurityRequirement(name = "bearerAuth")
public class TransactionController {

    private final TransactionService transactionService;

    public TransactionController(TransactionService transactionService) {
        this.transactionService = transactionService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public TransactionResponseDTO create(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody TransactionRequestDTO requestDTO
    ) {
        return transactionService.create(principal.getId(), requestDTO);
    }

    @PostMapping("/income")
    @ResponseStatus(HttpStatus.CREATED)
    public TransactionResponseDTO createIncome(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody TypedTransactionRequestDTO requestDTO
    ) {
        return transactionService.createIncome(principal.getId(), requestDTO);
    }

    @PostMapping("/expense")
    @ResponseStatus(HttpStatus.CREATED)
    public TransactionResponseDTO createExpense(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody TypedTransactionRequestDTO requestDTO
    ) {
        return transactionService.createExpense(principal.getId(), requestDTO);
    }

    @GetMapping
    public List<TransactionResponseDTO> findAll(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam(required = false) TransactionType type,
            @RequestParam(required = false) TransactionStatus status,
            @RequestParam(required = false) UUID categoryId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate
    ) {
        return transactionService.findAll(principal.getId(), type, status, categoryId, startDate, endDate);
    }

    @GetMapping("/{id}")
    public TransactionResponseDTO findById(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID id
    ) {
        return transactionService.findById(principal.getId(), id);
    }

    @PutMapping("/{id}")
    public TransactionResponseDTO update(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID id,
            @Valid @RequestBody TransactionRequestDTO requestDTO
    ) {
        return transactionService.update(principal.getId(), id, requestDTO);
    }

    @PatchMapping("/{id}/complete")
    public TransactionResponseDTO complete(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID id,
            @Valid @RequestBody(required = false) CompleteTransactionRequestDTO requestDTO
    ) {
        return transactionService.complete(principal.getId(), id, requestDTO);
    }

    @PatchMapping("/{id}/cancel")
    public TransactionResponseDTO cancel(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID id
    ) {
        return transactionService.cancel(principal.getId(), id);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID id
    ) {
        transactionService.delete(principal.getId(), id);
    }
}
