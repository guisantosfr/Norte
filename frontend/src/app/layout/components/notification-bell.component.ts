import { DatePipe } from '@angular/common';
import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { filter, finalize } from 'rxjs';
import {
  NotificationResponseDTO,
  NotificationType,
} from '../../core/models/notification.model';
import { NotificationService } from '../../core/services/notification.service';
import { ToastService } from '../../shared/services/toast.service';

@Component({
  selector: 'app-notification-bell',
  standalone: true,
  imports: [RouterLink, DatePipe],
  template: `
    <div class="relative">
      <button
        type="button"
        (click)="toggleDropdown()"
        aria-label="Abrir central de lembretes"
        title="Lembretes e notificações"
        class="relative inline-flex items-center justify-center rounded-xl border border-border bg-background p-2 text-text-secondary hover:bg-surface hover:text-text transition-colors cursor-pointer"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          stroke-width="1.9"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>

        @if (notificationService.unreadCount() > 0) {
          <span
            class="absolute -top-1.5 -right-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-expense px-1 text-[10px] font-bold text-white shadow-sm"
          >
            {{ notificationService.unreadCount() > 99 ? '99+' : notificationService.unreadCount() }}
          </span>
        }
      </button>

      @if (isOpen()) {
        <div
          class="fixed inset-0 z-40"
          (click)="closeDropdown()"
          aria-hidden="true"
        ></div>

        <div
          class="absolute right-0 mt-2 z-50 w-80 sm:w-96 rounded-2xl border border-border bg-surface shadow-xl overflow-hidden"
        >
          <!-- Header -->
          <div class="flex items-center justify-between border-b border-border px-4 py-3">
            <div class="flex items-center gap-2">
              <h3 class="text-sm font-bold text-text">Lembretes</h3>
              @if (notificationService.unreadCount() > 0) {
                <span
                  class="rounded-full bg-expense/15 px-2 py-0.5 text-[11px] font-semibold text-expense"
                >
                  {{ notificationService.unreadCount() }} não lido(s)
                </span>
              }
            </div>

            @if (notificationService.unreadCount() > 0) {
              <button
                type="button"
                [disabled]="isMarkingAll()"
                (click)="markAllAsRead()"
                class="text-xs font-medium text-support hover:underline disabled:opacity-50 cursor-pointer"
              >
                Marcar todas como lidas
              </button>
            }
          </div>

          <!-- List -->
          <div class="max-h-96 overflow-y-auto divide-y divide-border">
            @if (isLoading()) {
              <div class="p-4 space-y-3">
                @for (item of [1, 2, 3]; track item) {
                  <div class="h-14 rounded-xl bg-background animate-pulse"></div>
                }
              </div>
            } @else if (recentNotifications().length === 0) {
              <div class="px-4 py-8 text-center">
                <p class="text-sm font-medium text-text-secondary">
                  Nenhum lembrete por aqui
                </p>
                <p class="mt-1 text-xs text-text-muted">
                  Você receberá alertas automáticos antes do vencimento de compromissos pendentes.
                </p>
              </div>
            } @else {
              @for (item of recentNotifications(); track item.id) {
                <div
                  class="px-4 py-3 transition-colors"
                  [class.bg-support/5]="item.status === 'UNREAD'"
                  [class.hover:bg-background]="true"
                >
                  <div class="flex items-start justify-between gap-2">
                    <div class="flex items-center gap-1.5">
                      @if (item.status === 'UNREAD') {
                        <span class="h-2 w-2 rounded-full bg-support shrink-0"></span>
                      }
                      <span
                        class="rounded-md px-1.5 py-0.5 text-[10px] font-semibold"
                        [class.bg-pending/15]="item.type === 'TRANSACTION_REMINDER' || item.type === 'TRANSACTION_DUE_TODAY'"
                        [class.text-pending]="item.type === 'TRANSACTION_REMINDER' || item.type === 'TRANSACTION_DUE_TODAY'"
                        [class.bg-expense/15]="item.type === 'TRANSACTION_OVERDUE'"
                        [class.text-expense]="item.type === 'TRANSACTION_OVERDUE'"
                      >
                        {{ getTypeLabel(item.type) }}
                      </span>
                    </div>
                    <span class="text-[11px] text-text-muted shrink-0">
                      {{ item.createdAt | date: 'dd/MM HH:mm' }}
                    </span>
                  </div>

                  <p class="mt-1.5 text-xs font-semibold text-text">
                    {{ item.title }}
                  </p>
                  <p class="mt-0.5 text-xs text-text-secondary line-clamp-2">
                    {{ item.message }}
                  </p>

                  <div class="mt-2 flex items-center justify-between gap-2">
                    @if (item.transactionId) {
                      <a
                        routerLink="/transactions"
                        (click)="onNavigateToTransaction(item)"
                        class="text-[11px] font-semibold text-support hover:underline"
                      >
                        Ver lançamento →
                      </a>
                    } @else {
                      <span></span>
                    }

                    @if (item.status === 'UNREAD') {
                      <button
                        type="button"
                        (click)="markAsRead(item)"
                        class="text-[11px] font-medium text-text-secondary hover:text-text cursor-pointer"
                      >
                        Marcar como lida
                      </button>
                    }
                  </div>
                </div>
              }
            }
          </div>

          <!-- Footer -->
          <div class="border-t border-border bg-background/60 px-4 py-2.5 text-center">
            <a
              routerLink="/notifications"
              (click)="closeDropdown()"
              class="text-xs font-semibold text-support hover:underline"
            >
              Ver todos os lembretes
            </a>
          </div>
        </div>
      }
    </div>
  `,
})
export class NotificationBellComponent implements OnInit {
  readonly notificationService = inject(NotificationService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly toastService = inject(ToastService);

  readonly isOpen = signal(false);
  readonly isLoading = signal(false);
  readonly isMarkingAll = signal(false);
  readonly recentNotifications = signal<NotificationResponseDTO[]>([]);

  ngOnInit(): void {
    this.notificationService.refreshUnreadCount();

    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(() => {
        this.isOpen.set(false);
        this.notificationService.refreshUnreadCount();
      });
  }

  toggleDropdown(): void {
    const next = !this.isOpen();
    this.isOpen.set(next);
    if (next) {
      this.loadRecentNotifications();
    }
  }

  closeDropdown(): void {
    this.isOpen.set(false);
  }

  loadRecentNotifications(): void {
    this.isLoading.set(true);
    this.notificationService
      .findAll()
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (list) => {
          this.recentNotifications.set(list.slice(0, 6));
          const unread = list.filter((n) => n.status === 'UNREAD').length;
          this.notificationService.unreadCount.set(unread);
        },
      });
  }

  markAsRead(item: NotificationResponseDTO): void {
    if (item.status === 'READ') {
      return;
    }
    this.notificationService.markAsRead(item.id).subscribe({
      next: (updated) => {
        this.recentNotifications.update((items) =>
          items.map((n) => (n.id === updated.id ? updated : n))
        );
      },
      error: () => {
        this.toastService.error('Não foi possível marcar o lembrete como lido.');
      },
    });
  }

  markAllAsRead(): void {
    this.isMarkingAll.set(true);
    this.notificationService
      .markAllAsRead()
      .pipe(finalize(() => this.isMarkingAll.set(false)))
      .subscribe({
        next: () => {
          const nowIso = new Date().toISOString();
          this.recentNotifications.update((items) =>
            items.map((n) => ({ ...n, status: 'READ', readAt: n.readAt ?? nowIso }))
          );
          this.toastService.success('Todos os lembretes foram marcados como lidos.');
        },
        error: () => {
          this.toastService.error('Não foi possível marcar todos os lembretes como lidos.');
        },
      });
  }

  onNavigateToTransaction(item: NotificationResponseDTO): void {
    if (item.status === 'UNREAD') {
      this.notificationService.markAsRead(item.id).subscribe();
    }
    this.closeDropdown();
  }

  getTypeLabel(type: NotificationType): string {
    switch (type) {
      case 'TRANSACTION_REMINDER':
        return 'Vence em breve';
      case 'TRANSACTION_DUE_TODAY':
        return 'Vence hoje';
      case 'TRANSACTION_OVERDUE':
        return 'Em atraso';
    }
  }
}
