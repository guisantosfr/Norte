package com.norte.norte_api.security.ratelimit;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import com.norte.norte_api.config.AuthProperties;

/**
 * Limitador de taxa em memória (MVP) baseado em janela deslizante exata por chave.
 *
 * <p>Usa {@link ConcurrentHashMap} com sincronização por balde individual e limpeza
 * periódica agendada para manter o uso de memória limitado sem depender de
 * infraestrutura externa (como Redis).
 */
@Component
public class AuthRateLimiter {

    private static final long MIN_CLEANUP_RETENTION_SECONDS = 300L;

    private final ConcurrentHashMap<String, SlidingWindowBucket> buckets = new ConcurrentHashMap<>();
    private final AuthProperties authProperties;
    private final Clock clock;

    public AuthRateLimiter(AuthProperties authProperties, Clock clock) {
        this.authProperties = authProperties;
        this.clock = clock;
    }

    /**
     * Resultado da tentativa de consumo no rate limiter.
     *
     * @param allowed           {@code true} se a requisição está dentro do limite
     * @param retryAfterSeconds segundos recomendados de espera caso bloqueada (0 se permitida)
     */
    public record RateLimitDecision(boolean allowed, long retryAfterSeconds) {
    }

    /**
     * Tenta registrar uma nova requisição para a chave informada dentro da janela.
     *
     * @param key      identificador único (ex.: {@code "login:192.168.0.10"})
     * @param capacity quantidade máxima de requisições na janela
     * @param window   duração da janela deslizante
     * @return decisão indicando permissão ou tempo restante para nova tentativa
     */
    public RateLimitDecision tryAcquire(String key, int capacity, Duration window) {
        Instant now = clock.instant();
        SlidingWindowBucket bucket = buckets.computeIfAbsent(key, ignored -> new SlidingWindowBucket(now));
        return bucket.tryConsume(now, capacity, window);
    }

    /**
     * Remove baldes ociosos cujo último registro já ultrapassou o dobro da maior
     * janela configurada, prevenindo crescimento indefinido em memória.
     */
    @Scheduled(fixedDelay = 600_000)
    public void evictIdleBuckets() {
        long maxWindowSeconds = Math.max(
                authProperties.rateLimit().login().durationSeconds(),
                authProperties.rateLimit().register().durationSeconds());
        long retentionSeconds = Math.max(MIN_CLEANUP_RETENTION_SECONDS, maxWindowSeconds * 2);
        Instant cutoff = clock.instant().minusSeconds(retentionSeconds);

        buckets.entrySet().removeIf(entry -> entry.getValue().isIdleSince(cutoff));
    }

    private static final class SlidingWindowBucket {

        private final Deque<Instant> timestamps = new ArrayDeque<>();
        private Instant lastAccess;

        private SlidingWindowBucket(Instant createdAt) {
            this.lastAccess = createdAt;
        }

        private synchronized RateLimitDecision tryConsume(Instant now, int capacity, Duration window) {
            lastAccess = now;
            Instant windowStart = now.minus(window);

            while (!timestamps.isEmpty() && !timestamps.peekFirst().isAfter(windowStart)) {
                timestamps.pollFirst();
            }

            if (timestamps.size() < capacity) {
                timestamps.addLast(now);
                return new RateLimitDecision(true, 0L);
            }

            Instant oldest = timestamps.peekFirst();
            Instant availableAt = oldest.plus(window);
            Duration wait = Duration.between(now, availableAt);
            long seconds = wait.toSeconds() + (wait.toMillisPart() > 0 || wait.toNanosPart() > 0 ? 1L : 0L);
            return new RateLimitDecision(false, Math.max(1L, seconds));
        }

        private synchronized boolean isIdleSince(Instant cutoff) {
            return lastAccess.isBefore(cutoff);
        }
    }
}
