package com.norte.norte_api.service;

import java.util.Locale;
import java.util.Optional;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import com.norte.norte_api.dto.UserRequestDTO;
import com.norte.norte_api.dto.UserResponseDTO;
import com.norte.norte_api.exception.DuplicateEmailException;
import com.norte.norte_api.exception.DuplicateUsernameException;
import com.norte.norte_api.models.UserModel;
import com.norte.norte_api.repository.UserRepository;

import jakarta.transaction.Transactional;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public UserService(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional
    public UserResponseDTO save(UserRequestDTO requestDTO) {
        String email = normalizeEmail(requestDTO.email());

        if (userRepository.existsByEmailIgnoreCase(email)) {
            throw new DuplicateEmailException();
        }

        UserModel user = new UserModel();
        user.setName(requestDTO.name());
        user.setUsername(requestDTO.username());
        user.setEmail(email);
        user.setPassword(passwordEncoder.encode(requestDTO.password()));

        try {
            UserModel savedUser = userRepository.save(user);
            return UserResponseDTO.from(savedUser);
        } catch (DataIntegrityViolationException ex) {
            if (isConstraintViolation(ex, "uk_users_email")) {
                throw new DuplicateEmailException();
            }
            if (isConstraintViolation(ex, "users_username_key") || isConstraintViolation(ex, "username")) {
                throw new DuplicateUsernameException();
            }
            throw ex;
        }
    }

    private static String normalizeEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }

    private static boolean isConstraintViolation(DataIntegrityViolationException ex, String constraintHint) {
        String message = Optional.ofNullable(ex.getMostSpecificCause())
                .map(Throwable::getMessage)
                .orElseGet(ex::getMessage);
        return message != null && message.toLowerCase(Locale.ROOT).contains(constraintHint.toLowerCase(Locale.ROOT));
    }
}
