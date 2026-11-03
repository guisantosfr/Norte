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

import com.norte.norte_api.dto.CategoryRequestDTO;
import com.norte.norte_api.dto.CategoryResponseDTO;
import com.norte.norte_api.security.UserPrincipal;
import com.norte.norte_api.service.CategoryService;

import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/categories")
@SecurityRequirement(name = "bearerAuth")
public class CategoryController {

    private final CategoryService categoryService;

    public CategoryController(CategoryService categoryService) {
        this.categoryService = categoryService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public CategoryResponseDTO create(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody CategoryRequestDTO requestDTO
    ) {
        return categoryService.create(principal.getId(), requestDTO);
    }

    @GetMapping
    public List<CategoryResponseDTO> findAll(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam(required = false) Boolean active
    ) {
        return categoryService.findAll(principal.getId(), active);
    }

    @GetMapping("/{id}")
    public CategoryResponseDTO findById(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID id
    ) {
        return categoryService.findById(principal.getId(), id);
    }

    @PutMapping("/{id}")
    public CategoryResponseDTO update(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID id,
            @Valid @RequestBody CategoryRequestDTO requestDTO
    ) {
        return categoryService.update(principal.getId(), id, requestDTO);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID id
    ) {
        categoryService.delete(principal.getId(), id);
    }
}
