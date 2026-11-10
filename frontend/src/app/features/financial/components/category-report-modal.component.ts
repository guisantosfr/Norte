import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, effect, inject, input, output, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { parseHttpError } from '../../../core/http/api-error.model';
import {
  CategoryTransactionsReportDTO,
  FinancialCategoryFilters,
} from '../../../core/models/financial.model';
import { FinancialService } from '../../../core/services/financial.service';

@Component({
  selector: 'app-category-report-modal',
  standalone: true,
  imports: [CurrencyPipe, DatePipe, RouterLink],
  template: `
    @if (open()) {
      <div
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-[1px] overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cat-report-title"
      >
        <div
          class="w-full max-w-3xl rounded-2xl border border-border bg-surface p-6 sm:p-7 shadow-xl my-8"
        >
          <!-- Cabeçalho -->
          <div class="flex items-start justify-between gap-4 border-b border-border pb-4">
            <div>
              <span
                class="inline-flex items-center gap-1.5 rounded-full bg-support/15 px-2.5 py-0.5 text-[11px] font-semibold text-support"
              >
                Detalhamento por Categoria
              </span>
              <h2 id="cat-report-title" class="mt-1 text-lg font-bold text-text">
                {{ report()?.summary?.categoryName || categoryName() }}
              </h2>
            </div>

            <button
              type="button"
              (click)="closed.emit()"
              aria-label="Fechar modal"
              class="rounded-lg p-1.5 text-text-muted hover:bg-background hover:text-text transition-colors cursor-pointer"
            >
              ✕
            </button>
          </div>

          @if (isLoading()) {
            <div class="flex flex-col items-center justify-center py-12 text-center">
              <span
                class="inline-block h-6 w-6 animate-spin rounded-full border-2 border-support border-t-transparent"
              ></span>
              <p class="mt-2.5 text-xs text-text-secondary">
                Carregando relatório da categoria...
              </p>
            </div>
          } @else if (errorMessage()) {
            <div
              role="alert"
              class="mt-4 rounded-xl border border-expense/40 bg-expense/10 px-4 py-3 text-xs text-expense"
            >
              {{ errorMessage() }}
            </div>
          } @else if (report(); as data) {
            <!-- Resumo da Categoria -->
            <div class="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div class="rounded-xl border border-border bg-background p-3.5">
                <span class="text-[11px] font-medium text-text-muted">Entradas Realizadas</span>
                <p class="mt-1 text-sm font-bold text-income">
                  {{ data.summary.realizedIncome | currency: 'BRL' }}
                </p>
                <p class="text-[10px] text-text-muted">
                  Pendente: {{ data.summary.pendingIncome | currency: 'BRL' }}
                </p>
              </div>

              <div class="rounded-xl border border-border bg-background p-3.5">
                <span class="text-[11px] font-medium text-text-muted">Despesas Realizadas</span>
                <p class="mt-1 text-sm font-bold text-expense">
                  {{ data.summary.realizedExpense | currency: 'BRL' }}
                </p>
                <p class="text-[10px] text-text-muted">
                  Pendente: {{ data.summary.pendingExpense | currency: 'BRL' }}
                </p>
              </div>

              <div class="rounded-xl border border-border bg-background p-3.5">
                <span class="text-[11px] font-medium text-text-muted">Saldo Realizado</span>
                <p
                  class="mt-1 text-sm font-bold"
                  [class.text-income]="data.summary.netRealizedResult >= 0"
                  [class.text-expense]="data.summary.netRealizedResult < 0"
                >
                  {{ data.summary.netRealizedResult | currency: 'BRL' }}
                </p>
                <p class="text-[10px] text-text-muted">
                  {{ data.summary.transactionCount }} lançamento(s)
                </p>
              </div>

              <div class="rounded-xl border border-border bg-background p-3.5">
                <span class="text-[11px] font-medium text-text-muted">Resultado Projetado</span>
                <p
                  class="mt-1 text-sm font-bold"
                  [class.text-income]="data.summary.netProjectedResult >= 0"
                  [class.text-expense]="data.summary.netProjectedResult < 0"
                >
                  {{ data.summary.netProjectedResult | currency: 'BRL' }}
                </p>
                <p class="text-[10px] text-text-muted">Inclui pendentes</p>
              </div>
            </div>

            <!-- Lista de Transações da Categoria -->
            <div class="mt-5">
              <h3 class="text-xs font-semibold uppercase tracking-wider text-text-muted mb-2.5">
                Movimentações vinculadas ({{ data.transactions.length }})
              </h3>

              @if (data.transactions.length === 0) {
                <div
                  class="rounded-xl border border-border bg-background p-6 text-center text-xs text-text-secondary"
                >
                  Nenhuma transação encontrada para esta categoria no filtro selecionado.
                </div>
              } @else {
                <div
                  class="max-h-80 overflow-y-auto rounded-xl border border-border bg-background divide-y divide-border"
                >
                  @for (tx of data.transactions; track tx.id) {
                    <div class="flex items-center justify-between gap-3 px-4 py-3 text-xs">
                      <div class="min-w-0 flex-1">
                        <div class="flex items-center gap-2">
                          <span class="font-semibold text-text truncate">{{ tx.description }}</span>
                          @switch (tx.status) {
                            @case ('COMPLETED') {
                              <span
                                class="rounded-full bg-income/15 px-2 py-0.5 text-[10px] font-semibold text-income"
                              >
                                Efetivado
                              </span>
                            }
                            @case ('PENDING') {
                              <span
                                class="rounded-full bg-pending/15 px-2 py-0.5 text-[10px] font-semibold text-pending"
                              >
                                Pendente
                              </span>
                            }
                            @case ('CANCELED') {
                              <span
                                class="rounded-full bg-cancelled/20 px-2 py-0.5 text-[10px] font-semibold text-cancelled"
                              >
                                Cancelado
                              </span>
                            }
                          }
                        </div>
                        <p class="mt-0.5 text-[11px] text-text-muted">
                          {{ tx.date | date: 'dd/MM/yyyy' }}
                        </p>
                      </div>

                      <div
                        class="font-bold whitespace-nowrap"
                        [class.text-income]="tx.type === 'INCOME'"
                        [class.text-expense]="tx.type === 'EXPENSE'"
                      >
                        {{ tx.type === 'INCOME' ? '+' : '-' }}
                        {{ (tx.realizedAmount ?? tx.amount) | currency: 'BRL' }}
                      </div>
                    </div>
                  }
                </div>
              }
            </div>
          }

          <!-- Rodapé -->
          <div class="mt-6 flex items-center justify-between border-t border-border pt-4">
            <a
              routerLink="/transactions"
              [queryParams]="{ categoryId: categoryId() }"
              (click)="closed.emit()"
              class="text-xs font-semibold text-support hover:underline"
            >
              Abrir na página de Transações →
            </a>

            <button
              type="button"
              (click)="closed.emit()"
              class="rounded-xl border border-border bg-background px-4 py-2 text-xs font-semibold text-text-secondary hover:text-text transition-colors cursor-pointer"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    }
  `,
})
export class CategoryReportModalComponent {
  private readonly financialService = inject(FinancialService);

  readonly open = input<boolean>(false);
  readonly categoryId = input<string | null>(null);
  readonly categoryName = input<string>('');
  readonly filters = input<FinancialCategoryFilters>({});

  readonly closed = output<void>();

  readonly isLoading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly report = signal<CategoryTransactionsReportDTO | null>(null);

  constructor() {
    effect(() => {
      const isOpen = this.open();
      const id = this.categoryId();
      const activeFilters = this.filters();

      if (!isOpen || !id) {
        return;
      }

      this.loadReport(id, activeFilters);
    });
  }

  private loadReport(id: string, filters: FinancialCategoryFilters): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.report.set(null);

    this.financialService
      .getCategoryTransactionsReport(id, filters)
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (res) => this.report.set(res),
        error: (err: unknown) => {
          const parsed = parseHttpError(err);
          this.errorMessage.set(parsed.message);
        },
      });
  }
}
