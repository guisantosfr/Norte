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
import com.norte.norte_api.security.UserPrincipal;
import com.norte.norte_api.service.AuthService;

import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import jakarta.validation.Valid;

/**
 * Endpoints de autenticação — cadastro, login e perfil do usuário autenticado.
 *
 * <ul>
 * <li>{@code POST /auth/register} — público, cria um novo usuário e retorna
 * token Bearer + dados do usuário</li>
 * <li>{@code POST /auth/login} — público, retorna token Bearer + dados do
 * usuário</li>
 * <li>{@code GET  /auth/me} — protegido, retorna os dados do usuário
 * autenticado</li>
 * </ul>
 */
@RestController
@RequestMapping("/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    public AuthResponseDTO register(@Valid @RequestBody UserRequestDTO requestDTO) {
        return authService.register(requestDTO);
    }

    @PostMapping("/login")
    public AuthResponseDTO login(@Valid @RequestBody LoginRequestDTO loginRequest) {
        return authService.login(loginRequest);
    }

    /**
     * Retorna os dados públicos do usuário autenticado.
     *
     * <p>
     * O identificador é extraído do {@link UserPrincipal} presente no contexto de
     * segurança — nunca de um parâmetro fornecido pelo cliente.
     */
    @GetMapping("/me")
    @SecurityRequirement(name = "bearerAuth")
    public UserResponseDTO me(@AuthenticationPrincipal UserPrincipal principal) {
        return authService.getCurrentUser(principal.getId());
    }
}
