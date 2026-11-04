package com.norte.norte_api.service;

import java.time.LocalDate;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.List;

/**
 * Motor determinístico de cálculo de datas para regras de recorrência mensal.
 *
 * <p>Concentra explicitamente as regras de calendário do domínio:
 * <ul>
 *   <li>Não-retroatividade na criação: datas anteriores a {@code today} nunca são geradas.</li>
 *   <li>Clamping de fim de mês: se {@code dayOfMonth} exceder os dias do mês (ex.: 31 em fevereiro
 *       ou abril), utiliza o último dia disponível daquele mês (28/29 ou 30).</li>
 *   <li>Janela padrão de 12 meses para recorrências sem quantidade definida ({@code occurrences == null}).</li>
 * </ul>
 */
public final class RecurrenceScheduleCalculator {

    public static final int OPEN_ENDED_MONTHS_AHEAD = 12;

    public record ScheduledOccurrence(int occurrenceNumber, LocalDate date) {
    }

    private RecurrenceScheduleCalculator() {
    }

    public static LocalDate resolveEffectiveStartDate(LocalDate requestedStartDate, LocalDate today) {
        if (requestedStartDate == null || requestedStartDate.isBefore(today)) {
            return today;
        }
        return requestedStartDate;
    }

    public static LocalDate resolveDateForMonth(YearMonth yearMonth, int dayOfMonth) {
        int clampedDay = Math.min(dayOfMonth, yearMonth.lengthOfMonth());
        return yearMonth.atDay(clampedDay);
    }

    public static YearMonth resolveFirstYearMonth(LocalDate effectiveStartDate, int dayOfMonth) {
        YearMonth startMonth = YearMonth.from(effectiveStartDate);
        LocalDate candidateDate = resolveDateForMonth(startMonth, dayOfMonth);
        return candidateDate.isBefore(effectiveStartDate)
                ? startMonth.plusMonths(1)
                : startMonth;
    }

    public static List<ScheduledOccurrence> generateInitialOccurrences(
            LocalDate effectiveStartDate,
            int dayOfMonth,
            Integer occurrences
    ) {
        int count = occurrences != null ? occurrences : OPEN_ENDED_MONTHS_AHEAD;
        YearMonth firstMonth = resolveFirstYearMonth(effectiveStartDate, dayOfMonth);

        List<ScheduledOccurrence> result = new ArrayList<>(count);
        for (int i = 0; i < count; i++) {
            YearMonth month = firstMonth.plusMonths(i);
            LocalDate date = resolveDateForMonth(month, dayOfMonth);
            result.add(new ScheduledOccurrence(i + 1, date));
        }
        return result;
    }
}
