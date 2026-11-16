package com.norte.norte_api.exception;

import java.time.Instant;
import java.util.List;

import org.springframework.http.HttpStatus;

import com.fasterxml.jackson.annotation.JsonInclude;

/**
 * Envelope padronizado de resposta de erro da API.
 *
 * <p>
 * {@code fieldErrors} é omitido do JSON quando vazio ou nulo
 * (via {@link JsonInclude}), mantendo a resposta limpa para erros
 * que não são de validação de campo.
 *
 * @param timestamp   instante UTC do erro
 * @param status      código HTTP numérico
 * @param error       código de erro legível por máquina (ex.:
 *                    {@code "VALIDATION_ERROR"})
 * @param message     descrição legível por humano
 * @param path        caminho da requisição que originou o erro
 * @param fieldErrors lista de erros por campo (apenas para erros de validação)
 */
@JsonInclude(JsonInclude.Include.NON_EMPTY)
public record ApiErrorResponse(

                Instant timestamp,
                HttpStatus status,
                String error,
                String message,
                String path,
                List<FieldError> fieldErrors

) {

        /**
         * Erro associado a um campo específico do corpo da requisição.
         *
         * @param field   nome do campo que falhou na validação
         * @param message mensagem descritiva da violação
         */
        public record FieldError(String field, String message) {
        }

        // ─── Factory methods ────────────────────────────────────────────────────────

        /** Resposta para erros de validação de campo (400). */
        public static ApiErrorResponse validation(String path, List<FieldError> fieldErrors) {
                return new ApiErrorResponse(
                                Instant.now(),
                                HttpStatus.BAD_REQUEST,
                                "VALIDATION_ERROR",
                                "A requisição contém dados inválidos.",
                                path,
                                fieldErrors);
        }

        /** Resposta para requisições malformadas (400). */
        public static ApiErrorResponse badRequest(String path, String message) {
                return new ApiErrorResponse(
                                Instant.now(),
                                HttpStatus.BAD_REQUEST,
                                "BAD_REQUEST",
                                message,
                                path,
                                List.of());
        }

        /** Resposta para falhas de autenticação (401). */
        public static ApiErrorResponse unauthorized(String path, String message) {
                return new ApiErrorResponse(
                                Instant.now(),
                                HttpStatus.UNAUTHORIZED,
                                "UNAUTHORIZED",
                                message,
                                path,
                                List.of());
        }

        /** Resposta para acesso negado (403). */
        public static ApiErrorResponse forbidden(String path) {
                return new ApiErrorResponse(
                                Instant.now(),
                                HttpStatus.FORBIDDEN,
                                "FORBIDDEN",
                                "Acesso negado.",
                                path,
                                List.of());
        }

        /** Resposta para recurso não encontrado (404). */
        public static ApiErrorResponse notFound(String path, String message) {
                return new ApiErrorResponse(
                                Instant.now(),
                                HttpStatus.NOT_FOUND,
                                "NOT_FOUND",
                                message,
                                path,
                                List.of());
        }

        /** Resposta para conflitos de unicidade (409). */
        public static ApiErrorResponse conflict(String path, String message) {
                return new ApiErrorResponse(
                                Instant.now(),
                                HttpStatus.CONFLICT,
                                "CONFLICT",
                                message,
                                path,
                                List.of());
        }

        /** Resposta para excesso de requisições em rotas com rate limit (429). */
        public static ApiErrorResponse tooManyRequests(String path, String message) {
                return new ApiErrorResponse(
                                Instant.now(),
                                HttpStatus.TOO_MANY_REQUESTS,
                                "TOO_MANY_REQUESTS",
                                message,
                                path,
                                List.of());
        }

        /** Resposta para erros internos inesperados (500). Nunca expõe detalhes. */
        public static ApiErrorResponse internalError(String path, String correlationId) {
                return new ApiErrorResponse(
                                Instant.now(),
                                HttpStatus.INTERNAL_SERVER_ERROR,
                                "INTERNAL_ERROR",
                                "Ocorreu um erro inesperado. Por favor, tente novamente mais tarde."
                                                + (correlationId != null ? " [ref: " + correlationId + "]" : ""),
                                path,
                                List.of());
        }
}
