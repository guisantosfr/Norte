package com.norte.norte_api.service;

import java.util.Locale;
import java.util.Optional;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.stereotype.Service;

import com.norte.norte_api.dto.AuthResponseDTO;
import com.norte.norte_api.dto.LoginRequestDTO;
import com.norte.norte_api.dto.UserRequestDTO;
import com.norte.norte_api.dto.UserResponseDTO;
import com.norte.norte_api.exception.DuplicateEmailException;
import com.norte.norte_api.exception.DuplicateUsernameException;
import com.norte.norte_api.models.UserModel;
import com.norte.norte_api.repository.UserRepository;
import com.norte.norte_api.security.JwtTokenProvider;

import jakarta.transaction.Transactional;

/**
 * Serviço responsável pelo fluxo de autenticação.
 *
 * <p>
 * Erros de credenciais — e-mail não encontrado ou senha incorreta — são
 * tratados
 * de forma idêntica: ambos lançam {@link BadCredentialsException} com a mesma
 * mensagem
 * genérica, evitando user enumeration (não revela se o e-mail existe).
 */
@Service
public class AuthService {

    private static final String INVALID_CREDENTIALS_MSG = "Credenciais inválidas";

    private final UserRepository userRepository;
    private final org.springframework.security.crypto.password.PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;

    public AuthService(UserRepository userRepository,
            org.springframework.security.crypto.password.PasswordEncoder passwordEncoder,
            JwtTokenProvider jwtTokenProvider) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtTokenProvider = jwtTokenProvider;
    }

    /**
     * Cadastra um novo usuário e já emite um token JWT, permitindo que o cliente
     * siga autenticado sem precisar chamar {@code /auth/login} em seguida.
     *
     * @param requestDTO dados de cadastro
     * @return resposta com token Bearer e dados públicos do usuário criado
     */
    @Transactional
    public AuthResponseDTO register(UserRequestDTO requestDTO) {
        String email = normalizeEmail(requestDTO.email());

        if (userRepository.existsByEmailIgnoreCase(email)) {
            throw new DuplicateEmailException();
        }

        UserModel user = new UserModel();
        user.setName(requestDTO.name());
        user.setUsername(requestDTO.username());
        user.setEmail(email);
        user.setPassword(passwordEncoder.encode(requestDTO.password()));

        try {
            // saveAndFlush força o INSERT aqui, para que violações de unicidade
            // caiam neste catch antes de emitirmos o token.
            UserModel savedUser = userRepository.saveAndFlush(user);
            String token = jwtTokenProvider.generateToken(savedUser.getEmail());
            return AuthResponseDTO.of(token, UserResponseDTO.from(savedUser));
        } catch (DataIntegrityViolationException ex) {
            if (isConstraintViolation(ex, "uk_users_email")) {
                throw new DuplicateEmailException();
            }
            if (isConstraintViolation(ex, "users_username_key") || isConstraintViolation(ex, "username")) {
                throw new DuplicateUsernameException();
            }
            throw ex;
        }
    }

    /**
     * Autentica o usuário e emite um token JWT.
     *
     * @param loginRequest credenciais de entrada
     * @return resposta com token Bearer e dados públicos do usuário
     * @throws BadCredentialsException se o e-mail não for encontrado ou a senha não
     *                                 conferir
     */
    public AuthResponseDTO login(LoginRequestDTO loginRequest) {
        String email = normalizeEmail(loginRequest.email());

        UserModel user = userRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new BadCredentialsException(INVALID_CREDENTIALS_MSG));

        if (!passwordEncoder.matches(loginRequest.password(), user.getPassword())) {
            throw new BadCredentialsException(INVALID_CREDENTIALS_MSG);
        }

        String token = jwtTokenProvider.generateToken(user.getEmail());
        UserResponseDTO userResponse = UserResponseDTO.from(user);

        return AuthResponseDTO.of(token, userResponse);
    }

    private static String normalizeEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }

    private static boolean isConstraintViolation(DataIntegrityViolationException ex, String constraintHint) {
        String message = Optional.ofNullable(ex.getMostSpecificCause())
                .map(Throwable::getMessage)
                .orElseGet(ex::getMessage);
        return message != null && message.toLowerCase(Locale.ROOT).contains(constraintHint.toLowerCase(Locale.ROOT));
    }
}
