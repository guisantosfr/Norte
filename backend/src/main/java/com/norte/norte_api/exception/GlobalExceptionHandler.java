package com.norte.norte_api.exception;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.TypeMismatchException;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.web.ErrorResponse;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.ServletWebRequest;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;
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
public class GlobalExceptionHandler extends ResponseEntityExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    // ─── 400 Bad Request ────────────────────────────────────────────────────────

    /**
     * Bean Validation falhou em campos do DTO ({@code @NotBlank}, {@code @Email}, etc.)
     * ou em validações de classe ({@code @PasswordMatches}).
     */
    @Override
    protected ResponseEntity<Object> handleMethodArgumentNotValid(
            MethodArgumentNotValidException ex,
            HttpHeaders headers,
            HttpStatusCode status,
            WebRequest request) {

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

        ApiErrorResponse body = ApiErrorResponse.validation(extractPath(request), allErrors);
        return handleExceptionInternal(ex, body, headers, HttpStatus.BAD_REQUEST, request);
    }

    /**
     * Corpo da requisição é JSON inválido ou tipo incompatível (ex.: string onde se espera número).
     */
    @Override
    protected ResponseEntity<Object> handleHttpMessageNotReadable(
            HttpMessageNotReadableException ex,
            HttpHeaders headers,
            HttpStatusCode status,
            WebRequest request) {

        ApiErrorResponse body = ApiErrorResponse.badRequest(extractPath(request),
                "O corpo da requisição está ausente ou mal formado.");
        return handleExceptionInternal(ex, body, headers, HttpStatus.BAD_REQUEST, request);
    }

    /**
     * Parâmetro de rota ou query com tipo inválido (ex.: UUID, data ou enum mal formado).
     */
    @Override
    protected ResponseEntity<Object> handleTypeMismatch(
            TypeMismatchException ex,
            HttpHeaders headers,
            HttpStatusCode status,
            WebRequest request) {

        String paramName = (ex instanceof MethodArgumentTypeMismatchException matme)
                ? matme.getName()
                : ex.getPropertyName();

        ApiErrorResponse body = ApiErrorResponse.badRequest(extractPath(request),
                "Parâmetro inválido: '" + paramName + "'.");
        return handleExceptionInternal(ex, body, headers, HttpStatus.BAD_REQUEST, request);
    }

    /**
     * Violação de regra de negócio ou combinação inválida de parâmetros.
     */
    @ExceptionHandler(BusinessRuleException.class)
    public ResponseEntity<ApiErrorResponse> handleBusinessRule(
            BusinessRuleException ex, HttpServletRequest request) {

        return ResponseEntity
                .badRequest()
                .body(ApiErrorResponse.badRequest(request.getRequestURI(), ex.getMessage()));
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
     * Recurso de domínio não encontrado (ou pertencente a outro usuário).
     */
    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ApiErrorResponse> handleResourceNotFound(
            ResourceNotFoundException ex, HttpServletRequest request) {

        return ResponseEntity
                .status(HttpStatus.NOT_FOUND)
                .body(ApiErrorResponse.notFound(request.getRequestURI(), ex.getMessage()));
    }

    /**
     * Rota requisitada não existe no servidor.
     */
    @Override
    protected ResponseEntity<Object> handleNoResourceFoundException(
            NoResourceFoundException ex,
            HttpHeaders headers,
            HttpStatusCode status,
            WebRequest request) {

        ApiErrorResponse body = ApiErrorResponse.notFound(extractPath(request),
                "O recurso solicitado não foi encontrado.");
        return handleExceptionInternal(ex, body, headers, HttpStatus.NOT_FOUND, request);
    }

    // ─── 409 Conflict ───────────────────────────────────────────────────────────

    @ExceptionHandler(DuplicateEmailException.class)
    public ResponseEntity<ApiErrorResponse> handleDuplicateEmail(
            DuplicateEmailException ex, HttpServletRequest request) {

        return ResponseEntity
                .status(HttpStatus.CONFLICT)
                .body(ApiErrorResponse.conflict(request.getRequestURI(), ex.getMessage()));
    }

    @ExceptionHandler(DuplicateCategoryNameException.class)
    public ResponseEntity<ApiErrorResponse> handleDuplicateCategoryName(
            DuplicateCategoryNameException ex, HttpServletRequest request) {

        return ResponseEntity
                .status(HttpStatus.CONFLICT)
                .body(ApiErrorResponse.conflict(request.getRequestURI(), ex.getMessage()));
    }

    // ─── Outras exceções padrão do Spring MVC ───────────────────────────────────

    /**
     * Garante que qualquer outra exceção padrão do Spring MVC tratada por
     * {@link ResponseEntityExceptionHandler} (ex.: 405 Method Not Allowed,
     * 415 Unsupported Media Type, parâmetros obrigatórios ausentes) também
     * retorne o envelope {@link ApiErrorResponse}.
     */
    @Override
    protected ResponseEntity<Object> handleExceptionInternal(
            Exception ex,
            Object body,
            HttpHeaders headers,
            HttpStatusCode statusCode,
            WebRequest request) {

        if (!(body instanceof ApiErrorResponse)) {
            HttpStatus httpStatus = HttpStatus.resolve(statusCode.value());
            if (httpStatus == null) {
                httpStatus = HttpStatus.INTERNAL_SERVER_ERROR;
            }
            String path = extractPath(request);
            if (httpStatus.is5xxServerError()) {
                String correlationId = UUID.randomUUID().toString();
                log.error("[{}] Erro inesperado em {}: {}", correlationId, path, ex.getMessage(), ex);
                body = ApiErrorResponse.internalError(path, correlationId);
            } else {
                String message = (ex instanceof ErrorResponse errorResponse && errorResponse.getBody().getDetail() != null)
                        ? errorResponse.getBody().getDetail()
                        : httpStatus.getReasonPhrase();
                body = new ApiErrorResponse(
                        Instant.now(),
                        httpStatus,
                        httpStatus.name(),
                        message,
                        path,
                        List.of());
            }
        }

        return super.handleExceptionInternal(ex, body, headers, statusCode, request);
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

    private String extractPath(WebRequest request) {
        if (request instanceof ServletWebRequest servletWebRequest) {
            return servletWebRequest.getRequest().getRequestURI();
        }
        return "";
    }
}
