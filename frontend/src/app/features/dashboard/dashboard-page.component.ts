import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { finalize } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { ToastService } from '../../shared/services/toast.service';

@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  imports: [DatePipe],
  template: `
    <div class="space-y-6">
      <!-- Cabeçalho da Página -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <span
            class="inline-flex items-center gap-1.5 rounded-full border border-support/30 bg-support/10 px-3 py-1 text-xs font-semibold text-support"
          >
            <span class="h-1.5 w-1.5 rounded-full bg-support"></span>
            Área Autenticada
          </span>
          <h1 class="mt-2 text-2xl font-bold text-text">
            Bem-vindo(a) ao Norte, {{ authService.currentUser()?.name }}!
          </h1>
          <p class="mt-1 text-sm text-text-secondary">
            Sua sessão está ativa e integrada ao backend com autenticação JWT.
          </p>
        </div>

        <button
          type="button"
          (click)="refreshProfile()"
          [disabled]="isRefreshing()"
          class="self-start sm:self-auto inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-4 py-2 text-xs font-semibold text-text hover:bg-background disabled:opacity-60 transition-colors cursor-pointer"
        >
          @if (isRefreshing()) {
            <span
              class="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-support border-t-transparent"
            ></span>
            <span>Sincronizando...</span>
          } @else {
            <span>Sincronizar perfil (/auth/me)</span>
          }
        </button>
      </div>

      <!-- Card com Dados do Usuário Autenticado -->
      @if (authService.currentUser(); as user) {
        <section class="rounded-2xl border border-border bg-surface p-6 shadow-sm">
          <h2 class="text-base font-semibold text-text mb-4">
            Dados da Conta Autenticada
          </h2>

          <dl class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div class="rounded-xl border border-border bg-background p-4">
              <dt class="text-xs font-medium text-text-muted">Nome</dt>
              <dd class="mt-1 text-sm font-semibold text-text truncate">{{ user.name }}</dd>
            </div>

            <div class="rounded-xl border border-border bg-background p-4">
              <dt class="text-xs font-medium text-text-muted">E-mail</dt>
              <dd class="mt-1 text-sm font-semibold text-text truncate">{{ user.email }}</dd>
            </div>

            <div class="rounded-xl border border-border bg-background p-4">
              <dt class="text-xs font-medium text-text-muted">Conta criada em</dt>
              <dd class="mt-1 text-sm font-semibold text-text">
                {{ user.createdAt | date: 'dd/MM/yyyy HH:mm' }}
              </dd>
            </div>

            <div class="rounded-xl border border-border bg-background p-4">
              <dt class="text-xs font-medium text-text-muted">Identificador (UUID)</dt>
              <dd class="mt-1 text-xs font-mono text-text-secondary truncate" [title]="user.id">
                {{ user.id }}
              </dd>
            </div>
          </dl>
        </section>
      }

      <!-- Cards Semânticos Demonstrativos do Tema Financeiro -->
      <section class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div class="rounded-2xl border border-border bg-surface p-5">
          <div class="flex items-center justify-between">
            <span class="text-xs font-medium text-text-secondary">Entradas (Sprint 2+)</span>
            <span class="h-2.5 w-2.5 rounded-full bg-income"></span>
          </div>
          <p class="mt-2 text-lg font-bold text-income">R$ 0,00</p>
          <p class="mt-1 text-xs text-text-muted">Controle de entradas avulsas e recorrentes</p>
        </div>

        <div class="rounded-2xl border border-border bg-surface p-5">
          <div class="flex items-center justify-between">
            <span class="text-xs font-medium text-text-secondary">Despesas (Sprint 2+)</span>
            <span class="h-2.5 w-2.5 rounded-full bg-expense"></span>
          </div>
          <p class="mt-2 text-lg font-bold text-expense">R$ 0,00</p>
          <p class="mt-1 text-xs text-text-muted">Registro de gastos previstos e realizados</p>
        </div>

        <div class="rounded-2xl border border-border bg-surface p-5">
          <div class="flex items-center justify-between">
            <span class="text-xs font-medium text-text-secondary">Pendências (Sprint 2+)</span>
            <span class="h-2.5 w-2.5 rounded-full bg-pending"></span>
          </div>
          <p class="mt-2 text-lg font-bold text-pending">0 compromissos</p>
          <p class="mt-1 text-xs text-text-muted">Acompanhamento de vencimentos futuros</p>
        </div>

        <div class="rounded-2xl border border-border bg-surface p-5">
          <div class="flex items-center justify-between">
            <span class="text-xs font-medium text-text-secondary">Saldo Projetado (Sprint 3+)</span>
            <span class="h-2.5 w-2.5 rounded-full bg-info"></span>
          </div>
          <p class="mt-2 text-lg font-bold text-info">R$ 0,00</p>
          <p class="mt-1 text-xs text-text-muted">Visão consolidada do período</p>
        </div>
      </section>
    </div>
  `,
})
export class DashboardPageComponent implements OnInit {
  readonly authService = inject(AuthService);
  private readonly toastService = inject(ToastService);

  readonly isRefreshing = signal(false);

  ngOnInit(): void {
    if (!this.authService.currentUser()) {
      this.refreshProfile(false);
    }
  }

  refreshProfile(notifySuccess = true): void {
    this.isRefreshing.set(true);
    this.authService
      .fetchCurrentUser()
      .pipe(finalize(() => this.isRefreshing.set(false)))
      .subscribe({
        next: () => {
          if (notifySuccess) {
            this.toastService.success('Dados do perfil sincronizados com /auth/me.');
          }
        },
      });
  }
}
