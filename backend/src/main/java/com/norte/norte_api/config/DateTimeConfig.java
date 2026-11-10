package com.norte.norte_api.config;

import java.time.Clock;
import java.time.ZoneId;
import java.util.TimeZone;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import jakarta.annotation.PostConstruct;

/**
 * Configuração central e explícita da estratégia de datas, horários e fuso horário da aplicação.
 *
 * <p>Estratégia adotada:
 * <ul>
 *   <li><b>Instantes absolutos ({@link java.time.Instant}):</b> Armazenados no banco como
 *       {@code TIMESTAMPTZ} (PostgreSQL armazena em UTC) e transmitidos nas APIs em formato
 *       ISO-8601 UTC (ex.: {@code 2026-11-10T19:00:00Z}). Representam eventos com momento exato
 *       (ex.: {@code created_at}, {@code realized_at}, {@code read_at}).</li>
 *   <li><b>Datas civis de calendário ({@link java.time.LocalDate}):</b> Armazenadas no banco
 *       como {@code DATE} sem hora ou deslocamento de fuso. Representam dias de vencimento ou previsão.</li>
 *   <li><b>Determinação de "hoje" para regras de negócio:</b> Para operações que dependem da data
 *       atual (cálculo de ocorrências de transações recorrentes e agendamento de lembretes diários),
 *       utiliza-se consistentemente o fuso horário oficial da aplicação definido em {@code app.timezone}
 *       (padrão {@code America/Sao_Paulo}) via {@link Clock} ou {@link ZoneId}.</li>
 *   <li><b>JVM Default Timezone:</b> Fixado na inicialização para o fuso configurado, garantindo
 *       comportamento idêntico em qualquer ambiente (dev, Docker, CI/CD ou nuvem).</li>
 * </ul>
 */
@Configuration
public class DateTimeConfig {

    private static final Logger log = LoggerFactory.getLogger(DateTimeConfig.class);

    private final String timezone;

    public DateTimeConfig(@Value("${app.timezone:America/Sao_Paulo}") String timezone) {
        this.timezone = timezone;
    }

    @PostConstruct
    public void init() {
        TimeZone.setDefault(TimeZone.getTimeZone(timezone));
        log.info("Fuso horário padrão da aplicação fixado para: {}", timezone);
    }

    @Bean
    public ZoneId applicationZoneId() {
        return ZoneId.of(timezone);
    }

    @Bean
    public Clock clock(ZoneId applicationZoneId) {
        return Clock.system(applicationZoneId);
    }
}
