package com.norte.norte_api.service;

import java.util.Locale;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import com.norte.norte_api.dto.AuthResponseDTO;
import com.norte.norte_api.dto.LoginRequestDTO;
import com.norte.norte_api.dto.UserRequestDTO;
import com.norte.norte_api.dto.UserResponseDTO;
import com.norte.norte_api.exception.DataIntegrityViolationInspector;
import com.norte.norte_api.exception.DuplicateEmailException;
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
 * de forma idêntica pelo {@code DaoAuthenticationProvider}: ambos lançam
 * {@link BadCredentialsException}, evitando user enumeration (não revela se o
 * e-mail existe).
 */
@Service
public class AuthService {

    private static final String INVALID_CREDENTIALS_MSG = "Credenciais inválidas";
    private static final String USERS_EMAIL_UNIQUE_INDEX = "uk_users_email";

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;
    private final AuthenticationManager authenticationManager;
    private final DataIntegrityViolationInspector integrityViolationInspector;

    public AuthService(UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            JwtTokenProvider jwtTokenProvider,
            AuthenticationManager authenticationManager,
            DataIntegrityViolationInspector integrityViolationInspector) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtTokenProvider = jwtTokenProvider;
        this.authenticationManager = authenticationManager;
        this.integrityViolationInspector = integrityViolationInspector;
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
        user.setEmail(email);
        user.setPassword(passwordEncoder.encode(requestDTO.password()));

        try {
            // saveAndFlush força o INSERT aqui, para que violações de unicidade
            // caiam neste catch antes de emitirmos o token.
            UserModel savedUser = userRepository.saveAndFlush(user);
            String token = jwtTokenProvider.generateToken(savedUser.getEmail());
            return AuthResponseDTO.of(token, UserResponseDTO.from(savedUser));
        } catch (DataIntegrityViolationException ex) {
            if (integrityViolationInspector.isUniqueViolation(ex, USERS_EMAIL_UNIQUE_INDEX)) {
                throw new DuplicateEmailException();
            }
            throw ex;
        }
    }

    /**
     * Autentica o usuário via {@link AuthenticationManager} e emite um token JWT.
     *
     * <p>A verificação de senha é feita pelo {@code DaoAuthenticationProvider},
     * que trabalha com um {@code UserDetails} próprio do fluxo de login (com o
     * hash da senha). O {@code UserPrincipal}, sem senha, é usado apenas pelo
     * filtro JWT nas requisições autenticadas.
     *
     * @param loginRequest credenciais de entrada
     * @return resposta com token Bearer e dados públicos do usuário
     * @throws BadCredentialsException se o e-mail não for encontrado ou a senha não
     *                                 conferir
     */
    public AuthResponseDTO login(LoginRequestDTO loginRequest) {
        String email = normalizeEmail(loginRequest.email());

        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(email, loginRequest.password()));

        UserModel user = userRepository.findByEmailIgnoreCase(authentication.getName())
                .orElseThrow(() -> new BadCredentialsException(INVALID_CREDENTIALS_MSG));

        String token = jwtTokenProvider.generateToken(user.getEmail());
        UserResponseDTO userResponse = UserResponseDTO.from(user);

        return AuthResponseDTO.of(token, userResponse);
    }

    private static String normalizeEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }
}
