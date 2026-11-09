package com.norte.norte_api.exception;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.TypeMismatchException;
import org.springframework.core.MethodParameter;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.util.StringUtils;
import org.springframework.validation.Errors;
import org.springframework.validation.method.ParameterErrors;
import org.springframework.validation.method.ParameterValidationResult;
import org.springframework.web.ErrorResponse;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.ServletWebRequest;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.method.annotation.HandlerMethodValidationException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;
import org.springframework.web.servlet.resource.NoResourceFoundException;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.ConstraintViolationException;
import jakarta.validation.ElementKind;
import jakarta.validation.Path;

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

    /** Campo usado para restrições que envolvem vários parâmetros ao mesmo tempo. */
    private static final String CROSS_PARAMETER_FIELD = "parameters";

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

        ApiErrorResponse body = ApiErrorResponse.validation(extractPath(request), toFieldErrors(ex.getBindingResult()));
        return handleExceptionInternal(ex, body, headers, HttpStatus.BAD_REQUEST, request);
    }

    /**
     * Validação nativa de métodos do Spring MVC (6.1+): restrições aplicadas
     * diretamente em parâmetros do controller, como
     * {@code @RequestParam @Min(1) int page} ou {@code @PathVariable @Size(max = 50)}.
     *
     * <p>
     * Não é a mesma coisa que {@link MethodArgumentNotValidException}: quando o
     * método possui restrições diretas em parâmetros, as falhas de um
     * {@code @Valid @RequestBody} no mesmo método também chegam por aqui, como
     * {@link ParameterErrors}.
     *
     * <p>
     * Falhas na validação do <em>valor de retorno</em> indicam erro do servidor e
     * seguem como 500.
     */
    @Override
    protected ResponseEntity<Object> handleHandlerMethodValidationException(
            HandlerMethodValidationException ex,
            HttpHeaders headers,
            HttpStatusCode status,
            WebRequest request) {

        if (ex.isForReturnValue()) {
            return handleExceptionInternal(ex, null, headers, HttpStatus.INTERNAL_SERVER_ERROR, request);
        }

        List<ApiErrorResponse.FieldError> errors = new ArrayList<>();

        for (ParameterValidationResult result : ex.getParameterValidationResults()) {
            if (result instanceof ParameterErrors parameterErrors) {
                // Objeto validado com @Valid (ex.: @RequestBody): mesmo formato do
                // MethodArgumentNotValidException
                errors.addAll(toFieldErrors(parameterErrors));
            } else {
                String field = resolveParameterName(result);
                result.getResolvableErrors().forEach(error -> errors.add(
                        new ApiErrorResponse.FieldError(field, error.getDefaultMessage())));
            }
        }

        ex.getCrossParameterValidationResults().forEach(error -> errors.add(
                new ApiErrorResponse.FieldError(CROSS_PARAMETER_FIELD, error.getDefaultMessage())));

        ApiErrorResponse body = ApiErrorResponse.validation(extractPath(request), errors);
        return handleExceptionInternal(ex, body, headers, HttpStatus.BAD_REQUEST, request);
    }

    /**
     * Violações de Bean Validation fora do binding do Spring MVC, como métodos de
     * beans anotados com {@code @Validated} (serviços ou controllers) validados
     * pelo {@code MethodValidationPostProcessor}.
     *
     * <p>
     * Violações no <em>valor de retorno</em> indicam erro do servidor e seguem
     * como 500.
     */
    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<ApiErrorResponse> handleConstraintViolation(
            ConstraintViolationException ex, HttpServletRequest request) {

        boolean returnValueViolation = ex.getConstraintViolations().stream()
                .anyMatch(violation -> containsNode(violation.getPropertyPath(), ElementKind.RETURN_VALUE));
        if (returnValueViolation) {
            return handleUnexpected(ex, request);
        }

        List<ApiErrorResponse.FieldError> errors = ex.getConstraintViolations().stream()
                .map(violation -> new ApiErrorResponse.FieldError(
                        resolveViolationField(violation.getPropertyPath()), violation.getMessage()))
                .sorted(Comparator.comparing(ApiErrorResponse.FieldError::field))
                .toList();

        return ResponseEntity
                .badRequest()
                .body(ApiErrorResponse.validation(request.getRequestURI(), errors));
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

    // ─── Auxiliares de validação ────────────────────────────────────────────────

    /**
     * Converte erros de binding em {@link ApiErrorResponse.FieldError}.
     * Erros globais (nível de classe) usam o nome do objeto como campo virtual.
     */
    private static List<ApiErrorResponse.FieldError> toFieldErrors(Errors errors) {
        List<ApiErrorResponse.FieldError> result = new ArrayList<>();
        errors.getFieldErrors().forEach(fe -> result.add(
                new ApiErrorResponse.FieldError(fe.getField(), fe.getDefaultMessage())));
        errors.getGlobalErrors().forEach(ge -> result.add(
                new ApiErrorResponse.FieldError(ge.getObjectName(), ge.getDefaultMessage())));
        return result;
    }

    /**
     * Nome do parâmetro como o cliente o conhece: o nome declarado em
     * {@code @RequestParam}, {@code @PathVariable} ou {@code @RequestHeader} e,
     * na falta dele, o nome do parâmetro Java. Inclui o índice/chave quando a
     * restrição está em um elemento de coleção ou mapa.
     */
    private static String resolveParameterName(ParameterValidationResult result) {
        MethodParameter parameter = result.getMethodParameter();

        String name = firstNonBlank(
                annotationName(parameter.getParameterAnnotation(RequestParam.class)),
                annotationName(parameter.getParameterAnnotation(PathVariable.class)),
                annotationName(parameter.getParameterAnnotation(RequestHeader.class)),
                parameter.getParameterName(),
                "arg" + parameter.getParameterIndex());

        if (result.getContainerIndex() != null) {
            return name + "[" + result.getContainerIndex() + "]";
        }
        if (result.getContainerKey() != null) {
            return name + "[" + result.getContainerKey() + "]";
        }
        return name;
    }

    private static String annotationName(RequestParam annotation) {
        return annotation == null ? null : firstNonBlank(annotation.name(), annotation.value());
    }

    private static String annotationName(PathVariable annotation) {
        return annotation == null ? null : firstNonBlank(annotation.name(), annotation.value());
    }

    private static String annotationName(RequestHeader annotation) {
        return annotation == null ? null : firstNonBlank(annotation.name(), annotation.value());
    }

    private static String firstNonBlank(String... candidates) {
        for (String candidate : candidates) {
            if (StringUtils.hasText(candidate)) {
                return candidate;
            }
        }
        return null;
    }

    /**
     * Converte o {@link Path} de uma violação no nome de campo exposto ao
     * cliente, descartando o nome do método.
     *
     * <ul>
     * <li>{@code findAll.page} → {@code page}</li>
     * <li>{@code create.dto.name} → {@code name} (mesmo formato dos erros de
     * {@code @RequestBody})</li>
     * <li>{@code create.dto.items[0].name} → {@code items[0].name}</li>
     * <li>{@code create.tags[2].<list element>} → {@code tags[2]}</li>
     * </ul>
     */
    private static String resolveViolationField(Path path) {
        String parameterName = null;
        StringBuilder property = new StringBuilder();

        for (Path.Node node : path) {
            ElementKind kind = node.getKind();

            if (kind == ElementKind.METHOD || kind == ElementKind.CONSTRUCTOR
                    || kind == ElementKind.CROSS_PARAMETER) {
                continue;
            }
            if (kind == ElementKind.PARAMETER) {
                parameterName = node.getName();
                continue;
            }

            if (node.isInIterable()) {
                if (property.isEmpty() && parameterName != null) {
                    property.append(parameterName);
                }
                Object position = node.getIndex() != null ? node.getIndex() : node.getKey();
                property.append('[').append(position != null ? position : "").append(']');
            }

            String name = node.getName();
            // Nós sintéticos como "<list element>" não fazem parte do nome do campo
            if (name != null && !name.startsWith("<")) {
                if (!property.isEmpty()) {
                    property.append('.');
                }
                property.append(name);
            }
        }

        if (!property.isEmpty()) {
            return property.toString();
        }
        return parameterName != null ? parameterName : CROSS_PARAMETER_FIELD;
    }

    private static boolean containsNode(Path path, ElementKind kind) {
        for (Path.Node node : path) {
            if (node.getKind() == kind) {
                return true;
            }
        }
        return false;
    }
}
