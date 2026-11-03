package com.norte.norte_api.security;

import java.util.Optional;

import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import com.norte.norte_api.models.UserModel;
import com.norte.norte_api.repository.UserRepository;

/**
 * Implementação de {@link UserDetailsService} que carrega usuários pelo e-mail
 * normalizado, integrando o Spring Security ao {@link UserRepository}.
 *
 * <p>
 * O "username" no contexto do Spring Security é o e-mail do usuário.
 */
@Service
public class UserDetailsServiceImpl implements UserDetailsService {

    private final UserRepository userRepository;

    public UserDetailsServiceImpl(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Override
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        Optional<UserModel> user = userRepository.findByEmailIgnoreCase(email);
        return user
                .map(UserPrincipal::from)
                .orElseThrow(() -> new UsernameNotFoundException("Usuário não encontrado"));
    }
}
