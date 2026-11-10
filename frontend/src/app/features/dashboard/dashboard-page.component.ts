import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { FinancialSummaryDTO } from '../../core/models/financial.model';
import { FinancialService } from '../../core/services/financial.service';
import { ToastService } from '../../shared/services/toast.service';

@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  imports: [DatePipe, CurrencyPipe, RouterLink],
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
            Acompanhe seus lançamentos, categorias e indicadores financeiros.
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-2.5">
          <a
            routerLink="/transactions"
            class="inline-flex items-center gap-2 rounded-xl bg-support px-4 py-2 text-xs font-semibold text-white shadow-sm hover:opacity-95 transition-opacity"
          >
            <span>Transações</span>
          </a>

          <a
            routerLink="/categories"
            class="inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-4 py-2 text-xs font-semibold text-text hover:bg-background transition-colors"
          >
            <span>Categorias</span>
          </a>

          <a
            routerLink="/financial"
            class="inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-4 py-2 text-xs font-semibold text-text hover:bg-background transition-colors"
          >
            <span>Indicadores</span>
          </a>
        </div>
      </div>

      <!-- Cards Conectados ao FinancialService (/financial/summary) -->
      <section class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div class="rounded-2xl border border-border bg-surface p-5">
          <div class="flex items-center justify-between">
            <span class="text-xs font-medium text-text-secondary">Saldo Atual Realizado</span>
            <span class="h-2.5 w-2.5 rounded-full bg-support"></span>
          </div>
          <p
            class="mt-2 text-lg font-bold"
            [class.text-income]="(summary()?.currentBalance ?? 0) >= 0"
            [class.text-expense]="(summary()?.currentBalance ?? 0) < 0"
          >
            {{ (summary()?.currentBalance ?? 0) | currency: 'BRL' }}
          </p>
          <p class="mt-1 text-xs text-text-muted">Caixa acumulado realizado</p>
        </div>

        <div class="rounded-2xl border border-border bg-surface p-5">
          <div class="flex items-center justify-between">
            <span class="text-xs font-medium text-text-secondary">Saldo Projetado</span>
            <span class="h-2.5 w-2.5 rounded-full bg-info"></span>
          </div>
          <p
            class="mt-2 text-lg font-bold"
            [class.text-income]="(summary()?.projectedBalance ?? 0) >= 0"
            [class.text-expense]="(summary()?.projectedBalance ?? 0) < 0"
          >
            {{ (summary()?.projectedBalance ?? 0) | currency: 'BRL' }}
          </p>
          <p class="mt-1 text-xs text-text-muted">Inclui entradas e despesas pendentes</p>
        </div>

        <div class="rounded-2xl border border-border bg-surface p-5">
          <div class="flex items-center justify-between">
            <span class="text-xs font-medium text-text-secondary">Entradas Realizadas</span>
            <span class="h-2.5 w-2.5 rounded-full bg-income"></span>
          </div>
          <p class="mt-2 text-lg font-bold text-income">
            {{ (summary()?.realizedIncome ?? 0) | currency: 'BRL' }}
          </p>
          <p class="mt-1 text-xs text-text-muted">
            Pendente: {{ (summary()?.pendingIncome ?? 0) | currency: 'BRL' }}
          </p>
        </div>

        <div class="rounded-2xl border border-border bg-surface p-5">
          <div class="flex items-center justify-between">
            <span class="text-xs font-medium text-text-secondary">Despesas Realizadas</span>
            <span class="h-2.5 w-2.5 rounded-full bg-expense"></span>
          </div>
          <p class="mt-2 text-lg font-bold text-expense">
            {{ (summary()?.realizedExpense ?? 0) | currency: 'BRL' }}
          </p>
          <p class="mt-1 text-xs text-text-muted">
            Pendente: {{ (summary()?.pendingExpense ?? 0) | currency: 'BRL' }}
          </p>
        </div>
      </section>

      <!-- Card com Dados do Usuário Autenticado -->
      @if (authService.currentUser(); as user) {
        <section class="rounded-2xl border border-border bg-surface p-6 shadow-sm">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-base font-semibold text-text">
              Dados da Conta Autenticada
            </h2>

            <button
              type="button"
              (click)="refreshProfile()"
              [disabled]="isRefreshing()"
              class="text-xs font-semibold text-support hover:underline disabled:opacity-60 cursor-pointer"
            >
              {{ isRefreshing() ? 'Sincronizando...' : 'Sincronizar (/auth/me)' }}
            </button>
          </div>

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
    </div>
  `,
})
export class DashboardPageComponent implements OnInit {
  readonly authService = inject(AuthService);
  private readonly financialService = inject(FinancialService);
  private readonly toastService = inject(ToastService);

  readonly isRefreshing = signal(false);
  readonly summary = signal<FinancialSummaryDTO | null>(null);

  ngOnInit(): void {
    if (!this.authService.currentUser()) {
      this.refreshProfile(false);
    }
    this.financialService.getSummary().subscribe({
      next: (res) => this.summary.set(res),
    });
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
