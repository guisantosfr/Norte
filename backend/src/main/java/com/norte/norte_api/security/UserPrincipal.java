package com.norte.norte_api.security;

import java.util.Collection;
import java.util.List;

import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import com.norte.norte_api.models.UserModel;

/**
 * Adaptador entre {@link UserModel} e a interface {@link UserDetails} do Spring Security.
 *
 * <p>Não armazena referência ao modelo completo — apenas os campos necessários para
 * o contexto de segurança. Isso evita que o SecurityContextHolder carregue
 * entidades JPA gerenciadas, o que poderia causar problemas com lazy loading fora
 * do contexto transacional.
 */
public final class UserPrincipal implements UserDetails {

    private final String email;
    private final String password;

    private UserPrincipal(String email, String password) {
        this.email = email;
        this.password = password;
    }

    public static UserPrincipal from(UserModel user) {
        return new UserPrincipal(user.getEmail(), user.getPassword());
    }

    @Override
    public String getUsername() {
        return email;
    }

    @Override
    public String getPassword() {
        return password;
    }

    /** Sem roles por ora — autorização é apenas autenticado vs. não autenticado. */
    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return List.of();
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return true;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return true;
    }
}
