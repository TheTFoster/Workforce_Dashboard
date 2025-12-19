// src/main/java/com/cec/EmployeeDB/Config/SecurityConfig.java
package com.cec.EmployeeDB.Config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.csrf.CookieCsrfTokenRepository;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

@Configuration
@EnableMethodSecurity
public class SecurityConfig {

        @Bean
        public PasswordEncoder passwordEncoder() {
                return new BCryptPasswordEncoder();
        }

        /**
         * CORS for SPA (localhost:3000 → :8086). With credentials=true you must
         * list exact origins (no '*').
         */
        @Bean
        public CorsConfigurationSource corsConfigurationSource(
                        @Value("#{'${app.cors.allowed-origins:http://localhost:3000,http://127.0.0.1:3000}'.split(',')}") List<String> allowedOrigins) {

                CorsConfiguration cfg = new CorsConfiguration();
                cfg.setAllowCredentials(true);
                cfg.setAllowedOrigins(allowedOrigins);
                cfg.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
                cfg.setAllowedHeaders(List.of(
                                "Authorization", "Content-Type", "X-Requested-With", "Accept", "Origin",
                                "X-CSRF-TOKEN", "X-XSRF-TOKEN", "XSRF-TOKEN" // ← allow common CSRF headers
                ));
                cfg.setExposedHeaders(List.of("Set-Cookie"));

                UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
                source.registerCorsConfiguration("/**", cfg);
                return source;
        }

        @Bean
        public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
                // CSRF cookie readable by JS so axios can mirror it into the header
                CookieCsrfTokenRepository csrfRepo = CookieCsrfTokenRepository.withHttpOnlyFalse();

                http
                                .cors(Customizer.withDefaults())
                        .csrf(csrf -> csrf
                                        .csrfTokenRepository(csrfRepo)
                                        // Allow auth endpoints to skip CSRF (login/forgot/reset bootstrap)
                                                .ignoringRequestMatchers(
                                                                "/api/v1/auth/**",
                                                                "/api/v1/timecards/import",
                                                                "/api/v1/timecards/normalize",
                                                                "/api/v1/alerts/refresh",
                                                                "/api/v1/timecards/predict/rebuild",
                                                                "/api/v1/timecards/latest-by-emp",
                                                                "/api/v1/timecards/current-assignments/by-emp",
                                                                "/api/v1/employee/details-by-emp",
                                                                "/api/v1/batch-sync/**"))
                                .authorizeHttpRequests(auth -> auth
                                                // Preflight
                                                .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()

                                                // Public utilities / health
                                                .requestMatchers("/csrf-token", "/error", "/api/ping").permitAll()

                                                // Auth
                                                .requestMatchers("/api/v1/auth/**").permitAll()

                                                // Admin endpoints: require ADMIN role
                                                .requestMatchers("/api/v1/admin/**").hasRole("ADMIN")

                                                // Everything else needs authentication (default role is USER)
                                                .anyRequest().authenticated())
                                .exceptionHandling(
                                                ex -> ex.authenticationEntryPoint((req, res, e) -> res.sendError(401)))
                                .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.IF_REQUIRED))
                                .logout(l -> l
                                                .logoutUrl("/api/v1/auth/logout")
                                                .deleteCookies("JSESSIONID", "XSRF-TOKEN")
                                                .permitAll());

                return http.build();
        }
}
