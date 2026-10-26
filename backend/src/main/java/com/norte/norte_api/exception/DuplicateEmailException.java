package com.norte.norte_api.exception;

public class DuplicateEmailException extends RuntimeException {

    public DuplicateEmailException() {
        super("Já existe uma conta com este e-mail");
    }
}
