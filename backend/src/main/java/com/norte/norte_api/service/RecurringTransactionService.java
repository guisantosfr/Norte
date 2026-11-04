package com.norte.norte_api.service;

import java.time.LocalDate;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;
import java.util.stream.Stream;

import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.norte.norte_api.dto.RecurringTransactionRequestDTO;
import com.norte.norte_api.dto.RecurringTransactionResponseDTO;
import com.norte.norte_api.dto.RecurringTransactionUpdateDTO;
import com.norte.norte_api.dto.TransactionResponseDTO;
import com.norte.norte_api.exception.BusinessRuleException;
import com.norte.norte_api.exception.ResourceNotFoundException;
import com.norte.norte_api.models.CategoryModel;
import com.norte.norte_api.models.RecurrenceFrequency;
import com.norte.norte_api.models.RecurrenceScope;
import com.norte.norte_api.models.RecurringTransactionModel;
import com.norte.norte_api.models.TransactionModel;
import com.norte.norte_api.models.TransactionStatus;
import com.norte.norte_api.models.TransactionType;
import com.norte.norte_api.repository.RecurringTransactionRepository;
import com.norte.norte_api.repository.TransactionRepository;
import com.norte.norte_api.service.RecurrenceScheduleCalculator.ScheduledOccurrence;

import jakarta.persistence.criteria.Predicate;

@Service
public class RecurringTransactionService {

    private static final String RECURRING_NOT_FOUND_MSG = "Recorrência não encontrada.";

    private final RecurringTransactionRepository recurringTransactionRepository;
    private final TransactionRepository transactionRepository;
    private final CategoryService categoryService;

    public RecurringTransactionService(
            RecurringTransactionRepository recurringTransactionRepository,
            TransactionRepository transactionRepository,
            CategoryService categoryService
    ) {
        this.recurringTransactionRepository = recurringTransactionRepository;
        this.transactionRepository = transactionRepository;
        this.categoryService = categoryService;
    }

    @Transactional
    public RecurringTransactionResponseDTO create(UUID userId, RecurringTransactionRequestDTO dto) {
        LocalDate today = LocalDate.now();
        LocalDate effectiveStartDate = RecurrenceScheduleCalculator.resolveEffectiveStartDate(dto.startDate(), today);
        RecurrenceFrequency frequency = dto.frequency() != null ? dto.frequency() : RecurrenceFrequency.MONTHLY;

        CategoryModel category = categoryService.resolveCategoryForAssociation(
                userId,
                dto.categoryId(),
                dto.categoryName(),
                null
        );

        List<ScheduledOccurrence> schedule = RecurrenceScheduleCalculator.generateInitialOccurrences(
                effectiveStartDate,
                dto.dayOfMonth(),
                dto.occurrences()
        );

        LocalDate generatedUntil = schedule.getLast().date();

        RecurringTransactionModel recurring = new RecurringTransactionModel();
        recurring.setUserId(userId);
        recurring.setCategory(category);
        recurring.setType(dto.type());
        recurring.setDescription(dto.description().trim());
        recurring.setAmount(dto.amount());
        recurring.setFrequency(frequency);
        recurring.setStartDate(effectiveStartDate);
        recurring.setDayOfMonth(dto.dayOfMonth());
        recurring.setOccurrences(dto.occurrences());
        recurring.setActive(true);
        recurring.setGeneratedUntil(generatedUntil);

        RecurringTransactionModel savedRecurring = recurringTransactionRepository.saveAndFlush(recurring);

        List<TransactionModel> generatedTransactions = schedule.stream()
                .map(occ -> buildPendingOccurrence(savedRecurring, occ.occurrenceNumber(), occ.date()))
                .toList();

        transactionRepository.saveAll(generatedTransactions);

        return RecurringTransactionResponseDTO.from(savedRecurring);
    }

    @Transactional(readOnly = true)
    public List<RecurringTransactionResponseDTO> findAll(
            UUID userId,
            Boolean active,
            TransactionType type,
            UUID categoryId
    ) {
        Specification<RecurringTransactionModel> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.equal(root.get("userId"), userId));

            if (active != null) {
                predicates.add(cb.equal(root.get("active"), active));
            }
            if (type != null) {
                predicates.add(cb.equal(root.get("type"), type));
            }
            if (categoryId != null) {
                predicates.add(cb.equal(root.get("category").get("id"), categoryId));
            }

            return cb.and(predicates.toArray(Predicate[]::new));
        };

        Sort sort = Sort.by(Sort.Order.desc("createdAt"));

        return recurringTransactionRepository.findAll(spec, sort)
                .stream()
                .map(RecurringTransactionResponseDTO::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public RecurringTransactionResponseDTO findById(UUID userId, UUID recurringId) {
        RecurringTransactionModel recurring = findOwnedRecurring(userId, recurringId);
        return RecurringTransactionResponseDTO.from(recurring);
    }

    @Transactional(readOnly = true)
    public List<TransactionResponseDTO> findOccurrences(UUID userId, UUID recurringId) {
        findOwnedRecurring(userId, recurringId);

        return transactionRepository
                .findAllByRecurringTransaction_IdAndUserIdOrderByOccurrenceNumberAsc(recurringId, userId)
                .stream()
                .map(TransactionResponseDTO::from)
                .toList();
    }

    @Transactional
    public RecurringTransactionResponseDTO update(
            UUID userId,
            UUID recurringId,
            RecurrenceScope scope,
            RecurringTransactionUpdateDTO dto
    ) {
        RecurringTransactionModel recurring = findOwnedRecurring(userId, recurringId);

        if (!recurring.isActive()) {
            throw new BusinessRuleException("Não é permitido editar uma recorrência encerrada.");
        }

        CategoryModel category = categoryService.resolveCategoryForAssociation(
                userId,
                dto.categoryId(),
                dto.categoryName(),
                recurring.getCategoryId()
        );

        List<TransactionModel> seriesTransactions = transactionRepository
                .findAllByRecurringTransaction_IdAndUserIdOrderByOccurrenceNumberAsc(recurringId, userId);

        LocalDate today = LocalDate.now();

        if (dto.occurrences() != null) {
            int maxProtectedOccurrence = seriesTransactions.stream()
                    .filter(tx -> !isEligibleForScope(tx, scope, today))
                    .map(TransactionModel::getOccurrenceNumber)
                    .filter(num -> num != null)
                    .max(Integer::compareTo)
                    .orElse(0);

            if (dto.occurrences() < maxProtectedOccurrence) {
                throw new BusinessRuleException(
                        "A quantidade de ocorrências não pode ser menor que o número de ocorrências já realizadas, canceladas ou fora do escopo ("
                                + maxProtectedOccurrence + ")."
                );
            }
        }

        recurring.setType(dto.type());
        recurring.setDescription(dto.description().trim());
        recurring.setAmount(dto.amount());
        recurring.setCategory(category);
        recurring.setDayOfMonth(dto.dayOfMonth());
        recurring.setOccurrences(dto.occurrences());

        List<TransactionModel> toDelete = new ArrayList<>();
        List<TransactionModel> survivingTransactions = new ArrayList<>();

        for (TransactionModel tx : seriesTransactions) {
            boolean eligible = isEligibleForScope(tx, scope, today);
            boolean exceedsNewLimit = dto.occurrences() != null
                    && tx.getOccurrenceNumber() != null
                    && tx.getOccurrenceNumber() > dto.occurrences();

            if (eligible && exceedsNewLimit) {
                toDelete.add(tx);
            } else {
                survivingTransactions.add(tx);
            }
        }

        if (!toDelete.isEmpty()) {
            transactionRepository.deleteAll(toDelete);
            transactionRepository.flush();
        }

        List<TransactionModel> toUpdate = new ArrayList<>();
        for (TransactionModel tx : survivingTransactions) {
            if (isEligibleForScope(tx, scope, today)) {
                tx.setType(recurring.getType());
                tx.setDescription(recurring.getDescription());
                tx.setAmount(recurring.getAmount());
                tx.setCategory(category);

                YearMonth ym = YearMonth.from(tx.getDate());
                tx.setDate(RecurrenceScheduleCalculator.resolveDateForMonth(ym, dto.dayOfMonth()));
                toUpdate.add(tx);
            }
        }

        if (!toUpdate.isEmpty()) {
            transactionRepository.saveAll(toUpdate);
        }

        List<TransactionModel> toInsert = generateMissingTailOccurrences(
                recurring,
                survivingTransactions,
                today
        );

        if (!toInsert.isEmpty()) {
            transactionRepository.saveAll(toInsert);
        }

        LocalDate newGeneratedUntil = Stream.concat(survivingTransactions.stream(), toInsert.stream())
                .map(TransactionModel::getDate)
                .max(Comparator.naturalOrder())
                .orElse(recurring.getGeneratedUntil());

        recurring.setGeneratedUntil(newGeneratedUntil);

        RecurringTransactionModel savedRecurring = recurringTransactionRepository.save(recurring);
        return RecurringTransactionResponseDTO.from(savedRecurring);
    }

    @Transactional
    public void delete(UUID userId, UUID recurringId, RecurrenceScope scope) {
        RecurringTransactionModel recurring = findOwnedRecurring(userId, recurringId);

        List<TransactionModel> seriesTransactions = transactionRepository
                .findAllByRecurringTransaction_IdAndUserIdOrderByOccurrenceNumberAsc(recurringId, userId);

        LocalDate today = LocalDate.now();

        List<TransactionModel> toDelete = seriesTransactions.stream()
                .filter(tx -> isEligibleForScope(tx, scope, today))
                .toList();

        if (!toDelete.isEmpty()) {
            transactionRepository.deleteAll(toDelete);
            transactionRepository.flush();
        }

        boolean hasRemainingTransactions = transactionRepository
                .existsByRecurringTransaction_IdAndUserId(recurringId, userId);

        if (hasRemainingTransactions) {
            recurring.setActive(false);
            recurringTransactionRepository.save(recurring);
        } else {
            recurringTransactionRepository.delete(recurring);
        }
    }

    private List<TransactionModel> generateMissingTailOccurrences(
            RecurringTransactionModel recurring,
            List<TransactionModel> survivingTransactions,
            LocalDate today
    ) {
        int dayOfMonth = recurring.getDayOfMonth();
        Integer targetOccurrences = recurring.getOccurrences();

        int currentMaxOccurrence;
        YearMonth currentMonth;

        if (!survivingTransactions.isEmpty()) {
            TransactionModel lastTx = survivingTransactions.getLast();
            currentMaxOccurrence = lastTx.getOccurrenceNumber() != null
                    ? lastTx.getOccurrenceNumber()
                    : survivingTransactions.size();
            currentMonth = YearMonth.from(lastTx.getDate());
        } else {
            currentMaxOccurrence = 0;
            LocalDate baseDate = RecurrenceScheduleCalculator.resolveEffectiveStartDate(recurring.getStartDate(), today);
            YearMonth firstMonth = RecurrenceScheduleCalculator.resolveFirstYearMonth(baseDate, dayOfMonth);
            currentMonth = firstMonth.minusMonths(1);
        }

        List<TransactionModel> toInsert = new ArrayList<>();

        if (targetOccurrences != null) {
            while (currentMaxOccurrence < targetOccurrences) {
                currentMaxOccurrence++;
                currentMonth = currentMonth.plusMonths(1);
                LocalDate nextDate = RecurrenceScheduleCalculator.resolveDateForMonth(currentMonth, dayOfMonth);
                toInsert.add(buildPendingOccurrence(recurring, currentMaxOccurrence, nextDate));
            }
        } else {
            YearMonth firstEligibleFromToday = RecurrenceScheduleCalculator.resolveFirstYearMonth(today, dayOfMonth);
            YearMonth targetEndMonth = firstEligibleFromToday.plusMonths(
                    RecurrenceScheduleCalculator.OPEN_ENDED_MONTHS_AHEAD - 1
            );

            while (currentMonth.isBefore(targetEndMonth)) {
                currentMaxOccurrence++;
                currentMonth = currentMonth.plusMonths(1);
                LocalDate nextDate = RecurrenceScheduleCalculator.resolveDateForMonth(currentMonth, dayOfMonth);
                toInsert.add(buildPendingOccurrence(recurring, currentMaxOccurrence, nextDate));
            }
        }

        return toInsert;
    }

    private static TransactionModel buildPendingOccurrence(
            RecurringTransactionModel recurring,
            int occurrenceNumber,
            LocalDate date
    ) {
        TransactionModel tx = new TransactionModel();
        tx.setUserId(recurring.getUserId());
        tx.setCategory(recurring.getCategory());
        tx.setRecurringTransaction(recurring);
        tx.setType(recurring.getType());
        tx.setDescription(recurring.getDescription());
        tx.setAmount(recurring.getAmount());
        tx.setDate(date);
        tx.setStatus(TransactionStatus.PENDING);
        tx.setOccurrenceNumber(occurrenceNumber);
        return tx;
    }

    private static boolean isEligibleForScope(
            TransactionModel tx,
            RecurrenceScope scope,
            LocalDate today
    ) {
        if (tx.getStatus() != TransactionStatus.PENDING) {
            return false;
        }
        if (scope == RecurrenceScope.FUTURE) {
            return !tx.getDate().isBefore(today);
        }
        return true;
    }

    private RecurringTransactionModel findOwnedRecurring(UUID userId, UUID recurringId) {
        return recurringTransactionRepository.findByIdAndUserId(recurringId, userId)
                .orElseThrow(() -> new ResourceNotFoundException(RECURRING_NOT_FOUND_MSG));
    }
}
