import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { finalize } from 'rxjs';
import { parseHttpError } from '../../core/http/api-error.model';
import { CategoryResponseDTO } from '../../core/models/category.model';
import {
  TransactionFilters,
  TransactionResponseDTO,
  TransactionStatus,
  TransactionType,
} from '../../core/models/transaction.model';
import { CategoryService } from '../../core/services/category.service';
import { TransactionService } from '../../core/services/transaction.service';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog.component';
import { ToastService } from '../../shared/services/toast.service';
import { CompleteTransactionModalComponent } from './components/complete-transaction-modal.component';
import { TransactionFormModalComponent } from './components/transaction-form-modal.component';

@Component({
  selector: 'app-transactions-page',
  standalone: true,
  imports: [
    FormsModule,
    CurrencyPipe,
    DatePipe,
    TransactionFormModalComponent,
    CompleteTransactionModalComponent,
    ConfirmDialogComponent,
  ],
  template: `
    <div class="space-y-6">
      <!-- Cabeçalho e Ações Rápidas -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 class="text-2xl font-bold text-text">Transações</h1>
          <p class="mt-1 text-sm text-text-secondary">
            Registre, classifique por categoria e acompanhe suas entradas e despesas.
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            (click)="openCreateModal('INCOME')"
            class="inline-flex items-center gap-2 rounded-xl bg-support px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:opacity-95 transition-opacity cursor-pointer"
          >
            <span class="text-sm font-bold">+</span>
            <span>Nova Transação</span>
          </button>
        </div>
      </div>

      <!-- Cards de Resumo da Visão Atual -->
      <section class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div class="rounded-2xl border border-border bg-surface p-4 shadow-xs">
          <div class="flex items-center justify-between">
            <span class="text-xs font-medium text-text-secondary">Entradas Efetivadas</span>
            <span class="h-2 w-2 rounded-full bg-income"></span>
          </div>
          <p class="mt-2 text-lg font-bold text-income">
            {{ summaryMetrics().realizedIncome | currency: 'BRL' }}
          </p>
          <p class="mt-0.5 text-[11px] text-text-muted">
            Previsto pendente: {{ summaryMetrics().pendingIncome | currency: 'BRL' }}
          </p>
        </div>

        <div class="rounded-2xl border border-border bg-surface p-4 shadow-xs">
          <div class="flex items-center justify-between">
            <span class="text-xs font-medium text-text-secondary">Despesas Efetivadas</span>
            <span class="h-2 w-2 rounded-full bg-expense"></span>
          </div>
          <p class="mt-2 text-lg font-bold text-expense">
            {{ summaryMetrics().realizedExpense | currency: 'BRL' }}
          </p>
          <p class="mt-0.5 text-[11px] text-text-muted">
            Previsto pendente: {{ summaryMetrics().pendingExpense | currency: 'BRL' }}
          </p>
        </div>

        <div class="rounded-2xl border border-border bg-surface p-4 shadow-xs">
          <div class="flex items-center justify-between">
            <span class="text-xs font-medium text-text-secondary">Lançamentos Pendentes</span>
            <span class="h-2 w-2 rounded-full bg-pending"></span>
          </div>
          <p class="mt-2 text-lg font-bold text-pending">
            {{ summaryMetrics().pendingCount }}
          </p>
          <p class="mt-0.5 text-[11px] text-text-muted">
            Aguardando efetivação na listagem
          </p>
        </div>

        <div class="rounded-2xl border border-border bg-surface p-4 shadow-xs">
          <div class="flex items-center justify-between">
            <span class="text-xs font-medium text-text-secondary">Saldo Realizado (Lista)</span>
            <span class="h-2 w-2 rounded-full bg-info"></span>
          </div>
          <p
            class="mt-2 text-lg font-bold"
            [class.text-income]="summaryMetrics().netRealized >= 0"
            [class.text-expense]="summaryMetrics().netRealized < 0"
          >
            {{ summaryMetrics().netRealized | currency: 'BRL' }}
          </p>
          <p class="mt-0.5 text-[11px] text-text-muted">
            {{ transactions().length }} lançamento(s) listado(s)
          </p>
        </div>
      </section>

      <!-- Barra de Filtros -->
      <section class="rounded-2xl border border-border bg-surface p-4 sm:p-5 shadow-xs">
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3.5 items-end">
          <!-- Tipo -->
          <div>
            <label for="filter-type" class="block text-xs font-medium text-text-secondary mb-1">
              Tipo
            </label>
            <select
              id="filter-type"
              [(ngModel)]="filterType"
              (ngModelChange)="applyFilters()"
              class="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-text focus:outline-none focus:ring-2 focus:ring-support"
            >
              <option value="">Todos os tipos</option>
              <option value="INCOME">Apenas Entradas</option>
              <option value="EXPENSE">Apenas Despesas</option>
            </select>
          </div>

          <!-- Status -->
          <div>
            <label for="filter-status" class="block text-xs font-medium text-text-secondary mb-1">
              Status
            </label>
            <select
              id="filter-status"
              [(ngModel)]="filterStatus"
              (ngModelChange)="applyFilters()"
              class="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-text focus:outline-none focus:ring-2 focus:ring-support"
            >
              <option value="">Todos os status</option>
              <option value="PENDING">Pendente</option>
              <option value="COMPLETED">Efetivado</option>
              <option value="CANCELED">Cancelado</option>
            </select>
          </div>

          <!-- Categoria -->
          <div>
            <label for="filter-category" class="block text-xs font-medium text-text-secondary mb-1">
              Categoria
            </label>
            <select
              id="filter-category"
              [(ngModel)]="filterCategoryId"
              (ngModelChange)="applyFilters()"
              class="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-text focus:outline-none focus:ring-2 focus:ring-support"
            >
              <option value="">Todas as categorias</option>
              @for (cat of categories(); track cat.id) {
                <option [value]="cat.id">
                  {{ cat.name }}{{ !cat.active ? ' (Inativa)' : '' }}
                </option>
              }
            </select>
          </div>

          <!-- Data Inicial -->
          <div>
            <label for="filter-start-date" class="block text-xs font-medium text-text-secondary mb-1">
              Data inicial
            </label>
            <input
              id="filter-start-date"
              type="date"
              [(ngModel)]="filterStartDate"
              (change)="applyFilters()"
              class="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-text focus:outline-none focus:ring-2 focus:ring-support"
            />
          </div>

          <!-- Data Final -->
          <div>
            <label for="filter-end-date" class="block text-xs font-medium text-text-secondary mb-1">
              Data final
            </label>
            <input
              id="filter-end-date"
              type="date"
              [(ngModel)]="filterEndDate"
              (change)="applyFilters()"
              class="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-text focus:outline-none focus:ring-2 focus:ring-support"
            />
          </div>

          <!-- Botões de Filtro -->
          <div class="flex items-center gap-2">
            <button
              type="button"
              (click)="applyFilters()"
              class="flex-1 rounded-xl bg-primary px-3.5 py-2 text-xs font-semibold text-white hover:opacity-95 transition-opacity cursor-pointer"
            >
              Atualizar
            </button>

            @if (hasActiveFilters()) {
              <button
                type="button"
                (click)="clearFilters()"
                class="rounded-xl border border-border bg-background px-3 py-2 text-xs font-medium text-text-secondary hover:text-text transition-colors cursor-pointer"
              >
                Limpar
              </button>
            }
          </div>
        </div>

        @if (filterError()) {
          <p class="mt-2.5 text-xs text-expense">{{ filterError() }}</p>
        }
      </section>

      <!-- Estado de Carregamento -->
      @if (isLoading()) {
        <div
          class="flex flex-col items-center justify-center rounded-2xl border border-border bg-surface py-16 text-center"
        >
          <span
            class="inline-block h-7 w-7 animate-spin rounded-full border-3 border-support border-t-transparent"
          ></span>
          <p class="mt-3 text-sm font-medium text-text-secondary">
            Carregando suas movimentações financeiras...
          </p>
        </div>
      } @else if (transactions().length === 0) {
        <!-- Estado Vazio -->
        <div
          class="flex flex-col items-center justify-center rounded-2xl border border-border bg-surface px-6 py-14 text-center"
        >
          <div
            class="flex h-12 w-12 items-center justify-center rounded-2xl bg-support/15 text-support font-bold text-lg"
          >
            R$
          </div>
          <h2 class="mt-4 text-base font-bold text-text">
            Nenhuma transação encontrada
          </h2>
          <p class="mt-1 max-w-md text-xs text-text-secondary">
            @if (hasActiveFilters()) {
              Nenhum lançamento corresponde aos filtros selecionados. Tente ajustar ou limpar os filtros.
            } @else {
              Comece registrando suas entradas e despesas avulsas para acompanhar seu fluxo financeiro.
            }
          </p>

          <div class="mt-5 flex flex-wrap items-center justify-center gap-2.5">
            @if (hasActiveFilters()) {
              <button
                type="button"
                (click)="clearFilters()"
                class="rounded-xl border border-border bg-background px-4 py-2 text-xs font-semibold text-text hover:bg-surface transition-colors cursor-pointer"
              >
                Limpar filtros
              </button>
            } @else {
              <button
                type="button"
                (click)="openCreateModal('INCOME')"
                class="rounded-xl bg-income px-4 py-2 text-xs font-semibold text-white hover:opacity-95 transition-opacity cursor-pointer"
              >
                + Registrar Entrada
              </button>
              <button
                type="button"
                (click)="openCreateModal('EXPENSE')"
                class="rounded-xl bg-expense px-4 py-2 text-xs font-semibold text-white hover:opacity-95 transition-opacity cursor-pointer"
              >
                + Registrar Despesa
              </button>
            }
          </div>
        </div>
      } @else {
        <!-- Tabela Desktop -->
        <div
          class="hidden md:block overflow-hidden rounded-2xl border border-border bg-surface shadow-xs"
        >
          <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse">
              <thead>
                <tr class="border-b border-border bg-background/60 text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                  <th class="py-3.5 pl-5 pr-3">Data</th>
                  <th class="px-3 py-3.5">Descrição / Categoria</th>
                  <th class="px-3 py-3.5">Tipo</th>
                  <th class="px-3 py-3.5">Status</th>
                  <th class="px-3 py-3.5 text-right">Valor</th>
                  <th class="py-3.5 pl-3 pr-5 text-right">Ações</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-border text-sm">
                @for (tx of transactions(); track tx.id) {
                  <tr
                    class="hover:bg-background/50 transition-colors"
                    [class.opacity-60]="tx.status === 'CANCELED'"
                  >
                    <!-- Data -->
                    <td class="whitespace-nowrap py-3.5 pl-5 pr-3 text-xs font-medium text-text-secondary">
                      {{ tx.date | date: 'dd/MM/yyyy' }}
                    </td>

                    <!-- Descrição + Metadados -->
                    <td class="px-3 py-3.5">
                      <div class="flex flex-wrap items-center gap-2">
                        <span
                          class="font-semibold text-text"
                          [class.line-through]="tx.status === 'CANCELED'"
                        >
                          {{ tx.description }}
                        </span>

                        @if (tx.categoryName) {
                          <span
                            class="rounded-md border border-support/30 bg-support/10 px-2 py-0.5 text-[11px] font-medium text-support"
                          >
                            {{ tx.categoryName }}
                          </span>
                        } @else {
                          <span
                            class="rounded-md border border-border bg-background px-2 py-0.5 text-[10px] text-text-muted"
                          >
                            Sem categoria
                          </span>
                        }

                        @if (tx.occurrenceNumber !== null) {
                          <span
                            class="rounded-md bg-info/15 px-2 py-0.5 text-[11px] font-semibold text-info"
                          >
                            {{
                              tx.totalOccurrences
                                ? 'Parcela ' + tx.occurrenceNumber + '/' + tx.totalOccurrences
                                : 'Recorrente #' + tx.occurrenceNumber
                            }}
                          </span>
                        }
                      </div>
                    </td>

                    <!-- Tipo -->
                    <td class="whitespace-nowrap px-3 py-3.5">
                      @if (tx.type === 'INCOME') {
                        <span
                          class="inline-flex items-center gap-1 rounded-lg bg-income/15 px-2.5 py-1 text-xs font-semibold text-income"
                        >
                          <span>↑</span>
                          <span>Entrada</span>
                        </span>
                      } @else {
                        <span
                          class="inline-flex items-center gap-1 rounded-lg bg-expense/15 px-2.5 py-1 text-xs font-semibold text-expense"
                        >
                          <span>↓</span>
                          <span>Despesa</span>
                        </span>
                      }
                    </td>

                    <!-- Status -->
                    <td class="whitespace-nowrap px-3 py-3.5">
                      @switch (tx.status) {
                        @case ('COMPLETED') {
                          <span
                            class="inline-flex items-center gap-1.5 rounded-full bg-income/15 px-2.5 py-0.5 text-xs font-semibold text-income"
                          >
                            <span class="h-1.5 w-1.5 rounded-full bg-income"></span>
                            Efetivado
                          </span>
                        }
                        @case ('PENDING') {
                          <span
                            class="inline-flex items-center gap-1.5 rounded-full bg-pending/15 px-2.5 py-0.5 text-xs font-semibold text-pending"
                          >
                            <span class="h-1.5 w-1.5 rounded-full bg-pending"></span>
                            Pendente
                          </span>
                        }
                        @case ('CANCELED') {
                          <span
                            class="inline-flex items-center gap-1.5 rounded-full bg-cancelled/20 px-2.5 py-0.5 text-xs font-semibold text-cancelled"
                          >
                            <span class="h-1.5 w-1.5 rounded-full bg-cancelled"></span>
                            Cancelado
                          </span>
                        }
                      }
                    </td>

                    <!-- Valor -->
                    <td class="whitespace-nowrap px-3 py-3.5 text-right">
                      <div
                        class="font-bold"
                        [class.text-income]="tx.type === 'INCOME' && tx.status !== 'CANCELED'"
                        [class.text-expense]="tx.type === 'EXPENSE' && tx.status !== 'CANCELED'"
                        [class.text-cancelled]="tx.status === 'CANCELED'"
                      >
                        {{ tx.type === 'INCOME' ? '+' : '-' }}
                        {{ getEffectiveDisplayAmount(tx) | currency: 'BRL' }}
                      </div>
                      @if (hasDifferentRealizedAmount(tx)) {
                        <div class="text-[11px] text-text-muted">
                          Previsto: {{ tx.amount | currency: 'BRL' }}
                        </div>
                      }
                    </td>

                    <!-- Ações -->
                    <td class="whitespace-nowrap py-3.5 pl-3 pr-5 text-right">
                      <div class="inline-flex items-center justify-end gap-1.5">
                        @if (tx.status === 'PENDING') {
                          <button
                            type="button"
                            (click)="openCompleteModal(tx)"
                            title="Efetivar lançamento"
                            class="rounded-lg bg-income/15 px-2.5 py-1 text-xs font-semibold text-income hover:bg-income hover:text-white transition-colors cursor-pointer"
                          >
                            Efetivar
                          </button>
                        }

                        <button
                          type="button"
                          (click)="openEditModal(tx)"
                          title="Editar lançamento"
                          class="rounded-lg border border-border bg-background px-2.5 py-1 text-xs font-medium text-text-secondary hover:text-text transition-colors cursor-pointer"
                        >
                          Editar
                        </button>

                        @if (tx.status !== 'CANCELED') {
                          <button
                            type="button"
                            (click)="requestCancel(tx)"
                            title="Cancelar lançamento"
                            class="rounded-lg border border-border bg-background px-2.5 py-1 text-xs font-medium text-text-secondary hover:border-pending/50 hover:text-pending transition-colors cursor-pointer"
                          >
                            Cancelar
                          </button>
                        }

                        <button
                          type="button"
                          (click)="requestDelete(tx)"
                          title="Excluir lançamento"
                          class="rounded-lg border border-border bg-background px-2.5 py-1 text-xs font-medium text-text-secondary hover:border-expense/50 hover:text-expense transition-colors cursor-pointer"
                        >
                          Excluir
                        </button>
                      </div>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>

        <!-- Lista em Cards para Mobile -->
        <div class="md:hidden space-y-3">
          @for (tx of transactions(); track tx.id) {
            <div
              class="rounded-2xl border border-border bg-surface p-4 shadow-xs space-y-3"
              [class.opacity-65]="tx.status === 'CANCELED'"
            >
              <div class="flex items-start justify-between gap-2">
                <div>
                  <span class="text-xs text-text-muted">{{ tx.date | date: 'dd/MM/yyyy' }}</span>
                  <h3
                    class="text-sm font-bold text-text"
                    [class.line-through]="tx.status === 'CANCELED'"
                  >
                    {{ tx.description }}
                  </h3>
                </div>

                <div class="text-right">
                  <p
                    class="text-sm font-bold"
                    [class.text-income]="tx.type === 'INCOME' && tx.status !== 'CANCELED'"
                    [class.text-expense]="tx.type === 'EXPENSE' && tx.status !== 'CANCELED'"
                    [class.text-cancelled]="tx.status === 'CANCELED'"
                  >
                    {{ tx.type === 'INCOME' ? '+' : '-' }}
                    {{ getEffectiveDisplayAmount(tx) | currency: 'BRL' }}
                  </p>
                  @if (hasDifferentRealizedAmount(tx)) {
                    <p class="text-[11px] text-text-muted">
                      Previsto: {{ tx.amount | currency: 'BRL' }}
                    </p>
                  }
                </div>
              </div>

              <div class="flex flex-wrap items-center gap-2">
                @if (tx.categoryName) {
                  <span
                    class="rounded-md border border-support/30 bg-support/10 px-2 py-0.5 text-[11px] font-medium text-support"
                  >
                    {{ tx.categoryName }}
                  </span>
                }

                @if (tx.type === 'INCOME') {
                  <span
                    class="rounded-md bg-income/15 px-2 py-0.5 text-[11px] font-semibold text-income"
                  >
                    ↑ Entrada
                  </span>
                } @else {
                  <span
                    class="rounded-md bg-expense/15 px-2 py-0.5 text-[11px] font-semibold text-expense"
                  >
                    ↓ Despesa
                  </span>
                }

                @switch (tx.status) {
                  @case ('COMPLETED') {
                    <span
                      class="rounded-md bg-income/15 px-2 py-0.5 text-[11px] font-semibold text-income"
                    >
                      Efetivado
                    </span>
                  }
                  @case ('PENDING') {
                    <span
                      class="rounded-md bg-pending/15 px-2 py-0.5 text-[11px] font-semibold text-pending"
                    >
                      Pendente
                    </span>
                  }
                  @case ('CANCELED') {
                    <span
                      class="rounded-md bg-cancelled/20 px-2 py-0.5 text-[11px] font-semibold text-cancelled"
                    >
                      Cancelado
                    </span>
                  }
                }
              </div>

              <div class="flex flex-wrap items-center justify-end gap-2 border-t border-border pt-3">
                @if (tx.status === 'PENDING') {
                  <button
                    type="button"
                    (click)="openCompleteModal(tx)"
                    class="rounded-lg bg-income px-3 py-1.5 text-xs font-semibold text-white cursor-pointer"
                  >
                    Efetivar
                  </button>
                }
                <button
                  type="button"
                  (click)="openEditModal(tx)"
                  class="rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-text-secondary cursor-pointer"
                >
                  Editar
                </button>
                @if (tx.status !== 'CANCELED') {
                  <button
                    type="button"
                    (click)="requestCancel(tx)"
                    class="rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-pending cursor-pointer"
                  >
                    Cancelar
                  </button>
                }
                <button
                  type="button"
                  (click)="requestDelete(tx)"
                  class="rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-expense cursor-pointer"
                >
                  Excluir
                </button>
              </div>
            </div>
          }
        </div>
      }

      <!-- Modal de Criar / Editar Transação -->
      <app-transaction-form-modal
        [open]="formModalOpen()"
        [initialType]="formModalInitialType()"
        [editingTransaction]="editingTransaction()"
        [categories]="categories()"
        (saved)="onTransactionSaved()"
        (closed)="closeFormModal()"
      />

      <!-- Modal de Efetivar Transação -->
      <app-complete-transaction-modal
        [open]="completeModalOpen()"
        [transaction]="completingTransaction()"
        (completed)="onTransactionCompleted()"
        (closed)="closeCompleteModal()"
      />

      <!-- Modal de Confirmação (Cancelar / Excluir) -->
      <app-confirm-dialog
        [open]="confirmDialogOpen()"
        [title]="confirmDialogTitle()"
        [message]="confirmDialogMessage()"
        [confirmLabel]="confirmDialogButtonLabel()"
        [variant]="confirmDialogVariant()"
        [loading]="isExecutingConfirmAction()"
        (confirmed)="executeConfirmedAction()"
        (cancelled)="closeConfirmDialog()"
      />
    </div>
  `,
})
export class TransactionsPageComponent implements OnInit {
  private readonly transactionService = inject(TransactionService);
  private readonly categoryService = inject(CategoryService);
  private readonly route = inject(ActivatedRoute);
  private readonly toastService = inject(ToastService);

  readonly transactions = signal<TransactionResponseDTO[]>([]);
  readonly categories = signal<CategoryResponseDTO[]>([]);
  readonly isLoading = signal(false);
  readonly filterError = signal<string | null>(null);

  // Filtros
  filterType: TransactionType | '' = '';
  filterStatus: TransactionStatus | '' = '';
  filterCategoryId = '';
  filterRecurringTransactionId = '';
  filterStartDate = '';
  filterEndDate = '';

  // Estado do Modal de Criação/Edição
  readonly formModalOpen = signal(false);
  readonly formModalInitialType = signal<TransactionType>('EXPENSE');
  readonly editingTransaction = signal<TransactionResponseDTO | null>(null);

  // Estado do Modal de Efetivação
  readonly completeModalOpen = signal(false);
  readonly completingTransaction = signal<TransactionResponseDTO | null>(null);

  // Estado do Dialog de Confirmação (Cancelar ou Excluir)
  readonly confirmDialogOpen = signal(false);
  readonly confirmActionType = signal<'cancel' | 'delete' | null>(null);
  readonly targetTransaction = signal<TransactionResponseDTO | null>(null);
  readonly isExecutingConfirmAction = signal(false);

  readonly summaryMetrics = computed(() => {
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
        const value = tx.realizedAmount ?? tx.amount;
        if (tx.type === 'INCOME') {
          realizedIncome += value;
        } else {
          realizedExpense += value;
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

  readonly confirmDialogTitle = computed(() =>
    this.confirmActionType() === 'delete'
      ? 'Excluir lançamento'
      : 'Cancelar lançamento'
  );

  readonly confirmDialogMessage = computed(() => {
    const tx = this.targetTransaction();
    if (!tx) {
      return '';
    }
    if (this.confirmActionType() === 'delete') {
      return `Deseja excluir permanentemente "${tx.description}"? Esta ação não poderá ser desfeita.`;
    }
    return `Deseja marcar "${tx.description}" como cancelado? Lançamentos cancelados são desconsiderados nos saldos.`;
  });

  readonly confirmDialogButtonLabel = computed(() =>
    this.confirmActionType() === 'delete' ? 'Sim, excluir' : 'Sim, cancelar'
  );

  readonly confirmDialogVariant = computed<'danger' | 'warning'>(() =>
    this.confirmActionType() === 'delete' ? 'danger' : 'warning'
  );

  ngOnInit(): void {
    const queryCategoryId = this.route.snapshot.queryParamMap.get('categoryId');
    if (queryCategoryId) {
      this.filterCategoryId = queryCategoryId;
    }

    const queryRecurringId = this.route.snapshot.queryParamMap.get('recurringTransactionId');
    if (queryRecurringId) {
      this.filterRecurringTransactionId = queryRecurringId;
    }

    this.loadCategories();
    this.loadTransactions();
  }

  hasActiveFilters(): boolean {
    return Boolean(
      this.filterType ||
      this.filterStatus ||
      this.filterCategoryId ||
      this.filterRecurringTransactionId ||
      this.filterStartDate ||
      this.filterEndDate
    );
  }

  applyFilters(): void {
    this.filterError.set(null);

    if (
      this.filterStartDate &&
      this.filterEndDate &&
      this.filterStartDate > this.filterEndDate
    ) {
      this.filterError.set('A data inicial não pode ser posterior à data final.');
      return;
    }

    this.loadTransactions();
  }

  clearFilters(): void {
    this.filterType = '';
    this.filterStatus = '';
    this.filterCategoryId = '';
    this.filterRecurringTransactionId = '';
    this.filterStartDate = '';
    this.filterEndDate = '';
    this.filterError.set(null);
    this.loadTransactions();
  }

  loadCategories(): void {
    this.categoryService.findAll().subscribe({
      next: (list) => this.categories.set(list),
    });
  }

  loadTransactions(): void {
    const filters: TransactionFilters = {
      type: this.filterType,
      status: this.filterStatus,
      categoryId: this.filterCategoryId,
      recurringTransactionId: this.filterRecurringTransactionId,
      startDate: this.filterStartDate,
      endDate: this.filterEndDate,
    };

    this.isLoading.set(true);
    this.transactionService
      .findAll(filters)
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (data) => {
          this.transactions.set(data);
        },
        error: (err: unknown) => {
          const parsed = parseHttpError(err);
          this.toastService.error(parsed.message, 'Erro ao carregar transações');
        },
      });
  }

  getEffectiveDisplayAmount(tx: TransactionResponseDTO): number {
    if (tx.status === 'COMPLETED' && tx.realizedAmount !== null) {
      return tx.realizedAmount;
    }
    return tx.amount;
  }

  hasDifferentRealizedAmount(tx: TransactionResponseDTO): boolean {
    return (
      tx.status === 'COMPLETED' &&
      tx.realizedAmount !== null &&
      Number(tx.realizedAmount) !== Number(tx.amount)
    );
  }

  openCreateModal(type: TransactionType): void {
    this.editingTransaction.set(null);
    this.formModalInitialType.set(type);
    this.formModalOpen.set(true);
  }

  openEditModal(tx: TransactionResponseDTO): void {
    this.editingTransaction.set(tx);
    this.formModalInitialType.set(tx.type);
    this.formModalOpen.set(true);
  }

  closeFormModal(): void {
    this.formModalOpen.set(false);
    this.editingTransaction.set(null);
  }

  onTransactionSaved(): void {
    this.closeFormModal();
    this.loadCategories();
    this.loadTransactions();
  }

  openCompleteModal(tx: TransactionResponseDTO): void {
    this.completingTransaction.set(tx);
    this.completeModalOpen.set(true);
  }

  closeCompleteModal(): void {
    this.completeModalOpen.set(false);
    this.completingTransaction.set(null);
  }

  onTransactionCompleted(): void {
    this.closeCompleteModal();
    this.loadTransactions();
  }

  requestCancel(tx: TransactionResponseDTO): void {
    this.targetTransaction.set(tx);
    this.confirmActionType.set('cancel');
    this.confirmDialogOpen.set(true);
  }

  requestDelete(tx: TransactionResponseDTO): void {
    this.targetTransaction.set(tx);
    this.confirmActionType.set('delete');
    this.confirmDialogOpen.set(true);
  }

  closeConfirmDialog(): void {
    if (!this.isExecutingConfirmAction()) {
      this.confirmDialogOpen.set(false);
      this.targetTransaction.set(null);
      this.confirmActionType.set(null);
    }
  }

  executeConfirmedAction(): void {
    const tx = this.targetTransaction();
    const action = this.confirmActionType();
    if (!tx || !action) {
      return;
    }

    this.isExecutingConfirmAction.set(true);

    if (action === 'cancel') {
      this.transactionService
        .cancel(tx.id)
        .pipe(finalize(() => this.isExecutingConfirmAction.set(false)))
        .subscribe({
          next: () => {
            this.toastService.info('Transação marcada como cancelada.');
            this.closeConfirmDialog();
            this.loadTransactions();
          },
          error: (err: unknown) => {
            const parsed = parseHttpError(err);
            this.toastService.error(parsed.message);
          },
        });
      return;
    }

    this.transactionService
      .delete(tx.id)
      .pipe(finalize(() => this.isExecutingConfirmAction.set(false)))
      .subscribe({
        next: () => {
          this.toastService.success('Transação excluída com sucesso.');
          this.closeConfirmDialog();
          this.loadTransactions();
        },
        error: (err: unknown) => {
          const parsed = parseHttpError(err);
          this.toastService.error(parsed.message);
        },
      });
  }
}
