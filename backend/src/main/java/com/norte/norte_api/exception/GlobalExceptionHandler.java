package com.norte.norte_api.exception;

import java.util.List;
import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.servlet.resource.NoResourceFoundException;

import jakarta.servlet.http.HttpServletRequest;

/**
 * Tratamento centralizado de exceções para toda a API.
 *
 * <p>Garante que todas as respostas de erro seguem o envelope {@link ApiErrorResponse},
 * com status HTTP correto e sem vazar detalhes internos (stack traces, consultas SQL,
 * configurações sensíveis).
 *
 * <p>Exceções do filtro do Spring Security (401/403 em rotas protegidas) <em>não</em>
 * chegam até aqui — são tratadas em {@code JwtAuthenticationEntryPoint} e
 * {@code JwtAccessDeniedHandler}, que escrevem o mesmo formato de resposta.
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    // ─── 400 Bad Request ────────────────────────────────────────────────────────

    /**
     * Bean Validation falhou em campos do DTO ({@code @NotBlank}, {@code @Email}, etc.)
     * ou em validações de classe ({@code @PasswordMatches}).
     */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiErrorResponse> handleValidation(
            MethodArgumentNotValidException ex, HttpServletRequest request) {

        List<ApiErrorResponse.FieldError> fieldErrors = ex.getBindingResult()
                .getFieldErrors()
                .stream()
                .map(fe -> new ApiErrorResponse.FieldError(fe.getField(), fe.getDefaultMessage()))
                .toList();

        // Erros globais (nível de classe, ex.: @PasswordMatches) tratados como campo virtual
        List<ApiErrorResponse.FieldError> globalErrors = ex.getBindingResult()
                .getGlobalErrors()
                .stream()
                .map(ge -> new ApiErrorResponse.FieldError(ge.getObjectName(), ge.getDefaultMessage()))
                .toList();

        List<ApiErrorResponse.FieldError> allErrors = new java.util.ArrayList<>(fieldErrors);
        allErrors.addAll(globalErrors);

        return ResponseEntity
                .badRequest()
                .body(ApiErrorResponse.validation(request.getRequestURI(), allErrors));
    }

    /**
     * Corpo da requisição é JSON inválido ou tipo incompatível (ex.: string onde se espera número).
     */
    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ApiErrorResponse> handleNotReadable(
            HttpMessageNotReadableException ex, HttpServletRequest request) {

        return ResponseEntity
                .badRequest()
                .body(ApiErrorResponse.badRequest(request.getRequestURI(),
                        "O corpo da requisição está ausente ou mal formado."));
    }

    // ─── 401 Unauthorized ───────────────────────────────────────────────────────

    /**
     * Credenciais de login inválidas (e-mail não encontrado ou senha incorreta).
     * A mensagem é intencionalmente genérica — não revela se o e-mail existe.
     */
    @ExceptionHandler(BadCredentialsException.class)
    public ResponseEntity<ApiErrorResponse> handleBadCredentials(HttpServletRequest request) {
        return ResponseEntity
                .status(HttpStatus.UNAUTHORIZED)
                .body(ApiErrorResponse.unauthorized(request.getRequestURI(),
                        "Credenciais inválidas."));
    }

    // ─── 404 Not Found ──────────────────────────────────────────────────────────

    /**
     * Rota requisitada não existe no servidor.
     */
    @ExceptionHandler(NoResourceFoundException.class)
    public ResponseEntity<ApiErrorResponse> handleNoResourceFound(
            NoResourceFoundException ex, HttpServletRequest request) {

        return ResponseEntity
                .status(HttpStatus.NOT_FOUND)
                .body(ApiErrorResponse.notFound(request.getRequestURI(),
                        "O recurso solicitado não foi encontrado."));
    }

    // ─── 409 Conflict ───────────────────────────────────────────────────────────

    @ExceptionHandler(DuplicateEmailException.class)
    public ResponseEntity<ApiErrorResponse> handleDuplicateEmail(
            DuplicateEmailException ex, HttpServletRequest request) {

        return ResponseEntity
                .status(HttpStatus.CONFLICT)
                .body(ApiErrorResponse.conflict(request.getRequestURI(), ex.getMessage()));
    }

    @ExceptionHandler(DuplicateUsernameException.class)
    public ResponseEntity<ApiErrorResponse> handleDuplicateUsername(
            DuplicateUsernameException ex, HttpServletRequest request) {

        return ResponseEntity
                .status(HttpStatus.CONFLICT)
                .body(ApiErrorResponse.conflict(request.getRequestURI(), ex.getMessage()));
    }

    // ─── 500 Internal Server Error ───────────────────────────────────────────────

    /**
     * Qualquer exceção não tratada explicitamente.
     *
     * <p>Registra os detalhes completos no log com um ID de correlação gerado
     * localmente. O ID é incluído na resposta para facilitar rastreamento sem
     * expor a causa raiz ao cliente.
     */
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiErrorResponse> handleUnexpected(
            Exception ex, HttpServletRequest request) {

        String correlationId = UUID.randomUUID().toString();
        log.error("[{}] Erro inesperado em {} {}: {}",
                correlationId,
                request.getMethod(),
                request.getRequestURI(),
                ex.getMessage(),
                ex);

        return ResponseEntity
                .status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ApiErrorResponse.internalError(request.getRequestURI(), correlationId));
    }
}
