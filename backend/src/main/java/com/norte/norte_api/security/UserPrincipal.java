package com.norte.norte_api.security;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

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
 *
 * <p>Usado somente pelo filtro JWT para representar o usuário autenticado nas
 * requisições. Por isso <b>não carrega a senha</b>: a verificação de credenciais no
 * login é feita pelo {@code DaoAuthenticationProvider} com outro {@link UserDetails}
 * (ver {@link UserDetailsServiceImpl#loadUserByUsername(String)}).
 */
public final class UserPrincipal implements UserDetails {

    private final UUID id;
    private final String email;

    private UserPrincipal(UUID id, String email) {
        this.id = id;
        this.email = email;
    }

    public static UserPrincipal from(UserModel user) {
        return new UserPrincipal(user.getId(), user.getEmail());
    }

    /** Identificador do usuário autenticado, para uso direto pelos serviços. */
    public UUID getId() {
        return id;
    }

    @Override
    public String getUsername() {
        return email;
    }

    /**
     * Sem senha: este principal não participa da verificação de credenciais.
     * O método existe apenas porque é exigido por {@link UserDetails}.
     */
    @Override
    public String getPassword() {
        return null;
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
