package com.norte.norte_api.exception;

public class DuplicateUsernameException extends RuntimeException {

    public DuplicateUsernameException() {
        super("Já existe uma conta com este nome de usuário");
    }
}
