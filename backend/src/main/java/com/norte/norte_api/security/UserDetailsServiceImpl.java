package com.norte.norte_api.security;

import java.util.Optional;

import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import com.norte.norte_api.repository.UserRepository;

/**
 * Carrega usuários pelo e-mail, integrando o Spring Security ao
 * {@link UserRepository}. O "username" no contexto do Spring Security é o
 * e-mail do usuário.
 *
 * <p>Atende a dois fluxos distintos, com representações diferentes do usuário:
 * <ul>
 * <li><b>Login</b> — {@link #loadUserByUsername(String)} é chamado pelo
 * {@code DaoAuthenticationProvider} e devolve um {@link UserDetails} com o hash
 * da senha, necessário apenas para a verificação de credenciais.</li>
 * <li><b>Requisições autenticadas via JWT</b> —
 * {@link #loadPrincipalByEmail(String)} é chamado pelo
 * {@link JwtAuthenticationFilter} e devolve um {@link UserPrincipal} sem senha,
 * que é o objeto mantido no {@code SecurityContext}.</li>
 * </ul>
 */
@Service
public class UserDetailsServiceImpl implements UserDetailsService {

    private final UserRepository userRepository;

    public UserDetailsServiceImpl(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    /**
     * Usado exclusivamente pelo {@code DaoAuthenticationProvider} durante o login.
     */
    @Override
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        return userRepository.findByEmailIgnoreCase(email)
                .map(user -> User.withUsername(user.getEmail())
                        .password(user.getPassword())
                        .build())
                .orElseThrow(() -> new UsernameNotFoundException("Usuário não encontrado"));
    }

    /**
     * Usado pelo filtro JWT para montar o principal das requisições autenticadas.
     *
     * @return o principal (sem senha), ou vazio se o usuário não existir mais
     */
    public Optional<UserPrincipal> loadPrincipalByEmail(String email) {
        return userRepository.findByEmailIgnoreCase(email)
                .map(UserPrincipal::from);
    }
}
