package com.norte.norte_api.service.reminder;

import java.math.BigDecimal;
import java.text.NumberFormat;
import java.time.LocalDate;
import java.util.List;
import java.util.Locale;

import org.springframework.stereotype.Component;

import com.norte.norte_api.models.NotificationType;
import com.norte.norte_api.models.TransactionModel;
import com.norte.norte_api.models.TransactionType;
import com.norte.norte_api.repository.TransactionRepository;

/**
 * Regra padrão do MVP: gera lembretes com 1 dia de antecedência para transações pendentes.
 */
@Component
public class UpcomingTransactionReminderRule implements ReminderRule {

    private static final Locale PT_BR = Locale.of("pt", "BR");

    private final TransactionRepository transactionRepository;

    public UpcomingTransactionReminderRule(TransactionRepository transactionRepository) {
        this.transactionRepository = transactionRepository;
    }

    @Override
    public NotificationType getType() {
        return NotificationType.TRANSACTION_REMINDER;
    }

    @Override
    public List<TransactionModel> findEligibleTransactions(LocalDate referenceDate) {
        LocalDate tomorrow = referenceDate.plusDays(1);
        return transactionRepository.findPendingWithoutNotification(tomorrow, getType());
    }

    @Override
    public String buildTitle(TransactionModel transaction) {
        return transaction.getType() == TransactionType.EXPENSE
                ? "Lembrete de despesa"
                : "Lembrete de entrada";
    }

    @Override
    public String buildMessage(TransactionModel transaction) {
        String kindLabel = transaction.getType() == TransactionType.EXPENSE ? "despesa" : "entrada";
        String formattedAmount = formatCurrency(transaction.getAmount());
        return String.format(
                "A %s %s de %s está prevista para amanhã.",
                kindLabel,
                transaction.getDescription(),
                formattedAmount
        );
    }

    private static String formatCurrency(BigDecimal amount) {
        NumberFormat currencyFormat = NumberFormat.getCurrencyInstance(PT_BR);
        return currencyFormat.format(amount);
    }
}
