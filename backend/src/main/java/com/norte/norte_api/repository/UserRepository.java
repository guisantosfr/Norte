package com.norte.norte_api.repository;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.repository.query.Param;

import com.norte.norte_api.models.UserModel;

public interface UserRepository extends JpaRepository<UserModel, UUID> {

    Optional<UserModel> findByEmailIgnoreCase(@Param("email") String email);

    boolean existsByEmailIgnoreCase(@Param("email") String email);
}
