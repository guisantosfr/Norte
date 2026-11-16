package com.norte.norte_api.exception;

/**
 * Exceção lançada quando um refresh token é inválido, expirado, inativo,
 * revogado ou quando há detecção de reutilização de token antigo.
 */
public class InvalidRefreshTokenException extends RuntimeException {

    public InvalidRefreshTokenException(String message) {
        super(message);
    }
}
