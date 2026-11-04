package com.norte.norte_api.service;

import java.time.LocalDate;
import java.time.ZoneId;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class NotificationScheduler {

    private static final Logger log = LoggerFactory.getLogger(NotificationScheduler.class);

    private final NotificationGeneratorService generatorService;
    private final ZoneId zoneId;
    private final boolean runOnStartup;

    public NotificationScheduler(
            NotificationGeneratorService generatorService,
            @Value("${notifications.reminder.zone:America/Sao_Paulo}") String zone,
            @Value("${notifications.reminder.run-on-startup:true}") boolean runOnStartup
    ) {
        this.generatorService = generatorService;
        this.zoneId = ZoneId.of(zone);
        this.runOnStartup = runOnStartup;
    }

    @Scheduled(
            cron = "${notifications.reminder.cron:0 0 6 * * *}",
            zone = "${notifications.reminder.zone:America/Sao_Paulo}"
    )
    public void runDailyReminders() {
        executeGeneration("cron diário");
    }

    @EventListener(ApplicationReadyEvent.class)
    public void onApplicationReady() {
        if (runOnStartup) {
            executeGeneration("inicialização da aplicação");
        }
    }

    private void executeGeneration(String trigger) {
        try {
            LocalDate today = LocalDate.now(zoneId);
            generatorService.generateForDate(today);
        } catch (Exception ex) {
            log.error("Falha ao executar geração de lembretes ({}): {}", trigger, ex.getMessage(), ex);
        }
    }
}
