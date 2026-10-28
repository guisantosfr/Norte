package com.norte.norte_api.controller;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.norte.norte_api.dto.AuthResponseDTO;
import com.norte.norte_api.dto.LoginRequestDTO;
import com.norte.norte_api.dto.UserRequestDTO;
import com.norte.norte_api.dto.UserResponseDTO;
import com.norte.norte_api.repository.UserRepository;
import com.norte.norte_api.security.UserPrincipal;
import com.norte.norte_api.service.AuthService;
import com.norte.norte_api.service.UserService;

import jakarta.validation.Valid;

/**
 * Endpoints de autenticação — cadastro, login e perfil do usuário autenticado.
 *
 * <ul>
 *   <li>{@code POST /auth/register} — público, cria um novo usuário</li>
 *   <li>{@code POST /auth/login}    — público, retorna token Bearer + dados do usuário</li>
 *   <li>{@code GET  /auth/me}       — protegido, retorna os dados do usuário autenticado</li>
 * </ul>
 */
@RestController
@RequestMapping("/auth")
public class AuthController {

    private final UserService userService;
    private final AuthService authService;
    private final UserRepository userRepository;

    public AuthController(UserService userService,
                          AuthService authService,
                          UserRepository userRepository) {
        this.userService = userService;
        this.authService = authService;
        this.userRepository = userRepository;
    }

    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    public UserResponseDTO register(@Valid @RequestBody UserRequestDTO requestDTO) {
        return userService.save(requestDTO);
    }

    @PostMapping("/login")
    public AuthResponseDTO login(@Valid @RequestBody LoginRequestDTO loginRequest) {
        return authService.login(loginRequest);
    }

    /**
     * Retorna os dados públicos do usuário autenticado.
     *
     * <p>O identificador é extraído do {@link UserPrincipal} presente no contexto de
     * segurança — nunca de um parâmetro fornecido pelo cliente.
     */
    @GetMapping("/me")
    public UserResponseDTO me(@AuthenticationPrincipal UserPrincipal principal) {
        return userRepository.findByEmailIgnoreCase(principal.getUsername())
                .map(UserResponseDTO::from)
                .orElseThrow();
    }
}
