package com.norte.norte_api.security;

import java.util.Date;

import javax.crypto.SecretKey;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import io.jsonwebtoken.JwtException;
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

    private final SecretKey signingKey;
    private final long expirationMs;

    public JwtTokenProvider(@Value("${jwt.secret}") String secret, @Value("${jwt.expiration-ms}") long expirationMs) {
        if (expirationMs <= 0) {
            throw new IllegalArgumentException("JWT expiration must be positive");
        }

        this.signingKey = Keys.hmacShaKeyFor(Decoders.BASE64.decode(secret));
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
     * Extrai o subject (e-mail) de um token já validado.
     *
     * @param token JWT compacto
     * @return subject do token
     */
    public String extractSubject(String token) {
        return Jwts.parser()
                .verifyWith(signingKey)
                .build()
                .parseSignedClaims(token)
                .getPayload()
                .getSubject();
    }

    /**
     * Valida assinatura e expiração do token.
     *
     * @param token JWT compacto
     * @return {@code true} se o token for válido e não expirado
     */
    public boolean validateToken(String token) {
        try {
            Jwts.parser()
                    .verifyWith(signingKey)
                    .build()
                    .parseSignedClaims(token);
            return true;
        } catch (JwtException | IllegalArgumentException e) {
            // Token inválido, expirado, assinatura incorreta — todas as falhas tratadas
            // igualmente
            return false;
        }
    }
}
