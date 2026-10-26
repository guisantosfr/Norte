package com.norte.norte_api.exception;

import java.util.Map;

public record ApiErrorResponse(
        int status,
        String message,
        Map<String, String> errors
) {
}
