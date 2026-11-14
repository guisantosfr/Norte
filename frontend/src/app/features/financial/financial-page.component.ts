import { CurrencyPipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize, forkJoin } from 'rxjs';
import { parseHttpError } from '../../core/http/api-error.model';
import {
  CategoryFinancialSummaryDTO,
  FinancialCategoryFilters,
  FinancialSummaryDTO,
} from '../../core/models/financial.model';
import { TransactionStatus, TransactionType } from '../../core/models/transaction.model';
import { FinancialService } from '../../core/services/financial.service';
import { ToastService } from '../../shared/services/toast.service';
import { CategoryReportModalComponent } from './components/category-report-modal.component';

type PeriodPreset = 'current-month' | 'previous-month' | 'current-year' | 'all' | 'custom';

@Component({
  selector: 'app-financial-page',
  standalone: true,
  imports: [FormsModule, CurrencyPipe, RouterLink, CategoryReportModalComponent],
  template: `
    <div class="space-y-6">
      <!-- Cabeçalho -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 class="text-2xl font-bold text-text">Indicadores e Visão Financeira</h1>
          <p class="mt-1 text-sm text-text-secondary">
            Consulte seus saldos acumulados, resultados do período e distribuição por categoria.
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <a
            routerLink="/categories"
            class="rounded-xl border border-border bg-surface px-4 py-2 text-xs font-semibold text-text hover:bg-background transition-colors"
          >
            Gerenciar Categorias
          </a>
          <a
            routerLink="/transactions"
            class="rounded-xl bg-support px-4 py-2 text-xs font-semibold text-white shadow-sm hover:opacity-95 transition-opacity"
          >
            Ver Transações
          </a>
        </div>
      </div>

      <!-- Filtro de Período -->
      <section class="rounded-2xl border border-border bg-surface p-4 sm:p-5 shadow-xs space-y-4">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div class="flex flex-wrap items-center gap-2">
            <button
              type="button"
              (click)="applyPreset('current-month')"
              class="rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-colors cursor-pointer"
              [class.bg-support]="activePreset() === 'current-month'"
              [class.text-white]="activePreset() === 'current-month'"
              [class.bg-background]="activePreset() !== 'current-month'"
              [class.text-text-secondary]="activePreset() !== 'current-month'"
            >
              Mês Atual
            </button>

            <button
              type="button"
              (click)="applyPreset('previous-month')"
              class="rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-colors cursor-pointer"
              [class.bg-support]="activePreset() === 'previous-month'"
              [class.text-white]="activePreset() === 'previous-month'"
              [class.bg-background]="activePreset() !== 'previous-month'"
              [class.text-text-secondary]="activePreset() !== 'previous-month'"
            >
              Mês Anterior
            </button>

            <button
              type="button"
              (click)="applyPreset('current-year')"
              class="rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-colors cursor-pointer"
              [class.bg-support]="activePreset() === 'current-year'"
              [class.text-white]="activePreset() === 'current-year'"
              [class.bg-background]="activePreset() !== 'current-year'"
              [class.text-text-secondary]="activePreset() !== 'current-year'"
            >
              Ano Atual
            </button>

            <button
              type="button"
              (click)="applyPreset('all')"
              class="rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-colors cursor-pointer"
              [class.bg-support]="activePreset() === 'all'"
              [class.text-white]="activePreset() === 'all'"
              [class.bg-background]="activePreset() !== 'all'"
              [class.text-text-secondary]="activePreset() !== 'all'"
            >
              Todo o Histórico
            </button>
          </div>

          <span class="text-xs text-text-muted">
            @if (startDate && endDate) {
              Período: <strong class="text-text">{{ startDate }}</strong> até
              <strong class="text-text">{{ endDate }}</strong>
            } @else {
              Período: <strong class="text-text">Histórico completo</strong>
            }
          </span>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 items-end border-t border-border pt-3.5">
          <div>
            <label for="fin-start" class="block text-xs font-medium text-text-secondary mb-1">
              Data inicial
            </label>
            <input
              id="fin-start"
              type="date"
              [(ngModel)]="startDate"
              (change)="onCustomDateChange()"
              class="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-text focus:outline-none focus:ring-2 focus:ring-support"
            />
          </div>

          <div>
            <label for="fin-end" class="block text-xs font-medium text-text-secondary mb-1">
              Data final
            </label>
            <input
              id="fin-end"
              type="date"
              [(ngModel)]="endDate"
              (change)="onCustomDateChange()"
              class="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-text focus:outline-none focus:ring-2 focus:ring-support"
            />
          </div>

          <div>
            <label for="fin-type" class="block text-xs font-medium text-text-secondary mb-1">
              Tipo (Análise de Categorias)
            </label>
            <select
              id="fin-type"
              [(ngModel)]="categoryTypeFilter"
              (ngModelChange)="loadFinancialData()"
              class="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-text focus:outline-none focus:ring-2 focus:ring-support"
            >
              <option value="">Entradas e Despesas</option>
              <option value="EXPENSE">Apenas Despesas</option>
              <option value="INCOME">Apenas Entradas</option>
            </select>
          </div>

          <div>
            <label for="fin-status" class="block text-xs font-medium text-text-secondary mb-1">
              Status (Análise de Categorias)
            </label>
            <select
              id="fin-status"
              [(ngModel)]="categoryStatusFilter"
              (ngModelChange)="loadFinancialData()"
              class="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-text focus:outline-none focus:ring-2 focus:ring-support"
            >
              <option value="">Realizados e Pendentes</option>
              <option value="COMPLETED">Apenas Efetivados</option>
              <option value="PENDING">Apenas Pendentes</option>
            </select>
          </div>

          <div>
            <button
              type="button"
              (click)="loadFinancialData()"
              class="w-full rounded-xl bg-support px-4 py-2 text-xs font-semibold text-white hover:opacity-95 transition-opacity cursor-pointer"
            >
              Atualizar Indicadores
            </button>
          </div>
        </div>

        @if (filterError()) {
          <p class="text-xs text-expense">{{ filterError() }}</p>
        }
      </section>

      @if (isLoading()) {
        <div
          class="flex flex-col items-center justify-center rounded-2xl border border-border bg-surface py-16 text-center"
        >
          <span
            class="inline-block h-7 w-7 animate-spin rounded-full border-3 border-support border-t-transparent"
          ></span>
          <p class="mt-3 text-sm font-medium text-text-secondary">
            Calculando indicadores financeiros...
          </p>
        </div>
      } @else if (summary(); as s) {
        <!-- Bloco 1: Saldos Acumulados (Caixa Atual e Projetado) -->
        <section class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="rounded-2xl border border-border bg-surface p-5 shadow-xs">
            <div class="flex items-center justify-between">
              <span class="text-xs font-semibold uppercase tracking-wider text-text-muted">
                Saldo Atual Realizado (Acumulado)
              </span>
              <span class="rounded-full bg-support/15 px-2.5 py-0.5 text-[11px] font-semibold text-support">
                Caixa Realizado
              </span>
            </div>
            <p
              class="mt-2.5 text-2xl font-bold"
              [class.text-income]="s.currentBalance >= 0"
              [class.text-expense]="s.currentBalance < 0"
            >
              {{ s.currentBalance | currency: 'BRL' }}
            </p>
            <p class="mt-1 text-xs text-text-secondary">
              Soma de todas as entradas menos despesas efetivadas até o fim do período consultado.
            </p>
          </div>

          <div class="rounded-2xl border border-border bg-surface p-5 shadow-xs">
            <div class="flex items-center justify-between">
              <span class="text-xs font-semibold uppercase tracking-wider text-text-muted">
                Saldo Projetado (Acumulado)
              </span>
              <span class="rounded-full bg-info/15 px-2.5 py-0.5 text-[11px] font-semibold text-info">
                Projeção com Pendentes
              </span>
            </div>
            <p
              class="mt-2.5 text-2xl font-bold"
              [class.text-income]="s.projectedBalance >= 0"
              [class.text-expense]="s.projectedBalance < 0"
            >
              {{ s.projectedBalance | currency: 'BRL' }}
            </p>
            <p class="mt-1 text-xs text-text-secondary">
              Saldo estimado caso todas as entradas e despesas pendentes até o fim do período sejam efetivadas.
            </p>
          </div>
        </section>

        <!-- Bloco 2: Indicadores do Período Selecionado -->
        <section class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div class="rounded-2xl border border-border bg-surface p-4 shadow-xs">
            <div class="flex items-center justify-between">
              <span class="text-xs font-medium text-text-secondary">Entradas no Período</span>
              <span class="h-2.5 w-2.5 rounded-full bg-income"></span>
            </div>
            <p class="mt-2 text-lg font-bold text-income">
              {{ s.realizedIncome | currency: 'BRL' }}
            </p>
            <p class="mt-0.5 text-[11px] text-text-muted">
              Pendente a receber: {{ s.pendingIncome | currency: 'BRL' }}
            </p>
          </div>

          <div class="rounded-2xl border border-border bg-surface p-4 shadow-xs">
            <div class="flex items-center justify-between">
              <span class="text-xs font-medium text-text-secondary">Despesas no Período</span>
              <span class="h-2.5 w-2.5 rounded-full bg-expense"></span>
            </div>
            <p class="mt-2 text-lg font-bold text-expense">
              {{ s.realizedExpense | currency: 'BRL' }}
            </p>
            <p class="mt-0.5 text-[11px] text-text-muted">
              Pendente a pagar: {{ s.pendingExpense | currency: 'BRL' }}
            </p>
          </div>

          <div class="rounded-2xl border border-border bg-surface p-4 shadow-xs">
            <div class="flex items-center justify-between">
              <span class="text-xs font-medium text-text-secondary">Resultado Realizado (Período)</span>
              <span class="h-2.5 w-2.5 rounded-full bg-support"></span>
            </div>
            <p
              class="mt-2 text-lg font-bold"
              [class.text-income]="s.periodRealizedResult >= 0"
              [class.text-expense]="s.periodRealizedResult < 0"
            >
              {{ s.periodRealizedResult | currency: 'BRL' }}
            </p>
            <p class="mt-0.5 text-[11px] text-text-muted">
              Entradas efetivadas − Despesas efetivadas
            </p>
          </div>

          <div class="rounded-2xl border border-border bg-surface p-4 shadow-xs">
            <div class="flex items-center justify-between">
              <span class="text-xs font-medium text-text-secondary">Resultado Projetado (Período)</span>
              <span class="h-2.5 w-2.5 rounded-full bg-info"></span>
            </div>
            <p
              class="mt-2 text-lg font-bold"
              [class.text-income]="s.periodProjectedResult >= 0"
              [class.text-expense]="s.periodProjectedResult < 0"
            >
              {{ s.periodProjectedResult | currency: 'BRL' }}
            </p>
            <p class="mt-0.5 text-[11px] text-text-muted">
              Inclui lançamentos pendentes do período
            </p>
          </div>
        </section>

        <!-- Bloco 3: Análise Financeira por Categoria -->
        <section class="rounded-2xl border border-border bg-surface p-5 sm:p-6 shadow-xs space-y-4">
          <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h2 class="text-base font-bold text-text">Análise por Categoria</h2>
              <p class="text-xs text-text-secondary">
                Clique em uma categoria cadastrada para inspecionar os lançamentos detalhados.
              </p>
            </div>

            <span class="text-xs font-medium text-text-muted">
              {{ categorySummaries().length }} grupo(s) com movimentação
            </span>
          </div>

          @if (categorySummaries().length === 0) {
            <div
              class="rounded-xl border border-border bg-background px-6 py-10 text-center text-xs text-text-secondary"
            >
              Nenhuma movimentação encontrada para o período e filtros informados.
            </div>
          } @else {
            <div class="overflow-x-auto">
              <table class="w-full text-left border-collapse">
                <thead>
                  <tr
                    class="border-b border-border text-[11px] font-semibold uppercase tracking-wider text-text-muted"
                  >
                    <th class="py-3 pr-3">Categoria</th>
                    <th class="px-3 py-3 text-right">Entradas (Real. / Pend.)</th>
                    <th class="px-3 py-3 text-right">Despesas (Real. / Pend.)</th>
                    <th class="px-3 py-3 text-right">Saldo Realizado</th>
                    <th class="px-3 py-3 text-right">Saldo Projetado</th>
                    <th class="py-3 pl-3 text-right">Detalhar</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-border text-xs sm:text-sm">
                  @for (cat of categorySummaries(); track cat.categoryId ?? 'uncategorized') {
                    <tr class="hover:bg-background/60 transition-colors">
                      <!-- Nome + Barra de Participação em Despesas -->
                      <td class="py-3.5 pr-3">
                        <div class="flex items-center gap-2">
                          <span class="font-semibold text-text">{{ cat.categoryName }}</span>
                          <span
                            class="rounded-full border border-border bg-background px-2 py-0.5 text-[10px] font-medium text-text-muted"
                          >
                            {{ cat.transactionCount }} lanç.
                          </span>
                        </div>

                        @if (totalCategoryExpense() > 0 && (cat.realizedExpense + cat.pendingExpense) > 0) {
                          <div class="mt-1.5 flex items-center gap-2 max-w-xs">
                            <div class="h-1.5 flex-1 rounded-full bg-background overflow-hidden">
                              <div
                                class="h-full rounded-full bg-expense"
                                [style.width.%]="getExpenseSharePercent(cat)"
                              ></div>
                            </div>
                            <span class="text-[10px] text-text-muted">
                              {{ getExpenseSharePercent(cat) }}% das despesas
                            </span>
                          </div>
                        }
                      </td>

                      <!-- Entradas -->
                      <td class="whitespace-nowrap px-3 py-3.5 text-right">
                        <span class="font-semibold text-income">
                          {{ cat.realizedIncome | currency: 'BRL' }}
                        </span>
                        @if (cat.pendingIncome > 0) {
                          <div class="text-[11px] text-pending">
                            + {{ cat.pendingIncome | currency: 'BRL' }} pend.
                          </div>
                        }
                      </td>

                      <!-- Despesas -->
                      <td class="whitespace-nowrap px-3 py-3.5 text-right">
                        <span class="font-semibold text-expense">
                          {{ cat.realizedExpense | currency: 'BRL' }}
                        </span>
                        @if (cat.pendingExpense > 0) {
                          <div class="text-[11px] text-pending">
                            + {{ cat.pendingExpense | currency: 'BRL' }} pend.
                          </div>
                        }
                      </td>

                      <!-- Resultado Realizado -->
                      <td
                        class="whitespace-nowrap px-3 py-3.5 text-right font-bold"
                        [class.text-income]="cat.netRealizedResult >= 0"
                        [class.text-expense]="cat.netRealizedResult < 0"
                      >
                        {{ cat.netRealizedResult | currency: 'BRL' }}
                      </td>

                      <!-- Resultado Projetado -->
                      <td
                        class="whitespace-nowrap px-3 py-3.5 text-right font-bold"
                        [class.text-income]="cat.netProjectedResult >= 0"
                        [class.text-expense]="cat.netProjectedResult < 0"
                      >
                        {{ cat.netProjectedResult | currency: 'BRL' }}
                      </td>

                      <!-- Ação Drill-down -->
                      <td class="whitespace-nowrap py-3.5 pl-3 text-right">
                        @if (cat.categoryId) {
                          <button
                            type="button"
                            (click)="openCategoryReport(cat)"
                            class="rounded-lg border border-border bg-background px-2.5 py-1 text-xs font-semibold text-support hover:bg-support hover:text-white transition-colors cursor-pointer"
                          >
                            Ver lançamentos
                          </button>
                        } @else {
                          <span class="text-[11px] text-text-muted">Sem vínculo</span>
                        }
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        </section>
      }

      <!-- Modal de Relatório Detalhado da Categoria -->
      <app-category-report-modal
        [open]="reportModalOpen()"
        [categoryId]="selectedCategory()?.categoryId ?? null"
        [categoryName]="selectedCategory()?.categoryName ?? ''"
        [filters]="currentCategoryFilters()"
        (closed)="closeCategoryReport()"
      />
    </div>
  `,
})
export class FinancialPageComponent implements OnInit {
  private readonly financialService = inject(FinancialService);
  private readonly toastService = inject(ToastService);

  readonly summary = signal<FinancialSummaryDTO | null>(null);
  readonly categorySummaries = signal<CategoryFinancialSummaryDTO[]>([]);
  readonly isLoading = signal(false);
  readonly filterError = signal<string | null>(null);
  readonly activePreset = signal<PeriodPreset>('current-month');

  startDate = '';
  endDate = '';
  categoryTypeFilter: TransactionType | '' = '';
  categoryStatusFilter: TransactionStatus | '' = '';

  readonly reportModalOpen = signal(false);
  readonly selectedCategory = signal<CategoryFinancialSummaryDTO | null>(null);

  readonly totalCategoryExpense = computed(() =>
    this.categorySummaries().reduce(
      (acc, item) => acc + Number(item.realizedExpense) + Number(item.pendingExpense),
      0
    )
  );

  readonly currentCategoryFilters = computed<FinancialCategoryFilters>(() => ({
    startDate: this.startDate,
    endDate: this.endDate,
    type: this.categoryTypeFilter,
    status: this.categoryStatusFilter,
  }));

  ngOnInit(): void {
    this.applyPreset('current-month');
  }

  applyPreset(preset: PeriodPreset): void {
    this.activePreset.set(preset);
    const now = new Date();

    if (preset === 'current-month') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      this.startDate = this.formatIsoDate(firstDay);
      this.endDate = this.formatIsoDate(lastDay);
    } else if (preset === 'previous-month') {
      const firstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth(), 0);
      this.startDate = this.formatIsoDate(firstDay);
      this.endDate = this.formatIsoDate(lastDay);
    } else if (preset === 'current-year') {
      const firstDay = new Date(now.getFullYear(), 0, 1);
      const lastDay = new Date(now.getFullYear(), 11, 31);
      this.startDate = this.formatIsoDate(firstDay);
      this.endDate = this.formatIsoDate(lastDay);
    } else if (preset === 'all') {
      this.startDate = '';
      this.endDate = '';
    }

    this.loadFinancialData();
  }

  onCustomDateChange(): void {
    this.activePreset.set('custom');
    this.loadFinancialData();
  }

  loadFinancialData(): void {
    this.filterError.set(null);

    if (this.startDate && this.endDate && this.startDate > this.endDate) {
      this.filterError.set('A data inicial não pode ser posterior à data final.');
      return;
    }

    this.isLoading.set(true);

    forkJoin({
      summary: this.financialService.getSummary(this.startDate, this.endDate),
      byCategory: this.financialService.getSummaryByCategory({
        startDate: this.startDate,
        endDate: this.endDate,
        type: this.categoryTypeFilter,
        status: this.categoryStatusFilter,
      }),
    })
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: ({ summary, byCategory }) => {
          this.summary.set(summary);
          this.categorySummaries.set(byCategory);
        },
        error: (err: unknown) => {
          const parsed = parseHttpError(err);
          this.toastService.error(parsed.message, 'Erro ao carregar visão financeira');
        },
      });
  }

  getExpenseSharePercent(cat: CategoryFinancialSummaryDTO): number {
    const total = this.totalCategoryExpense();
    if (total <= 0) {
      return 0;
    }
    const catTotal = Number(cat.realizedExpense) + Number(cat.pendingExpense);
    return Math.round((catTotal / total) * 100);
  }

  openCategoryReport(cat: CategoryFinancialSummaryDTO): void {
    if (!cat.categoryId) {
      return;
    }
    this.selectedCategory.set(cat);
    this.reportModalOpen.set(true);
  }

  closeCategoryReport(): void {
    this.reportModalOpen.set(false);
    this.selectedCategory.set(null);
  }

  private formatIsoDate(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
}
