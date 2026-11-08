package com.norte.norte_api.service;

import java.time.LocalDate;
import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;

import com.norte.norte_api.exception.DataIntegrityViolationInspector;
import com.norte.norte_api.models.NotificationModel;
import com.norte.norte_api.models.TransactionModel;
import com.norte.norte_api.repository.NotificationRepository;
import com.norte.norte_api.service.reminder.ReminderRule;

/**
 * Orquestrador idempotente de geração de notificações/lembretes.
 *
 * <p>Executa todas as {@link ReminderRule} registradas para a data de referência.
 * Além do filtro {@code NOT EXISTS} na consulta de elegibilidade, cada inserção roda
 * em transação isolada protegida pelo índice único {@code uk_notification_transaction_type},
 * garantindo idempotência mesmo em reexecuções ou instâncias concorrentes.
 */
@Service
public class NotificationGeneratorService {

    private static final Logger log = LoggerFactory.getLogger(NotificationGeneratorService.class);

    private static final String NOTIFICATION_TRANSACTION_TYPE_INDEX = "uk_notification_transaction_type";

    private final List<ReminderRule> reminderRules;
    private final NotificationRepository notificationRepository;
    private final TransactionTemplate requiresNewTx;
    private final DataIntegrityViolationInspector integrityViolationInspector;

    public NotificationGeneratorService(
            List<ReminderRule> reminderRules,
            NotificationRepository notificationRepository,
            PlatformTransactionManager transactionManager,
            DataIntegrityViolationInspector integrityViolationInspector
    ) {
        this.reminderRules = reminderRules;
        this.notificationRepository = notificationRepository;
        this.requiresNewTx = new TransactionTemplate(transactionManager);
        this.requiresNewTx.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
        this.integrityViolationInspector = integrityViolationInspector;
    }

    public int generateForDate(LocalDate referenceDate) {
        int createdCount = 0;

        for (ReminderRule rule : reminderRules) {
            List<TransactionModel> eligibleTransactions = rule.findEligibleTransactions(referenceDate);

            for (TransactionModel tx : eligibleTransactions) {
                if (createIfAbsent(rule, tx)) {
                    createdCount++;
                }
            }
        }

        if (createdCount > 0) {
            log.info("Processo de lembretes concluído para {}: {} notificação(ões) gerada(s).",
                    referenceDate, createdCount);
        } else {
            log.debug("Processo de lembretes concluído para {}: nenhuma nova notificação pendente.",
                    referenceDate);
        }

        return createdCount;
    }

    private boolean createIfAbsent(ReminderRule rule, TransactionModel tx) {
        try {
            requiresNewTx.executeWithoutResult(status -> {
                NotificationModel notification = new NotificationModel();
                notification.setUserId(tx.getUserId());
                notification.setTransaction(tx);
                notification.setType(rule.getType());
                notification.setTitle(rule.buildTitle(tx));
                notification.setMessage(rule.buildMessage(tx));
                notificationRepository.saveAndFlush(notification);
            });
            return true;
        } catch (DataIntegrityViolationException ex) {
            if (integrityViolationInspector.isUniqueViolation(ex, NOTIFICATION_TRANSACTION_TYPE_INDEX)) {
                log.debug("Lembrete {} já existente para a transação {}, ignorando duplicidade.",
                        rule.getType(), tx.getId());
                return false;
            }
            throw ex;
        }
    }
}
