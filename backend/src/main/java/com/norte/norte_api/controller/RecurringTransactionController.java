package com.norte.norte_api.controller;

import java.util.List;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.norte.norte_api.dto.RecurringTransactionRequestDTO;
import com.norte.norte_api.dto.RecurringTransactionResponseDTO;
import com.norte.norte_api.dto.RecurringTransactionUpdateDTO;
import com.norte.norte_api.dto.TransactionResponseDTO;
import com.norte.norte_api.models.RecurrenceScope;
import com.norte.norte_api.models.TransactionType;
import com.norte.norte_api.security.UserPrincipal;
import com.norte.norte_api.service.RecurringTransactionService;

import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/recurring-transactions")
@SecurityRequirement(name = "bearerAuth")
public class RecurringTransactionController {

    private final RecurringTransactionService recurringTransactionService;

    public RecurringTransactionController(RecurringTransactionService recurringTransactionService) {
        this.recurringTransactionService = recurringTransactionService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public RecurringTransactionResponseDTO create(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody RecurringTransactionRequestDTO requestDTO
    ) {
        return recurringTransactionService.create(principal.getId(), requestDTO);
    }

    @GetMapping
    public List<RecurringTransactionResponseDTO> findAll(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam(required = false) Boolean active,
            @RequestParam(required = false) TransactionType type,
            @RequestParam(required = false) UUID categoryId
    ) {
        return recurringTransactionService.findAll(principal.getId(), active, type, categoryId);
    }

    @GetMapping("/{id}")
    public RecurringTransactionResponseDTO findById(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID id
    ) {
        return recurringTransactionService.findById(principal.getId(), id);
    }

    @GetMapping("/{id}/transactions")
    public List<TransactionResponseDTO> findOccurrences(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID id
    ) {
        return recurringTransactionService.findOccurrences(principal.getId(), id);
    }

    @PutMapping("/{id}")
    public RecurringTransactionResponseDTO update(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID id,
            @RequestParam(defaultValue = "FUTURE") RecurrenceScope scope,
            @Valid @RequestBody RecurringTransactionUpdateDTO updateDTO
    ) {
        return recurringTransactionService.update(principal.getId(), id, scope, updateDTO);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID id,
            @RequestParam(defaultValue = "FUTURE") RecurrenceScope scope
    ) {
        recurringTransactionService.delete(principal.getId(), id, scope);
    }
}
