import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { TransactionResponseDTO } from '../../core/models/transaction.model';
import { TransactionService } from '../../core/services/transaction.service';
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
            Acompanhe seus lançamentos e gerencie suas entradas e despesas.
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-2.5">
          <a
            routerLink="/transactions"
            class="inline-flex items-center gap-2 rounded-xl bg-support px-4 py-2 text-xs font-semibold text-white shadow-sm hover:opacity-95 transition-opacity"
          >
            <span>Gerenciar Transações</span>
            <span>→</span>
          </a>

          <button
            type="button"
            (click)="refreshProfile()"
            [disabled]="isRefreshing()"
            class="inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-4 py-2 text-xs font-semibold text-text hover:bg-background disabled:opacity-60 transition-colors cursor-pointer"
          >
            @if (isRefreshing()) {
              <span
                class="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-support border-t-transparent"
              ></span>
              <span>Sincronizando...</span>
            } @else {
              <span>Sincronizar perfil</span>
            }
          </button>
        </div>
      </div>

      <!-- Cards Semânticos Conectados às Transações -->
      <section class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div class="rounded-2xl border border-border bg-surface p-5">
          <div class="flex items-center justify-between">
            <span class="text-xs font-medium text-text-secondary">Entradas Efetivadas</span>
            <span class="h-2.5 w-2.5 rounded-full bg-income"></span>
          </div>
          <p class="mt-2 text-lg font-bold text-income">
            {{ overview().realizedIncome | currency: 'BRL' }}
          </p>
          <p class="mt-1 text-xs text-text-muted">
            Previsto pendente: {{ overview().pendingIncome | currency: 'BRL' }}
          </p>
        </div>

        <div class="rounded-2xl border border-border bg-surface p-5">
          <div class="flex items-center justify-between">
            <span class="text-xs font-medium text-text-secondary">Despesas Efetivadas</span>
            <span class="h-2.5 w-2.5 rounded-full bg-expense"></span>
          </div>
          <p class="mt-2 text-lg font-bold text-expense">
            {{ overview().realizedExpense | currency: 'BRL' }}
          </p>
          <p class="mt-1 text-xs text-text-muted">
            Previsto pendente: {{ overview().pendingExpense | currency: 'BRL' }}
          </p>
        </div>

        <div class="rounded-2xl border border-border bg-surface p-5">
          <div class="flex items-center justify-between">
            <span class="text-xs font-medium text-text-secondary">Pendências</span>
            <span class="h-2.5 w-2.5 rounded-full bg-pending"></span>
          </div>
          <p class="mt-2 text-lg font-bold text-pending">
            {{ overview().pendingCount }} compromisso(s)
          </p>
          <p class="mt-1 text-xs text-text-muted">Aguardando efetivação</p>
        </div>

        <div class="rounded-2xl border border-border bg-surface p-5">
          <div class="flex items-center justify-between">
            <span class="text-xs font-medium text-text-secondary">Resultado Realizado</span>
            <span class="h-2.5 w-2.5 rounded-full bg-info"></span>
          </div>
          <p
            class="mt-2 text-lg font-bold"
            [class.text-income]="overview().netRealized >= 0"
            [class.text-expense]="overview().netRealized < 0"
          >
            {{ overview().netRealized | currency: 'BRL' }}
          </p>
          <p class="mt-1 text-xs text-text-muted">
            {{ transactions().length }} lançamento(s) registrado(s)
          </p>
        </div>
      </section>

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
    </div>
  `,
})
export class DashboardPageComponent implements OnInit {
  readonly authService = inject(AuthService);
  private readonly transactionService = inject(TransactionService);
  private readonly toastService = inject(ToastService);

  readonly isRefreshing = signal(false);
  readonly transactions = signal<TransactionResponseDTO[]>([]);

  readonly overview = computed(() => {
    let realizedIncome = 0;
    let realizedExpense = 0;
    let pendingIncome = 0;
    let pendingExpense = 0;
    let pendingCount = 0;

    for (const tx of this.transactions()) {
      if (tx.status === 'CANCELED') {
        continue;
      }
      if (tx.status === 'COMPLETED') {
        const val = tx.realizedAmount ?? tx.amount;
        if (tx.type === 'INCOME') {
          realizedIncome += val;
        } else {
          realizedExpense += val;
        }
      } else if (tx.status === 'PENDING') {
        pendingCount++;
        if (tx.type === 'INCOME') {
          pendingIncome += tx.amount;
        } else {
          pendingExpense += tx.amount;
        }
      }
    }

    return {
      realizedIncome,
      realizedExpense,
      pendingIncome,
      pendingExpense,
      pendingCount,
      netRealized: realizedIncome - realizedExpense,
    };
  });

  ngOnInit(): void {
    if (!this.authService.currentUser()) {
      this.refreshProfile(false);
    }
    this.transactionService.findAll().subscribe({
      next: (list) => this.transactions.set(list),
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
