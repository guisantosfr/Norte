package com.norte.norte_api.exception;

public class DuplicateCategoryNameException extends RuntimeException {
    public DuplicateCategoryNameException() {
        super("Já existe uma categoria cadastrada com este nome.");
    }
}
