package com.norte.norte_api.service;

import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.UUID;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.norte.norte_api.dto.CategoryRequestDTO;
import com.norte.norte_api.dto.CategoryResponseDTO;
import com.norte.norte_api.exception.BusinessRuleException;
import com.norte.norte_api.exception.DuplicateCategoryNameException;
import com.norte.norte_api.exception.ResourceNotFoundException;
import com.norte.norte_api.models.CategoryModel;
import com.norte.norte_api.repository.CategoryRepository;
import com.norte.norte_api.repository.RecurringTransactionRepository;
import com.norte.norte_api.repository.TransactionRepository;

@Service
public class CategoryService {

    private static final String CATEGORY_NOT_FOUND_MSG = "Categoria não encontrada.";

    private final CategoryRepository categoryRepository;
    private final TransactionRepository transactionRepository;
    private final RecurringTransactionRepository recurringTransactionRepository;

    public CategoryService(
            CategoryRepository categoryRepository,
            TransactionRepository transactionRepository,
            RecurringTransactionRepository recurringTransactionRepository
    ) {
        this.categoryRepository = categoryRepository;
        this.transactionRepository = transactionRepository;
        this.recurringTransactionRepository = recurringTransactionRepository;
    }

    @Transactional
    public CategoryResponseDTO create(UUID userId, CategoryRequestDTO dto) {
        CategoryModel saved = createEntity(userId, dto.name());
        return CategoryResponseDTO.from(saved);
    }

    @Transactional
    public CategoryModel createEntity(UUID userId, String rawName) {
        String name = rawName.trim();

        if (categoryRepository.existsByUserIdAndNameIgnoreCase(userId, name)) {
            throw new DuplicateCategoryNameException();
        }

        CategoryModel category = new CategoryModel();
        category.setUserId(userId);
        category.setName(name);
        category.setActive(true);

        try {
            return categoryRepository.saveAndFlush(category);
        } catch (DataIntegrityViolationException ex) {
            if (isConstraintViolation(ex, "uk_categories_user_name")) {
                throw new DuplicateCategoryNameException();
            }
            throw ex;
        }
    }

    @Transactional(readOnly = true)
    public List<CategoryResponseDTO> findAll(UUID userId, Boolean active) {
        List<CategoryModel> categories = active == null
                ? categoryRepository.findAllByUserIdOrderByNameAsc(userId)
                : categoryRepository.findAllByUserIdAndActiveOrderByNameAsc(userId, active);

        return categories.stream()
                .map(CategoryResponseDTO::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public CategoryResponseDTO findById(UUID userId, UUID categoryId) {
        CategoryModel category = findOwnedCategory(userId, categoryId);
        return CategoryResponseDTO.from(category);
    }

    @Transactional
    public CategoryResponseDTO update(UUID userId, UUID categoryId, CategoryRequestDTO dto) {
        CategoryModel category = findOwnedCategory(userId, categoryId);
        String name = dto.name().trim();

        if (categoryRepository.existsByUserIdAndNameIgnoreCaseAndIdNot(userId, name, categoryId)) {
            throw new DuplicateCategoryNameException();
        }

        category.setName(name);

        try {
            CategoryModel saved = categoryRepository.saveAndFlush(category);
            return CategoryResponseDTO.from(saved);
        } catch (DataIntegrityViolationException ex) {
            if (isConstraintViolation(ex, "uk_categories_user_name")) {
                throw new DuplicateCategoryNameException();
            }
            throw ex;
        }
    }

    @Transactional
    public void delete(UUID userId, UUID categoryId) {
        CategoryModel category = findOwnedCategory(userId, categoryId);

        boolean hasLinkedTransactions = transactionRepository.existsByCategory_IdAndUserId(categoryId, userId);
        boolean hasLinkedRecurrences = recurringTransactionRepository.existsByCategory_IdAndUserId(categoryId, userId);

        if (hasLinkedTransactions || hasLinkedRecurrences) {
            category.setActive(false);
            categoryRepository.save(category);
        } else {
            categoryRepository.delete(category);
        }
    }

    @Transactional(readOnly = true)
    public CategoryModel findOwnedCategory(UUID userId, UUID categoryId) {
        return categoryRepository.findByIdAndUserId(categoryId, userId)
                .orElseThrow(() -> new ResourceNotFoundException(CATEGORY_NOT_FOUND_MSG));
    }

    @Transactional
    public CategoryModel resolveCategoryForAssociation(
            UUID userId,
            UUID categoryId,
            String categoryName,
            UUID currentCategoryId
    ) {
        boolean hasId = categoryId != null;
        boolean hasName = categoryName != null && !categoryName.trim().isEmpty();

        if (hasId && hasName) {
            throw new BusinessRuleException("Informe apenas categoryId ou categoryName, não ambos.");
        }

        if (hasName) {
            return createEntity(userId, categoryName);
        }

        if (hasId) {
            CategoryModel category = findOwnedCategory(userId, categoryId);
            if (!category.isActive() && !categoryId.equals(currentCategoryId)) {
                throw new BusinessRuleException("Não é permitido associar uma categoria desativada.");
            }
            return category;
        }

        return null;
    }

    private static boolean isConstraintViolation(DataIntegrityViolationException ex, String constraintHint) {
        String message = Optional.ofNullable(ex.getMostSpecificCause())
                .map(Throwable::getMessage)
                .orElseGet(ex::getMessage);
        return message != null && message.toLowerCase(Locale.ROOT).contains(constraintHint.toLowerCase(Locale.ROOT));
    }
}
