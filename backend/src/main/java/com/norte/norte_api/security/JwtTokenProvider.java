package com.norte.norte_api.security;

import java.util.Date;
import java.util.Optional;

import javax.crypto.SecretKey;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.JwtParser;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;

/**
 * Responsável pela emissão e validação de tokens JWT.
 *
 * <p>
 * Usa HMAC-SHA256 (HS256) com uma chave simétrica lida de variável de ambiente.
 * A chave nunca é exposta em código-fonte.
 *
 * <p>
 * Claims incluídos no token:
 * <ul>
 * <li>{@code sub} — e-mail normalizado do usuário (identificador
 * principal)</li>
 * <li>{@code iat} — instante de emissão</li>
 * <li>{@code exp} — instante de expiração</li>
 * </ul>
 */
@Component
public class JwtTokenProvider {

    /** Tamanho mínimo exigido para chaves HS256 (RFC 7518, seção 3.2). */
    static final int MIN_KEY_BITS = 256;

    private static final String KEY_GENERATION_HINT = "Gere uma chave aleatória com: openssl rand -base64 32";

    private final SecretKey signingKey;
    private final JwtParser parser;
    private final long expirationMs;

    public JwtTokenProvider(@Value("${jwt.secret}") String secret, @Value("${jwt.expiration-ms}") long expirationMs) {
        if (expirationMs <= 0) {
            throw new IllegalArgumentException("JWT expiration must be positive");
        }

        this.signingKey = createSigningKey(secret);
        // JwtParser é imutável e thread-safe: construído uma única vez.
        this.parser = Jwts.parser().verifyWith(signingKey).build();
        this.expirationMs = expirationMs;
    }

    /**
     * Gera um JWT para o e-mail (subject) informado.
     *
     * @param email e-mail normalizado do usuário autenticado
     * @return token JWT compacto assinado
     */
    public String generateToken(String email) {
        long now = System.currentTimeMillis();
        return Jwts.builder()
                .subject(email)
                .issuedAt(new Date(now))
                .expiration(new Date(now + expirationMs))
                .signWith(signingKey, Jwts.SIG.HS256)
                .compact();
    }

    /**
     * Valida assinatura e expiração do token e, se válido, devolve o subject —
     * tudo em um único parsing.
     *
     * @param token JWT compacto
     * @return o subject (e-mail), ou vazio se o token for inválido, expirado,
     *         com assinatura incorreta ou sem subject
     */
    public Optional<String> extractSubjectIfValid(String token) {
        try {
            String subject = parser.parseSignedClaims(token).getPayload().getSubject();
            return StringUtils.hasText(subject) ? Optional.of(subject) : Optional.empty();
        } catch (JwtException | IllegalArgumentException e) {
            // Token inválido, expirado, assinatura incorreta — todas as falhas tratadas
            // igualmente
            return Optional.empty();
        }
    }

    /**
     * Decodifica e valida a chave de assinatura na inicialização, impedindo que a
     * aplicação suba com uma chave fraca.
     *
     * <p>
     * Não é possível medir a entropia real de uma chave a partir dela mesma; as
     * verificações abaixo detectam os erros mais comuns de geração:
     * <ul>
     * <li>valor ausente ou que não é Base64 válido;</li>
     * <li>menos de {@value #MIN_KEY_BITS} bits após a decodificação;</li>
     * <li>bytes que são todos texto ASCII imprimível — sinal de que uma senha ou
     * frase foi codificada em Base64, em vez de bytes aleatórios (para 32 bytes
     * aleatórios, a chance disso é ~10<sup>-14</sup>);</li>
     * <li>baixa variedade de bytes (ex.: valores repetidos).</li>
     * </ul>
     * As mensagens de erro nunca incluem o valor da chave.
     *
     * @param base64Secret chave codificada em Base64 (variável {@code JWT_SECRET})
     * @return chave HMAC pronta para uso
     * @throws IllegalStateException se a chave não atender aos requisitos
     */
    static SecretKey createSigningKey(String base64Secret) {
        if (!StringUtils.hasText(base64Secret)) {
            throw new IllegalStateException("jwt.secret (JWT_SECRET) não foi configurado. " + KEY_GENERATION_HINT);
        }

        byte[] keyBytes;
        try {
            keyBytes = Decoders.BASE64.decode(base64Secret.trim());
        } catch (RuntimeException e) {
            throw new IllegalStateException(
                    "jwt.secret (JWT_SECRET) deve estar codificado em Base64. " + KEY_GENERATION_HINT);
        }

        int bits = keyBytes.length * Byte.SIZE;
        if (bits < MIN_KEY_BITS) {
            throw new IllegalStateException(String.format(
                    "jwt.secret (JWT_SECRET) deve ter pelo menos %d bits após a decodificação, mas tem %d. %s",
                    MIN_KEY_BITS, bits, KEY_GENERATION_HINT));
        }

        if (isAllPrintableAscii(keyBytes)) {
            throw new IllegalStateException(
                    "jwt.secret (JWT_SECRET) parece ser um texto (senha ou frase) codificado em Base64, "
                            + "e não bytes aleatórios. " + KEY_GENERATION_HINT);
        }

        int minDistinctBytes = Math.min(keyBytes.length / 2, 128);
        if (countDistinctBytes(keyBytes) < minDistinctBytes) {
            throw new IllegalStateException(
                    "jwt.secret (JWT_SECRET) tem baixa variedade de bytes e não parece ter sido gerado "
                            + "aleatoriamente. " + KEY_GENERATION_HINT);
        }

        return Keys.hmacShaKeyFor(keyBytes);
    }

    private static boolean isAllPrintableAscii(byte[] bytes) {
        for (byte b : bytes) {
            if (b < 0x20 || b > 0x7E) {
                return false;
            }
        }
        return true;
    }

    private static int countDistinctBytes(byte[] bytes) {
        boolean[] seen = new boolean[256];
        int distinct = 0;
        for (byte b : bytes) {
            int index = b & 0xFF;
            if (!seen[index]) {
                seen[index] = true;
                distinct++;
            }
        }
        return distinct;
    }
}
