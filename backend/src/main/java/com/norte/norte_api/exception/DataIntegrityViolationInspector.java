package com.norte.norte_api.exception;

import java.sql.SQLException;
import java.util.ArrayList;
import java.util.Collections;
import java.util.IdentityHashMap;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import org.postgresql.util.PSQLException;
import org.postgresql.util.ServerErrorMessage;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Component;

/**
 * Interpreta {@link DataIntegrityViolationException} a partir dos metadados
 * estruturados do driver JDBC, sem depender do texto da mensagem de erro.
 *
 * <p>Mensagens do PostgreSQL podem variar conforme versão e {@code lc_messages}
 * (idioma do servidor), por isso a identificação usa:
 * <ul>
 * <li>o SQLState {@value #UNIQUE_VIOLATION_SQL_STATE} ({@code unique_violation});</li>
 * <li>o nome da constraint/índice informado no campo {@code constraint} do
 * {@link ServerErrorMessage} de {@link PSQLException}.</li>
 * </ul>
 */
@Component
public class DataIntegrityViolationInspector {

    /** SQLState padrão para violação de unicidade no PostgreSQL. */
    static final String UNIQUE_VIOLATION_SQL_STATE = "23505";

    /**
     * Indica se a exceção representa uma violação de unicidade da constraint
     * (ou índice único) informada.
     *
     * @param ex             exceção lançada pelo Spring Data / JPA
     * @param constraintName nome da constraint ou índice único esperado
     * @return {@code true} se o SQLState for {@code 23505} e a constraint violada
     *         corresponder a {@code constraintName}
     */
    public boolean isUniqueViolation(DataIntegrityViolationException ex, String constraintName) {
        return findSqlException(ex)
                .filter(sqlEx -> UNIQUE_VIOLATION_SQL_STATE.equals(sqlEx.getSQLState()))
                .flatMap(DataIntegrityViolationInspector::extractConstraintName)
                .map(constraintName::equalsIgnoreCase)
                .orElse(false);
    }

    /**
     * Localiza a {@link SQLException} de origem percorrendo a cadeia de causas
     * (e as {@code nextException}, usadas por operações em lote).
     *
     * <p>Dá preferência a uma {@link PSQLException} com {@link ServerErrorMessage},
     * pois é ela que carrega o nome da constraint.
     */
    private static Optional<SQLException> findSqlException(Throwable root) {
        List<SQLException> candidates = new ArrayList<>();
        Set<Throwable> visited = Collections.newSetFromMap(new IdentityHashMap<>());

        for (Throwable current = root; current != null && visited.add(current); current = current.getCause()) {
            if (current instanceof SQLException sqlEx) {
                for (SQLException next = sqlEx; next != null; next = next.getNextException()) {
                    candidates.add(next);
                }
            }
        }

        return candidates.stream()
                .filter(sqlEx -> sqlEx instanceof PSQLException psql && psql.getServerErrorMessage() != null)
                .findFirst()
                .or(() -> candidates.stream().filter(sqlEx -> sqlEx.getSQLState() != null).findFirst());
    }

    private static Optional<String> extractConstraintName(SQLException ex) {
        if (ex instanceof PSQLException psql) {
            return Optional.ofNullable(psql.getServerErrorMessage())
                    .map(ServerErrorMessage::getConstraint);
        }
        return Optional.empty();
    }
}
