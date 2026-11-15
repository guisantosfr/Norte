import { DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import {
  NotificationResponseDTO,
  NotificationStatus,
  NotificationType,
} from '../../core/models/notification.model';
import { NotificationService } from '../../core/services/notification.service';
import { ToastService } from '../../shared/services/toast.service';

type StatusFilter = 'ALL' | NotificationStatus;

@Component({
  selector: 'app-notifications-page',
  standalone: true,
  imports: [DatePipe, RouterLink],
  template: `
    <div class="space-y-6">
      <!-- Page Header -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 class="text-2xl font-bold tracking-tight text-text">Central de Lembretes</h1>
          <p class="mt-1 text-sm text-text-secondary">
            Acompanhe alertas automáticos de compromissos financeiros próximos do vencimento.
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            (click)="loadNotifications()"
            [disabled]="isLoading()"
            class="inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-3.5 py-2 text-xs font-semibold text-text-secondary hover:bg-background hover:text-text disabled:opacity-50 transition-colors cursor-pointer"
          >
            <span>↻ Atualizar</span>
          </button>

          @if (unreadTotal() > 0) {
            <button
              type="button"
              (click)="markAllAsRead()"
              [disabled]="isMarkingAll()"
              class="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-white shadow-sm hover:opacity-95 disabled:opacity-50 transition-opacity cursor-pointer"
            >
              <span>✓ Marcar todas como lidas ({{ unreadTotal() }})</span>
            </button>
          }
        </div>
      </div>

      <!-- Summary Cards -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div class="rounded-2xl border border-border bg-surface p-5 shadow-xs">
          <p class="text-xs font-semibold uppercase tracking-wider text-text-muted">
            Total de Lembretes
          </p>
          <p class="mt-2 text-2xl font-bold text-text">{{ allNotifications().length }}</p>
        </div>

        <div class="rounded-2xl border border-border bg-surface p-5 shadow-xs">
          <div class="flex items-center justify-between">
            <p class="text-xs font-semibold uppercase tracking-wider text-text-muted">
              Não Lidos
            </p>
            @if (unreadTotal() > 0) {
              <span
                class="rounded-full bg-pending/15 px-2 py-0.5 text-[11px] font-semibold text-pending"
              >
                Atenção
              </span>
            }
          </div>
          <p
            class="mt-2 text-2xl font-bold"
            [class.text-pending]="unreadTotal() > 0"
            [class.text-text]="unreadTotal() === 0"
          >
            {{ unreadTotal() }}
          </p>
        </div>

        <div class="rounded-2xl border border-border bg-surface p-5 shadow-xs">
          <p class="text-xs font-semibold uppercase tracking-wider text-text-muted">Lidos</p>
          <p class="mt-2 text-2xl font-bold text-income">{{ readTotal() }}</p>
        </div>
      </div>

      <!-- Filter Tabs -->
      <div class="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
        <div class="inline-flex rounded-xl border border-border bg-surface p-1">
          <button
            type="button"
            (click)="setStatusFilter('ALL')"
            class="rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors cursor-pointer"
            [class.bg-support]="statusFilter() === 'ALL'"
            [class.text-white]="statusFilter() === 'ALL'"
            [class.text-text-secondary]="statusFilter() !== 'ALL'"
          >
            Todas ({{ allNotifications().length }})
          </button>
          <button
            type="button"
            (click)="setStatusFilter('UNREAD')"
            class="rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors cursor-pointer"
            [class.bg-support]="statusFilter() === 'UNREAD'"
            [class.text-white]="statusFilter() === 'UNREAD'"
            [class.text-text-secondary]="statusFilter() !== 'UNREAD'"
          >
            Não lidas ({{ unreadTotal() }})
          </button>
          <button
            type="button"
            (click)="setStatusFilter('READ')"
            class="rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors cursor-pointer"
            [class.bg-support]="statusFilter() === 'READ'"
            [class.text-white]="statusFilter() === 'READ'"
            [class.text-text-secondary]="statusFilter() !== 'READ'"
          >
            Lidas ({{ readTotal() }})
          </button>
        </div>

        <p class="text-xs text-text-muted">
          Exibindo {{ filteredNotifications().length }} lembrete(s)
        </p>
      </div>

      <!-- Notifications List -->
      @if (isLoading()) {
        <div class="space-y-3">
          @for (skeleton of [1, 2, 3, 4]; track skeleton) {
            <div class="h-24 rounded-2xl border border-border bg-surface animate-pulse"></div>
          }
        </div>
      } @else if (filteredNotifications().length === 0) {
        <div
          class="rounded-2xl border border-dashed border-border bg-surface p-10 text-center space-y-2"
        >
          <p class="text-base font-semibold text-text">
            @if (statusFilter() === 'UNREAD') {
              Você está em dia! Nenhum lembrete não lido.
            } @else if (statusFilter() === 'READ') {
              Nenhum lembrete marcado como lido ainda.
            } @else {
              Nenhum lembrete registrado até o momento.
            }
          </p>
          <p class="text-xs text-text-secondary max-w-md mx-auto">
            Quando você tiver entradas ou despesas pendentes prestes a vencer, os alertas
            aparecerão automaticamente aqui.
          </p>
        </div>
      } @else {
        <div class="space-y-3">
          @for (item of filteredNotifications(); track item.id) {
            <article
              class="rounded-2xl border p-4 sm:p-5 transition-colors shadow-xs"
              [class.border-support/40]="item.status === 'UNREAD'"
              [class.bg-surface]="true"
              [class.border-border]="item.status === 'READ'"
            >
              <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                <div class="space-y-1.5 flex-1 min-w-0">
                  <div class="flex flex-wrap items-center gap-2">
                    @if (item.status === 'UNREAD') {
                      <span
                        class="inline-flex items-center gap-1 rounded-full bg-support/15 px-2.5 py-0.5 text-[11px] font-semibold text-support"
                      >
                        <span class="h-1.5 w-1.5 rounded-full bg-support"></span>
                        Não lido
                      </span>
                    } @else {
                      <span
                        class="inline-flex items-center rounded-full bg-background px-2.5 py-0.5 text-[11px] font-medium text-text-muted border border-border"
                      >
                        Lido
                      </span>
                    }

                    <span
                      class="rounded-md px-2 py-0.5 text-[11px] font-semibold"
                      [class.bg-pending/15]="item.type === 'TRANSACTION_REMINDER' || item.type === 'TRANSACTION_DUE_TODAY'"
                      [class.text-pending]="item.type === 'TRANSACTION_REMINDER' || item.type === 'TRANSACTION_DUE_TODAY'"
                      [class.bg-expense/15]="item.type === 'TRANSACTION_OVERDUE'"
                      [class.text-expense]="item.type === 'TRANSACTION_OVERDUE'"
                    >
                      {{ getTypeLabel(item.type) }}
                    </span>

                    <span class="text-xs text-text-muted">
                      Criado em {{ item.createdAt | date: 'dd/MM/yyyy HH:mm' }}
                    </span>

                    @if (item.readAt) {
                      <span class="text-xs text-text-muted">
                        • Lido em {{ item.readAt | date: 'dd/MM/yyyy HH:mm' }}
                      </span>
                    }
                  </div>

                  <h2 class="text-sm sm:text-base font-bold text-text">
                    {{ item.title }}
                  </h2>
                  <p class="text-sm text-text-secondary leading-relaxed">
                    {{ item.message }}
                  </p>
                </div>

                <!-- Actions -->
                <div class="flex flex-wrap sm:flex-col items-end justify-end gap-2 shrink-0">
                  @if (item.status === 'UNREAD') {
                    <button
                      type="button"
                      (click)="markAsRead(item)"
                      [disabled]="readingId() === item.id"
                      class="rounded-xl border border-support/40 bg-support/10 px-3 py-1.5 text-xs font-semibold text-support hover:bg-support/20 disabled:opacity-50 transition-colors cursor-pointer"
                    >
                      {{ readingId() === item.id ? 'Marcando...' : '✓ Marcar como lida' }}
                    </button>
                  }

                  @if (item.transactionId) {
                    <button
                      type="button"
                      (click)="openRelatedTransaction(item)"
                      class="rounded-xl border border-border bg-background px-3 py-1.5 text-xs font-semibold text-text-secondary hover:text-text hover:border-text-muted transition-colors cursor-pointer"
                    >
                      Ver transações →
                    </button>
                  }
                </div>
              </div>
            </article>
          }
        </div>
      }
    </div>
  `,
})
export class NotificationsPageComponent implements OnInit {
  private readonly notificationService = inject(NotificationService);
  private readonly toastService = inject(ToastService);
  private readonly router = inject(Router);

  readonly allNotifications = signal<NotificationResponseDTO[]>([]);
  readonly statusFilter = signal<StatusFilter>('ALL');
  readonly isLoading = signal(false);
  readonly isMarkingAll = signal(false);
  readonly readingId = signal<string | null>(null);

  readonly unreadTotal = computed(
    () => this.allNotifications().filter((n) => n.status === 'UNREAD').length
  );

  readonly readTotal = computed(
    () => this.allNotifications().filter((n) => n.status === 'READ').length
  );

  readonly filteredNotifications = computed(() => {
    const filterValue = this.statusFilter();
    const list = this.allNotifications();
    if (filterValue === 'ALL') {
      return list;
    }
    return list.filter((n) => n.status === filterValue);
  });

  ngOnInit(): void {
    this.loadNotifications();
  }

  loadNotifications(): void {
    this.isLoading.set(true);
    this.notificationService
      .findAll()
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (notifications) => {
          this.allNotifications.set(notifications);
          const unread = notifications.filter((n) => n.status === 'UNREAD').length;
          this.notificationService.unreadCount.set(unread);
        },
        error: () => {
          this.toastService.error('Não foi possível carregar os lembretes.');
        },
      });
  }

  setStatusFilter(filterValue: StatusFilter): void {
    this.statusFilter.set(filterValue);
  }

  markAsRead(item: NotificationResponseDTO): void {
    if (item.status === 'READ') {
      return;
    }

    this.readingId.set(item.id);
    this.notificationService
      .markAsRead(item.id)
      .pipe(finalize(() => this.readingId.set(null)))
      .subscribe({
        next: (updated) => {
          this.allNotifications.update((items) =>
            items.map((n) => (n.id === updated.id ? updated : n))
          );
          this.toastService.success('Lembrete marcado como lido.');
        },
        error: () => {
          this.toastService.error('Não foi possível atualizar o status do lembrete.');
        },
      });
  }

  markAllAsRead(): void {
    if (this.unreadTotal() === 0) {
      return;
    }

    this.isMarkingAll.set(true);
    this.notificationService
      .markAllAsRead()
      .pipe(finalize(() => this.isMarkingAll.set(false)))
      .subscribe({
        next: () => {
          const nowIso = new Date().toISOString();
          this.allNotifications.update((items) =>
            items.map((n) => ({
              ...n,
              status: 'READ',
              readAt: n.readAt ?? nowIso,
            }))
          );
          this.toastService.success('Todos os lembretes foram marcados como lidos.');
        },
        error: () => {
          this.toastService.error('Não foi possível marcar todos os lembretes como lidos.');
        },
      });
  }

  openRelatedTransaction(item: NotificationResponseDTO): void {
    if (item.status === 'UNREAD') {
      this.notificationService.markAsRead(item.id).subscribe();
    }
    this.router.navigate(['/transactions']);
  }

  getTypeLabel(type: NotificationType): string {
    switch (type) {
      case 'TRANSACTION_REMINDER':
        return 'Lembrete de vencimento';
      case 'TRANSACTION_DUE_TODAY':
        return 'Vence hoje';
      case 'TRANSACTION_OVERDUE':
        return 'Compromisso em atraso';
    }
  }
}
