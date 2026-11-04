package com.norte.norte_api.controller;

import java.util.List;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.norte.norte_api.dto.NotificationResponseDTO;
import com.norte.norte_api.dto.UnreadCountResponseDTO;
import com.norte.norte_api.models.NotificationStatus;
import com.norte.norte_api.security.UserPrincipal;
import com.norte.norte_api.service.NotificationService;

import io.swagger.v3.oas.annotations.security.SecurityRequirement;

@RestController
@RequestMapping("/notifications")
@SecurityRequirement(name = "bearerAuth")
public class NotificationController {

    private final NotificationService notificationService;

    public NotificationController(NotificationService notificationService) {
        this.notificationService = notificationService;
    }

    @GetMapping
    public List<NotificationResponseDTO> findAll(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam(required = false) NotificationStatus status
    ) {
        return notificationService.findAll(principal.getId(), status);
    }

    @GetMapping("/unread-count")
    public UnreadCountResponseDTO getUnreadCount(@AuthenticationPrincipal UserPrincipal principal) {
        return notificationService.getUnreadCount(principal.getId());
    }

    @PatchMapping("/{id}/read")
    public NotificationResponseDTO markAsRead(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID id
    ) {
        return notificationService.markAsRead(principal.getId(), id);
    }

    @PatchMapping("/read-all")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void markAllAsRead(@AuthenticationPrincipal UserPrincipal principal) {
        notificationService.markAllAsRead(principal.getId());
    }
}
