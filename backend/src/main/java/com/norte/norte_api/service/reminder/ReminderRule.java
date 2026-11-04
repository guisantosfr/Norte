package com.norte.norte_api.service.reminder;

import java.time.LocalDate;
import java.util.List;

import com.norte.norte_api.models.NotificationType;
import com.norte.norte_api.models.TransactionModel;

/**
 * Contrato extensível para regras de geração de lembretes financeiros.
 *
 * <p>Para adicionar novos tipos de lembrete no futuro (ex.: vencimento no dia atual
 * ou transações em atraso), basta registrar um novo componente implementando esta interface.
 */
public interface ReminderRule {

    NotificationType getType();

    List<TransactionModel> findEligibleTransactions(LocalDate referenceDate);

    String buildTitle(TransactionModel transaction);

    String buildMessage(TransactionModel transaction);
}
