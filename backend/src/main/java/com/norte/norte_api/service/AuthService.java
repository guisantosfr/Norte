package com.norte.norte_api.service;

import java.util.Locale;
import java.util.UUID;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.norte.norte_api.dto.AuthResponseDTO;
import com.norte.norte_api.dto.LoginRequestDTO;
import com.norte.norte_api.dto.LogoutRequestDTO;
import com.norte.norte_api.dto.RefreshTokenRequestDTO;
import com.norte.norte_api.dto.UserRequestDTO;
import com.norte.norte_api.dto.UserResponseDTO;
import com.norte.norte_api.exception.DataIntegrityViolationInspector;
import com.norte.norte_api.exception.DuplicateEmailException;
import com.norte.norte_api.exception.InvalidRefreshTokenException;
import com.norte.norte_api.exception.ResourceNotFoundException;
import com.norte.norte_api.models.UserModel;
import com.norte.norte_api.repository.UserRepository;
import com.norte.norte_api.security.JwtTokenProvider;
import com.norte.norte_api.service.RefreshTokenService.RotatedToken;

/**
 * Serviço responsável pelo fluxo de autenticação.
 *
 * <p>
 * Erros de credenciais — e-mail não encontrado ou senha incorreta — são
 * tratados de forma idêntica pelo {@code DaoAuthenticationProvider}: ambos lançam
 * {@link BadCredentialsException}, evitando user enumeration (não revela se o
 * e-mail existe).
 */
@Service
public class AuthService {

    private static final String INVALID_CREDENTIALS_MSG = "Credenciais inválidas";
    private static final String USER_NOT_FOUND_MSG = "Usuário não encontrado.";
    private static final String USERS_EMAIL_UNIQUE_INDEX = "uk_users_email";

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;
    private final AuthenticationManager authenticationManager;
    private final DataIntegrityViolationInspector integrityViolationInspector;
    private final RefreshTokenService refreshTokenService;

    public AuthService(UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            JwtTokenProvider jwtTokenProvider,
            AuthenticationManager authenticationManager,
            DataIntegrityViolationInspector integrityViolationInspector,
            RefreshTokenService refreshTokenService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtTokenProvider = jwtTokenProvider;
        this.authenticationManager = authenticationManager;
        this.integrityViolationInspector = integrityViolationInspector;
        this.refreshTokenService = refreshTokenService;
    }

    /**
     * Cadastra um novo usuário e já emite o par de tokens (access JWT + refresh token),
     * permitindo que o cliente siga autenticado sem precisar chamar {@code /auth/login}
     * em seguida.
     *
     * @param requestDTO dados de cadastro
     * @return resposta com tokens de sessão e dados públicos do usuário criado
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
            // caiam neste catch antes de emitirmos os tokens.
            UserModel savedUser = userRepository.saveAndFlush(user);
            String accessToken = jwtTokenProvider.generateToken(savedUser.getEmail());
            String refreshToken = refreshTokenService.createRefreshToken(savedUser);
            return AuthResponseDTO.of(accessToken, refreshToken, UserResponseDTO.from(savedUser));
        } catch (DataIntegrityViolationException ex) {
            if (integrityViolationInspector.isUniqueViolation(ex, USERS_EMAIL_UNIQUE_INDEX)) {
                throw new DuplicateEmailException();
            }
            throw ex;
        }
    }

    /**
     * Autentica o usuário via {@link AuthenticationManager} e emite o par de tokens
     * (access JWT + refresh token).
     *
     * <p>A verificação de senha é feita pelo {@code DaoAuthenticationProvider},
     * que trabalha com um {@code UserDetails} próprio do fluxo de login (com o
     * hash da senha). O {@code UserPrincipal}, sem senha, é usado apenas pelo
     * filtro JWT nas requisições autenticadas.
     *
     * @param loginRequest credenciais de entrada
     * @return resposta com tokens de sessão e dados públicos do usuário
     * @throws BadCredentialsException se o e-mail não for encontrado ou a senha não
     *                                 conferir
     */
    public AuthResponseDTO login(LoginRequestDTO loginRequest) {
        String email = normalizeEmail(loginRequest.email());

        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(email, loginRequest.password()));

        UserModel user = userRepository.findByEmailIgnoreCase(authentication.getName())
                .orElseThrow(() -> new BadCredentialsException(INVALID_CREDENTIALS_MSG));

        String accessToken = jwtTokenProvider.generateToken(user.getEmail());
        String refreshToken = refreshTokenService.createRefreshToken(user);
        UserResponseDTO userResponse = UserResponseDTO.from(user);

        return AuthResponseDTO.of(accessToken, refreshToken, userResponse);
    }

    /**
     * Renova a sessão rotacionando o refresh token e emitindo um novo access JWT.
     *
     * <p>{@code noRollbackFor = InvalidRefreshTokenException.class} garante que a
     * revogação em cascata da família em caso de reutilização seja persistida.
     *
     * @param request payload com o refresh token atual
     * @return novo par de tokens e dados do usuário
     */
    @Transactional(noRollbackFor = InvalidRefreshTokenException.class)
    public AuthResponseDTO refresh(RefreshTokenRequestDTO request) {
        RotatedToken rotated = refreshTokenService.rotate(request.refreshToken());
        UserModel user = rotated.user();

        String newAccessToken = jwtTokenProvider.generateToken(user.getEmail());
        return AuthResponseDTO.of(newAccessToken, rotated.rawRefreshToken(), UserResponseDTO.from(user));
    }

    /**
     * Revoga a família do refresh token informado para encerrar a sessão no servidor.
     *
     * @param request payload opcional contendo o refresh token
     */
    @Transactional
    public void logout(LogoutRequestDTO request) {
        if (request != null) {
            refreshTokenService.revoke(request.refreshToken());
        }
    }

    /**
     * Retorna os dados públicos do usuário autenticado.
     *
     * @param userId identificador vindo do {@code UserPrincipal} do contexto de
     *               segurança — nunca de um parâmetro fornecido pelo cliente
     * @return dados públicos do usuário
     * @throws ResourceNotFoundException se o usuário não existir mais
     */
    public UserResponseDTO getCurrentUser(UUID userId) {
        return userRepository.findById(userId)
                .map(UserResponseDTO::from)
                .orElseThrow(() -> new ResourceNotFoundException(USER_NOT_FOUND_MSG));
    }

    private static String normalizeEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }
}
