import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { parseHttpError } from '../../core/http/api-error.model';
import { CategoryResponseDTO } from '../../core/models/category.model';
import {
  RecurringTransactionFilters,
  RecurringTransactionResponseDTO,
} from '../../core/models/recurring-transaction.model';
import { TransactionType } from '../../core/models/transaction.model';
import { CategoryService } from '../../core/services/category.service';
import { RecurringTransactionService } from '../../core/services/recurring-transaction.service';
import { ToastService } from '../../shared/services/toast.service';
import { RecurrenceDeleteModalComponent } from './components/recurrence-delete-modal.component';
import {
  RecurrenceFormModalComponent,
  RecurrenceMode,
} from './components/recurrence-form-modal.component';
import { RecurrenceOccurrencesModalComponent } from './components/recurrence-occurrences-modal.component';

@Component({
  selector: 'app-recurrences-page',
  standalone: true,
  imports: [
    FormsModule,
    CurrencyPipe,
    DatePipe,
    RecurrenceFormModalComponent,
    RecurrenceDeleteModalComponent,
    RecurrenceOccurrencesModalComponent,
  ],
  template: `
    <div class="space-y-6">
      <!-- Cabeçalho e Ações Rápidas -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 class="text-2xl font-bold text-text">Recorrências e Parcelamentos</h1>
          <p class="mt-1 text-sm text-text-secondary">
            Automatize contas fixas, salários mensais e compras parceladas preservando seu histórico.
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            (click)="openCreateModal('FIXED')"
            class="inline-flex items-center gap-2 rounded-xl bg-support px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:opacity-95 transition-opacity cursor-pointer"
          >
            <span class="text-sm font-bold">+</span>
            <span>Nova Recorrência Fixa</span>
          </button>

          <button
            type="button"
            (click)="openCreateModal('INSTALLMENT')"
            class="inline-flex items-center gap-2 rounded-xl bg-info px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:opacity-95 transition-opacity cursor-pointer"
          >
            <span class="text-sm font-bold">+</span>
            <span>Novo Parcelamento</span>
          </button>
        </div>
      </div>

      <!-- Cards de Indicadores das Séries Ativas -->
      <section class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div class="rounded-2xl border border-border bg-surface p-4 shadow-xs">
          <div class="flex items-center justify-between">
            <span class="text-xs font-medium text-text-secondary">Recorrências Fixas Ativas</span>
            <span class="h-2 w-2 rounded-full bg-support"></span>
          </div>
          <p class="mt-2 text-lg font-bold text-text">{{ metrics().activeFixedCount }}</p>
          <p class="mt-0.5 text-[11px] text-text-muted">Séries contínuas mensais</p>
        </div>

        <div class="rounded-2xl border border-border bg-surface p-4 shadow-xs">
          <div class="flex items-center justify-between">
            <span class="text-xs font-medium text-text-secondary">Parcelamentos Ativos</span>
            <span class="h-2 w-2 rounded-full bg-info"></span>
          </div>
          <p class="mt-2 text-lg font-bold text-info">{{ metrics().activeInstallmentCount }}</p>
          <p class="mt-0.5 text-[11px] text-text-muted">Séries com prazo determinado</p>
        </div>

        <div class="rounded-2xl border border-border bg-surface p-4 shadow-xs">
          <div class="flex items-center justify-between">
            <span class="text-xs font-medium text-text-secondary">Receita Mensal Recorrente</span>
            <span class="h-2 w-2 rounded-full bg-income"></span>
          </div>
          <p class="mt-2 text-lg font-bold text-income">
            {{ metrics().monthlyIncomeCommitment | currency: 'BRL' }}
          </p>
          <p class="mt-0.5 text-[11px] text-text-muted">Soma mensal de entradas ativas</p>
        </div>

        <div class="rounded-2xl border border-border bg-surface p-4 shadow-xs">
          <div class="flex items-center justify-between">
            <span class="text-xs font-medium text-text-secondary">Compromisso Mensal (Despesas)</span>
            <span class="h-2 w-2 rounded-full bg-expense"></span>
          </div>
          <p class="mt-2 text-lg font-bold text-expense">
            {{ metrics().monthlyExpenseCommitment | currency: 'BRL' }}
          </p>
          <p class="mt-0.5 text-[11px] text-text-muted">Soma mensal de despesas ativas</p>
        </div>
      </section>

      <!-- Barra de Filtros -->
      <section class="rounded-2xl border border-border bg-surface p-4 sm:p-5 shadow-xs">
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 items-end">
          <!-- Modalidade (Local) -->
          <div>
            <label for="rec-filter-mode" class="block text-xs font-medium text-text-secondary mb-1">
              Modalidade
            </label>
            <select
              id="rec-filter-mode"
              [(ngModel)]="filterModality"
              class="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-text focus:outline-none focus:ring-2 focus:ring-support"
            >
              <option value="ALL">Recorrências e Parcelamentos</option>
              <option value="FIXED">Apenas Recorrências Fixas</option>
              <option value="INSTALLMENT">Apenas Parcelamentos</option>
            </select>
          </div>

          <!-- Status (API) -->
          <div>
            <label for="rec-filter-active" class="block text-xs font-medium text-text-secondary mb-1">
              Status da Série
            </label>
            <select
              id="rec-filter-active"
              [(ngModel)]="filterActive"
              (ngModelChange)="loadRecurrences()"
              class="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-text focus:outline-none focus:ring-2 focus:ring-support"
            >
              <option value="">Todas (Ativas e Encerradas)</option>
              <option value="true">Apenas Ativas</option>
              <option value="false">Apenas Encerradas</option>
            </select>
          </div>

          <!-- Tipo (API) -->
          <div>
            <label for="rec-filter-type" class="block text-xs font-medium text-text-secondary mb-1">
              Tipo
            </label>
            <select
              id="rec-filter-type"
              [(ngModel)]="filterType"
              (ngModelChange)="loadRecurrences()"
              class="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-text focus:outline-none focus:ring-2 focus:ring-support"
            >
              <option value="">Entradas e Despesas</option>
              <option value="INCOME">Apenas Entradas</option>
              <option value="EXPENSE">Apenas Despesas</option>
            </select>
          </div>

          <!-- Categoria (API) -->
          <div>
            <label for="rec-filter-category" class="block text-xs font-medium text-text-secondary mb-1">
              Categoria
            </label>
            <select
              id="rec-filter-category"
              [(ngModel)]="filterCategoryId"
              (ngModelChange)="loadRecurrences()"
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

          <!-- Botões -->
          <div class="flex items-center gap-2">
            <button
              type="button"
              (click)="loadRecurrences()"
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
            Carregando suas recorrências e parcelamentos...
          </p>
        </div>
      } @else if (displayedRecurrences().length === 0) {
        <!-- Estado Vazio -->
        <div
          class="flex flex-col items-center justify-center rounded-2xl border border-border bg-surface px-6 py-14 text-center"
        >
          <div
            class="flex h-12 w-12 items-center justify-center rounded-2xl bg-support/15 text-support font-bold text-lg"
          >
            ↻
          </div>
          <h2 class="mt-4 text-base font-bold text-text">
            Nenhuma recorrência ou parcelamento encontrado
          </h2>
          <p class="mt-1 max-w-md text-xs text-text-secondary">
            Cadastre despesas fixas (aluguel, assinaturas), receitas recorrentes (salário) ou compras parceladas para gerar automaticamente as ocorrências futuras.
          </p>

          <div class="mt-5 flex flex-wrap items-center justify-center gap-2.5">
            <button
              type="button"
              (click)="openCreateModal('FIXED')"
              class="rounded-xl bg-support px-4 py-2 text-xs font-semibold text-white hover:opacity-95 transition-opacity cursor-pointer"
            >
              + Nova Recorrência Fixa
            </button>
            <button
              type="button"
              (click)="openCreateModal('INSTALLMENT')"
              class="rounded-xl bg-info px-4 py-2 text-xs font-semibold text-white hover:opacity-95 transition-opacity cursor-pointer"
            >
              + Novo Parcelamento
            </button>
          </div>
        </div>
      } @else {
        <!-- Grid de Cartões de Recorrências / Parcelamentos -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          @for (rec of displayedRecurrences(); track rec.id) {
            <div
              class="flex flex-col justify-between rounded-2xl border border-border bg-surface p-5 shadow-xs transition-all hover:border-support/40"
              [class.opacity-70]="!rec.active"
            >
              <div>
                <!-- Topo do Card: Badges e Valor -->
                <div class="flex items-start justify-between gap-3">
                  <div class="flex flex-wrap items-center gap-2">
                    @if (rec.occurrences !== null) {
                      <span
                        class="rounded-full bg-info/15 px-2.5 py-0.5 text-[11px] font-semibold text-info"
                      >
                        Parcelamento ({{ rec.occurrences }}x)
                      </span>
                    } @else {
                      <span
                        class="rounded-full bg-support/15 px-2.5 py-0.5 text-[11px] font-semibold text-support"
                      >
                        Recorrência Fixa
                      </span>
                    }

                    @if (rec.type === 'INCOME') {
                      <span
                        class="rounded-full bg-income/15 px-2.5 py-0.5 text-[11px] font-semibold text-income"
                      >
                        ↑ Entrada
                      </span>
                    } @else {
                      <span
                        class="rounded-full bg-expense/15 px-2.5 py-0.5 text-[11px] font-semibold text-expense"
                      >
                        ↓ Despesa
                      </span>
                    }

                    @if (rec.active) {
                      <span
                        class="rounded-full bg-income/15 px-2 py-0.5 text-[10px] font-semibold text-income"
                      >
                        Ativa
                      </span>
                    } @else {
                      <span
                        class="rounded-full bg-cancelled/20 px-2 py-0.5 text-[10px] font-semibold text-cancelled"
                      >
                        Encerrada
                      </span>
                    }
                  </div>

                  <div class="text-right shrink-0">
                    <p
                      class="text-base font-bold"
                      [class.text-income]="rec.type === 'INCOME'"
                      [class.text-expense]="rec.type === 'EXPENSE'"
                    >
                      {{ rec.amount | currency: 'BRL' }}
                      <span class="text-[11px] font-normal text-text-muted">/mês</span>
                    </p>
                    @if (rec.occurrences !== null) {
                      <p class="text-[11px] text-text-muted">
                        Total: {{ (rec.amount * rec.occurrences) | currency: 'BRL' }}
                      </p>
                    }
                  </div>
                </div>

                <!-- Descrição e Detalhes -->
                <h3 class="mt-3 text-base font-bold text-text">
                  {{ rec.description }}
                </h3>

                <div class="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-text-secondary">
                  <span>Vencimento: <strong class="text-text">Todo dia {{ rec.dayOfMonth }}</strong></span>
                  <span>Início: <strong class="text-text">{{ rec.startDate | date: 'dd/MM/yyyy' }}</strong></span>
                  @if (rec.generatedUntil) {
                    <span>
                      Gerado até:
                      <strong class="text-text">{{ rec.generatedUntil | date: 'dd/MM/yyyy' }}</strong>
                    </span>
                  }
                </div>

                @if (rec.categoryName) {
                  <div class="mt-2.5">
                    <span
                      class="inline-block rounded-md border border-support/30 bg-support/10 px-2 py-0.5 text-[11px] font-medium text-support"
                    >
                      {{ rec.categoryName }}
                    </span>
                  </div>
                }
              </div>

              <!-- Ações do Card -->
              <div class="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3.5">
                <button
                  type="button"
                  (click)="openOccurrencesModal(rec)"
                  class="rounded-xl bg-background border border-border px-3 py-1.5 text-xs font-semibold text-support hover:bg-support hover:text-white transition-colors cursor-pointer"
                >
                  Ver ocorrências
                </button>

                <div class="flex items-center gap-1.5">
                  @if (rec.active) {
                    <button
                      type="button"
                      (click)="openEditModal(rec)"
                      class="rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs font-medium text-text-secondary hover:text-text transition-colors cursor-pointer"
                    >
                      Editar
                    </button>
                  }

                  <button
                    type="button"
                    (click)="openDeleteModal(rec)"
                    class="rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs font-medium text-text-secondary hover:border-expense/40 hover:text-expense transition-colors cursor-pointer"
                  >
                    {{ rec.active ? 'Encerrar / Excluir' : 'Remover pendentes' }}
                  </button>
                </div>
              </div>
            </div>
          }
        </div>
      }

      <!-- Modal Criar / Editar Recorrência ou Parcelamento -->
      <app-recurrence-form-modal
        [open]="formModalOpen()"
        [initialMode]="formInitialMode()"
        [editingRecurrence]="editingRecurrence()"
        [categories]="categories()"
        (saved)="onRecurrenceSaved()"
        (closed)="closeFormModal()"
      />

      <!-- Modal Encerrar / Excluir com Escopo -->
      <app-recurrence-delete-modal
        [open]="deleteModalOpen()"
        [recurrence]="deletingRecurrence()"
        (deleted)="onRecurrenceDeleted()"
        (closed)="closeDeleteModal()"
      />

      <!-- Modal de Cronograma de Ocorrências -->
      <app-recurrence-occurrences-modal
        [open]="occurrencesModalOpen()"
        [recurrence]="selectedRecurrenceForOccurrences()"
        (updated)="loadRecurrences()"
        (closed)="closeOccurrencesModal()"
      />
    </div>
  `,
})
export class RecurrencesPageComponent implements OnInit {
  private readonly recurringService = inject(RecurringTransactionService);
  private readonly categoryService = inject(CategoryService);
  private readonly toastService = inject(ToastService);

  readonly recurrences = signal<RecurringTransactionResponseDTO[]>([]);
  readonly categories = signal<CategoryResponseDTO[]>([]);
  readonly isLoading = signal(false);

  // Filtros
  filterModality: 'ALL' | 'FIXED' | 'INSTALLMENT' = 'ALL';
  filterActive: '' | 'true' | 'false' = '';
  filterType: TransactionType | '' = '';
  filterCategoryId = '';

  // Estado Modal Criar/Editar
  readonly formModalOpen = signal(false);
  readonly formInitialMode = signal<RecurrenceMode>('FIXED');
  readonly editingRecurrence = signal<RecurringTransactionResponseDTO | null>(null);

  // Estado Modal Excluir
  readonly deleteModalOpen = signal(false);
  readonly deletingRecurrence = signal<RecurringTransactionResponseDTO | null>(null);

  // Estado Modal Ocorrências
  readonly occurrencesModalOpen = signal(false);
  readonly selectedRecurrenceForOccurrences = signal<RecurringTransactionResponseDTO | null>(null);

  readonly displayedRecurrences = computed(() => {
    const all = this.recurrences();
    if (this.filterModality === 'FIXED') {
      return all.filter((r) => r.occurrences === null);
    }
    if (this.filterModality === 'INSTALLMENT') {
      return all.filter((r) => r.occurrences !== null);
    }
    return all;
  });

  readonly metrics = computed(() => {
    let activeFixedCount = 0;
    let activeInstallmentCount = 0;
    let monthlyIncomeCommitment = 0;
    let monthlyExpenseCommitment = 0;

    for (const r of this.recurrences()) {
      if (!r.active) {
        continue;
      }
      if (r.occurrences === null) {
        activeFixedCount++;
      } else {
        activeInstallmentCount++;
      }
      if (r.type === 'INCOME') {
        monthlyIncomeCommitment += Number(r.amount);
      } else {
        monthlyExpenseCommitment += Number(r.amount);
      }
    }

    return {
      activeFixedCount,
      activeInstallmentCount,
      monthlyIncomeCommitment,
      monthlyExpenseCommitment,
    };
  });

  ngOnInit(): void {
    this.loadCategories();
    this.loadRecurrences();
  }

  hasActiveFilters(): boolean {
    return Boolean(
      this.filterModality !== 'ALL' ||
        this.filterActive ||
        this.filterType ||
        this.filterCategoryId
    );
  }

  clearFilters(): void {
    this.filterModality = 'ALL';
    this.filterActive = '';
    this.filterType = '';
    this.filterCategoryId = '';
    this.loadRecurrences();
  }

  loadCategories(): void {
    this.categoryService.findAll().subscribe({
      next: (list) => this.categories.set(list),
    });
  }

  loadRecurrences(): void {
    const filters: RecurringTransactionFilters = {
      active:
        this.filterActive === 'true'
          ? true
          : this.filterActive === 'false'
            ? false
            : null,
      type: this.filterType,
      categoryId: this.filterCategoryId,
    };

    this.isLoading.set(true);
    this.recurringService
      .findAll(filters)
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (list) => this.recurrences.set(list),
        error: (err: unknown) => {
          const parsed = parseHttpError(err);
          this.toastService.error(parsed.message, 'Erro ao carregar recorrências');
        },
      });
  }

  openCreateModal(mode: RecurrenceMode): void {
    this.editingRecurrence.set(null);
    this.formInitialMode.set(mode);
    this.formModalOpen.set(true);
  }

  openEditModal(rec: RecurringTransactionResponseDTO): void {
    this.editingRecurrence.set(rec);
    this.formInitialMode.set(rec.occurrences !== null ? 'INSTALLMENT' : 'FIXED');
    this.formModalOpen.set(true);
  }

  closeFormModal(): void {
    this.formModalOpen.set(false);
    this.editingRecurrence.set(null);
  }

  onRecurrenceSaved(): void {
    this.closeFormModal();
    this.loadCategories();
    this.loadRecurrences();
  }

  openDeleteModal(rec: RecurringTransactionResponseDTO): void {
    this.deletingRecurrence.set(rec);
    this.deleteModalOpen.set(true);
  }

  closeDeleteModal(): void {
    this.deleteModalOpen.set(false);
    this.deletingRecurrence.set(null);
  }

  onRecurrenceDeleted(): void {
    this.closeDeleteModal();
    this.loadRecurrences();
  }

  openOccurrencesModal(rec: RecurringTransactionResponseDTO): void {
    this.selectedRecurrenceForOccurrences.set(rec);
    this.occurrencesModalOpen.set(true);
  }

  closeOccurrencesModal(): void {
    this.occurrencesModalOpen.set(false);
    this.selectedRecurrenceForOccurrences.set(null);
  }
}
