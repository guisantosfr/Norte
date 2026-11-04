package com.norte.norte_api.service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.norte.norte_api.dto.NotificationResponseDTO;
import com.norte.norte_api.dto.UnreadCountResponseDTO;
import com.norte.norte_api.exception.ResourceNotFoundException;
import com.norte.norte_api.models.NotificationModel;
import com.norte.norte_api.models.NotificationStatus;
import com.norte.norte_api.repository.NotificationRepository;

import jakarta.persistence.criteria.Predicate;

@Service
public class NotificationService {

    private static final String NOTIFICATION_NOT_FOUND_MSG = "Notificação não encontrada.";

    private final NotificationRepository notificationRepository;

    public NotificationService(NotificationRepository notificationRepository) {
        this.notificationRepository = notificationRepository;
    }

    @Transactional(readOnly = true)
    public List<NotificationResponseDTO> findAll(UUID userId, NotificationStatus status) {
        Specification<NotificationModel> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.equal(root.get("userId"), userId));

            if (status == NotificationStatus.UNREAD) {
                predicates.add(cb.isNull(root.get("readAt")));
            } else if (status == NotificationStatus.READ) {
                predicates.add(cb.isNotNull(root.get("readAt")));
            }

            return cb.and(predicates.toArray(Predicate[]::new));
        };

        Sort sort = Sort.by(Sort.Order.desc("createdAt"));

        return notificationRepository.findAll(spec, sort)
                .stream()
                .map(NotificationResponseDTO::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public UnreadCountResponseDTO getUnreadCount(UUID userId) {
        long count = notificationRepository.countByUserIdAndReadAtIsNull(userId);
        return new UnreadCountResponseDTO(count);
    }

    @Transactional
    public NotificationResponseDTO markAsRead(UUID userId, UUID notificationId) {
        NotificationModel notification = notificationRepository.findByIdAndUserId(notificationId, userId)
                .orElseThrow(() -> new ResourceNotFoundException(NOTIFICATION_NOT_FOUND_MSG));

        if (notification.getReadAt() == null) {
            notification.setReadAt(Instant.now());
            notification = notificationRepository.save(notification);
        }

        return NotificationResponseDTO.from(notification);
    }

    @Transactional
    public void markAllAsRead(UUID userId) {
        notificationRepository.markAllAsRead(userId, Instant.now());
    }
}
