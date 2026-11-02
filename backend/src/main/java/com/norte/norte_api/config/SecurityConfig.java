package com.norte.norte_api.config;

import java.util.Arrays;
import java.util.List;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.Environment;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import com.norte.norte_api.security.JwtAccessDeniedHandler;
import com.norte.norte_api.security.JwtAuthenticationEntryPoint;
import com.norte.norte_api.security.JwtAuthenticationFilter;

/**
 * Configuração central do Spring Security.
 *
 * <p>
 * Estratégia de autenticação: Bearer token JWT — sem cookies de sessão, sem
 * CSRF.
 *
 * <ul>
 * <li>Sessão {@code STATELESS} — nenhum
 * {@link jakarta.servlet.http.HttpSession} é criado.</li>
 * <li>CSRF desabilitado — tokens Bearer em header {@code Authorization} não são
 * vulneráveis
 * a CSRF (o ataque explora cookies de sessão automáticos; aqui não há).</li>
 * <li>CORS configurável via variável de ambiente
 * {@code CORS_ALLOWED_ORIGINS}.</li>
 * <li>401 e 403 retornam JSON estruturado, sem redirecionamento para
 * {@code /login}.</li>
 * </ul>
 */
@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Value("${cors.allowed-origins}")
    private String allowedOriginsRaw;

    /** Rotas do springdoc liberadas apenas no perfil {@code dev}. */
    private static final String[] SWAGGER_PATHS = {
            "/v3/api-docs",
            "/v3/api-docs/**",
            "/swagger-ui.html",
            "/swagger-ui/**"
    };

    private final JwtAuthenticationFilter jwtAuthenticationFilter;
    private final JwtAuthenticationEntryPoint authenticationEntryPoint;
    private final JwtAccessDeniedHandler accessDeniedHandler;
    private final Environment environment;

    public SecurityConfig(JwtAuthenticationFilter jwtAuthenticationFilter,
            JwtAuthenticationEntryPoint authenticationEntryPoint,
            JwtAccessDeniedHandler accessDeniedHandler,
            Environment environment) {
        this.jwtAuthenticationFilter = jwtAuthenticationFilter;
        this.authenticationEntryPoint = authenticationEntryPoint;
        this.accessDeniedHandler = accessDeniedHandler;
        this.environment = environment;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                // ── CSRF ────────────────────────────────────────────────────────────────
                // Desabilitado: API stateless com Bearer token. Sem cookies de sessão,
                // o vetor de CSRF não existe.
                .csrf(AbstractHttpConfigurer::disable)

                // ── CORS ─────────────────────────────────────────────────────────────────
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))

                // ── Sessão ───────────────────────────────────────────────────────────────
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))

                // ── 401 / 403 ────────────────────────────────────────────────────────────
                // Delegados a beans dedicados que escrevem o mesmo ApiErrorResponse
                // usado pelo GlobalExceptionHandler — formato uniforme em toda a API.
                .exceptionHandling(ex -> ex
                        .authenticationEntryPoint(authenticationEntryPoint)
                        .accessDeniedHandler(accessDeniedHandler))

                // ── Autorização ───────────────────────────────────────────────────────────
                .authorizeHttpRequests(auth -> {
                    auth.requestMatchers(HttpMethod.POST, "/auth/register").permitAll()
                            .requestMatchers(HttpMethod.POST, "/auth/login").permitAll();

                    // Swagger público somente em dev. Fora dele, além do springdoc
                    // estar desligado, as rotas caem em authenticated().
                    if (environment.matchesProfiles("dev")) {
                        auth.requestMatchers(SWAGGER_PATHS).permitAll();
                    }

                    auth.anyRequest().authenticated();
                })

                // ── Filtro JWT ────────────────────────────────────────────────────────────
                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder(12);
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        List<String> allowedOrigins = Arrays.stream(
                allowedOriginsRaw.split(","))
                .map(String::trim)
                .filter(origin -> !origin.isBlank())
                .toList();

        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(allowedOrigins);
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("Authorization", "Content-Type", "Accept"));
        config.setAllowCredentials(false); // Bearer token — não usa cookies
        config.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }
}
