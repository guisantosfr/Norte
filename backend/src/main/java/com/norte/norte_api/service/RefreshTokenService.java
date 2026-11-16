package com.norte.norte_api.service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Clock;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Base64;
import java.util.HexFormat;
import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import com.norte.norte_api.config.AuthProperties;
import com.norte.norte_api.exception.InvalidRefreshTokenException;
import com.norte.norte_api.models.RefreshTokenModel;
import com.norte.norte_api.models.UserModel;
import com.norte.norte_api.repository.RefreshTokenRepository;

/**
 * Gerencia o ciclo de vida completo dos refresh tokens: emissão, rotação,
 * armazenamento seguro via hash SHA-256, revogação, expiração absoluta e por
 * inatividade, além de detecção de reutilização de tokens antigos.
 */
@Service
public class RefreshTokenService {

    private static final Logger log = LoggerFactory.getLogger(RefreshTokenService.class);
    private static final int TOKEN_BYTE_LENGTH = 32; // 256 bits de entropia
    private static final long CLEANUP_RETENTION_DAYS = 7;

    private final RefreshTokenRepository refreshTokenRepository;
    private final AuthProperties authProperties;
    private final Clock clock;
    private final SecureRandom secureRandom = new SecureRandom();

    public RefreshTokenService(
            RefreshTokenRepository refreshTokenRepository,
            AuthProperties authProperties,
            Clock clock) {
        this.refreshTokenRepository = refreshTokenRepository;
        this.authProperties = authProperties;
        this.clock = clock;
    }

    /**
     * Resultado de uma rotação bem-sucedida: novo token opaco em texto puro e
     * usuário proprietário da sessão.
     */
    public record RotatedToken(String rawRefreshToken, UserModel user) {
    }

    /**
     * Cria o token inicial de uma nova família de sessão (login ou cadastro).
     *
     * @param user usuário autenticado
     * @return token opaco em texto puro para entrega exclusiva ao cliente
     */
    @Transactional
    public String createRefreshToken(UserModel user) {
        Instant now = clock.instant();
        Instant expiresAt = now.plus(authProperties.refreshToken().expirationDays(), ChronoUnit.DAYS);
        UUID familyId = UUID.randomUUID();

        return persistNewToken(user, familyId, expiresAt, now);
    }

    /**
     * Valida e rotaciona o refresh token recebido.
     *
     * <p>Usa {@code noRollbackFor = InvalidRefreshTokenException.class} para garantir
     * que a revogação em cascata da família (no caso de detecção de reutilização)
     * ou a revogação de tokens expirados seja efetivamente persistida no banco.
     *
     * @param rawRefreshToken token opaco enviado pelo cliente
     * @return novo token opaco rotacionado e usuário associado
     * @throws InvalidRefreshTokenException se o token for inválido, expirado,
     *                                      inativo ou reutilizado
     */
    @Transactional(noRollbackFor = InvalidRefreshTokenException.class)
    public RotatedToken rotate(String rawRefreshToken) {
        if (!StringUtils.hasText(rawRefreshToken)) {
            throw new InvalidRefreshTokenException("Refresh token inválido.");
        }

        String tokenHash = hashToken(rawRefreshToken);
        RefreshTokenModel existing = refreshTokenRepository.findWithLockByTokenHash(tokenHash)
                .orElseThrow(() -> new InvalidRefreshTokenException("Refresh token inválido ou inexistente."));

        Instant now = clock.instant();
        UserModel user = existing.getUser();

        // Detecção de reutilização: um token já rotacionado/revogado foi reapresentado.
        // Invalida imediatamente toda a família de tokens como medida de contenção.
        if (existing.isRevoked()) {
            int revokedCount = refreshTokenRepository.revokeAllByFamilyId(existing.getFamilyId(), now);
            log.warn("Alerta de segurança: tentativa de reutilização de refresh token detectada! "
                    + "userId={}, familyId={}, tokensRevogados={}",
                    user.getId(), existing.getFamilyId(), revokedCount);
            throw new InvalidRefreshTokenException(
                    "Sessão invalidada por tentativa de reutilização de token. Faça login novamente.");
        }

        // Expiração absoluta da sessão
        if (now.isAfter(existing.getExpiresAt())) {
            revokeSingle(existing, now);
            throw new InvalidRefreshTokenException("Sessão expirada. Faça login novamente.");
        }

        // Expiração por inatividade
        Instant inactivityDeadline = existing.getLastUsedAt()
                .plus(authProperties.refreshToken().inactivityDays(), ChronoUnit.DAYS);
        if (now.isAfter(inactivityDeadline)) {
            revokeSingle(existing, now);
            throw new InvalidRefreshTokenException("Sessão expirada por inatividade. Faça login novamente.");
        }

        // Rotação: revoga o token atual e emite um novo na mesma família,
        // preservando o teto absoluto (expiresAt) da sessão original.
        revokeSingle(existing, now);
        String newRawToken = persistNewToken(user, existing.getFamilyId(), existing.getExpiresAt(), now);

        return new RotatedToken(newRawToken, user);
    }

    /**
     * Revoga a família do refresh token informado durante o logout.
     * Operação idempotente: tokens ausentes, inválidos ou já revogados são ignorados.
     *
     * @param rawRefreshToken token opaco enviado no logout
     */
    @Transactional
    public void revoke(String rawRefreshToken) {
        if (!StringUtils.hasText(rawRefreshToken)) {
            return;
        }

        String tokenHash = hashToken(rawRefreshToken);
        refreshTokenRepository.findWithLockByTokenHash(tokenHash).ifPresent(token -> {
            if (!token.isRevoked()) {
                refreshTokenRepository.revokeAllByFamilyId(token.getFamilyId(), clock.instant());
            }
        });
    }

    /**
     * Expurgo diário de refresh tokens cuja expiração absoluta já venceu há mais
     * de 7 dias, evitando crescimento ilimitado da tabela sem prejudicar a detecção
     * de reutilização de sessões ainda vigentes.
     */
    @Scheduled(cron = "0 0 3 * * *", zone = "${app.timezone:America/Sao_Paulo}")
    @Transactional
    public void purgeExpiredTokens() {
        Instant cutoff = clock.instant().minus(CLEANUP_RETENTION_DAYS, ChronoUnit.DAYS);
        int deleted = refreshTokenRepository.deleteExpiredBefore(cutoff);
        if (deleted > 0) {
            log.info("Limpeza agendada de refresh tokens concluída: {} registros removidos.", deleted);
        }
    }

    private String persistNewToken(UserModel user, UUID familyId, Instant expiresAt, Instant now) {
        String rawToken = generateOpaqueToken();
        String tokenHash = hashToken(rawToken);

        RefreshTokenModel entity = new RefreshTokenModel();
        entity.setUser(user);
        entity.setFamilyId(familyId);
        entity.setTokenHash(tokenHash);
        entity.setRevoked(false);
        entity.setExpiresAt(expiresAt);
        entity.setLastUsedAt(now);

        refreshTokenRepository.save(entity);
        return rawToken;
    }

    private void revokeSingle(RefreshTokenModel token, Instant now) {
        token.setRevoked(true);
        token.setRevokedAt(now);
        refreshTokenRepository.save(token);
    }

    private String generateOpaqueToken() {
        byte[] randomBytes = new byte[TOKEN_BYTE_LENGTH];
        secureRandom.nextBytes(randomBytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(randomBytes);
    }

    private String hashToken(String rawToken) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hashBytes = digest.digest(rawToken.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hashBytes);
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException("Algoritmo SHA-256 indisponível na JVM.", ex);
        }
    }
}
