package com.norte.norte_api.repository;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.norte.norte_api.models.RefreshTokenModel;

import jakarta.persistence.LockModeType;

public interface RefreshTokenRepository extends JpaRepository<RefreshTokenModel, UUID> {

    /**
     * Busca o token pelo hash adquirindo lock pessimista de escrita para evitar
     * condição de corrida caso duas requisições simultâneas tentem rotacionar o
     * mesmo token ao mesmo tempo.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT r FROM RefreshTokenModel r WHERE r.tokenHash = :tokenHash")
    Optional<RefreshTokenModel> findWithLockByTokenHash(@Param("tokenHash") String tokenHash);

    /**
     * Revoga todos os tokens ativos pertencentes à mesma família (usado tanto na
     * detecção de reutilização quanto no logout).
     */
    @Modifying
    @Query("UPDATE RefreshTokenModel r SET r.revoked = true, r.revokedAt = :revokedAt WHERE r.familyId = :familyId AND r.revoked = false")
    int revokeAllByFamilyId(@Param("familyId") UUID familyId, @Param("revokedAt") Instant revokedAt);

    /**
     * Remove registros cuja expiração absoluta já passou há tempo suficiente,
     * mantendo tokens revogados apenas enquanto sua família ainda puder ser alvo
     * de reutilização.
     */
    @Modifying
    @Query("DELETE FROM RefreshTokenModel r WHERE r.expiresAt < :cutoff")
    int deleteExpiredBefore(@Param("cutoff") Instant cutoff);
}
