import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize, forkJoin } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { parseHttpError } from '../../core/http/api-error.model';
import { CategoryResponseDTO } from '../../core/models/category.model';
import {
  CategoryFinancialSummaryDTO,
  FinancialCategoryFilters,
  FinancialSummaryDTO,
} from '../../core/models/financial.model';
import { TransactionResponseDTO, TransactionType } from '../../core/models/transaction.model';
import { CategoryService } from '../../core/services/category.service';
import { FinancialService } from '../../core/services/financial.service';
import { TransactionService } from '../../core/services/transaction.service';
import { ToastService } from '../../shared/services/toast.service';
import { CategoryReportModalComponent } from '../financial/components/category-report-modal.component';
import { CompleteTransactionModalComponent } from '../transactions/components/complete-transaction-modal.component';
import { TransactionFormModalComponent } from '../transactions/components/transaction-form-modal.component';

export type TemporalPerspective = 'MONTHLY' | 'QUARTERLY' | 'YEARLY' | 'ALL_TIME' | 'CUSTOM';

const MONTH_NAMES_PT = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  imports: [
    FormsModule,
    CurrencyPipe,
    DatePipe,
    RouterLink,
    TransactionFormModalComponent,
    CompleteTransactionModalComponent,
    CategoryReportModalComponent,
  ],
  template: `
    <div class="space-y-6">
      <!-- Cabeçalho e Ações Rápidas -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 class="text-2xl font-bold text-text">
            Painel Financeiro
          </h1>
          <p class="mt-1 text-sm text-text-secondary">
            Acompanhe sua situação financeira atual e projetada em uma visão centralizada.
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            (click)="openQuickTransactionModal('INCOME')"
            class="inline-flex items-center gap-1.5 rounded-xl bg-support px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:opacity-95 transition-opacity cursor-pointer"
          >
            <span class="font-bold">+</span>
            <span>Nova Transação</span>
          </button>
        </div>
      </div>

      <!-- Barra de Perspectiva Temporal (Visão Mensal por Padrão) -->
      <section class="rounded-2xl border border-border bg-surface p-4 sm:p-5 shadow-xs space-y-4">
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <!-- Seletor de Perspectiva -->
          <div class="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              (click)="setPerspective('MONTHLY')"
              class="rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-colors cursor-pointer"
              [class.bg-support]="perspective() === 'MONTHLY'"
              [class.text-white]="perspective() === 'MONTHLY'"
              [class.bg-background]="perspective() !== 'MONTHLY'"
              [class.text-text-secondary]="perspective() !== 'MONTHLY'"
            >
              Mensal (Padrão)
            </button>

            <button
              type="button"
              (click)="setPerspective('QUARTERLY')"
              class="rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-colors cursor-pointer"
              [class.bg-support]="perspective() === 'QUARTERLY'"
              [class.text-white]="perspective() === 'QUARTERLY'"
              [class.bg-background]="perspective() !== 'QUARTERLY'"
              [class.text-text-secondary]="perspective() !== 'QUARTERLY'"
            >
              Trimestral
            </button>

            <button
              type="button"
              (click)="setPerspective('YEARLY')"
              class="rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-colors cursor-pointer"
              [class.bg-support]="perspective() === 'YEARLY'"
              [class.text-white]="perspective() === 'YEARLY'"
              [class.bg-background]="perspective() !== 'YEARLY'"
              [class.text-text-secondary]="perspective() !== 'YEARLY'"
            >
              Anual
            </button>

            <button
              type="button"
              (click)="setPerspective('ALL_TIME')"
              class="rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-colors cursor-pointer"
              [class.bg-support]="perspective() === 'ALL_TIME'"
              [class.text-white]="perspective() === 'ALL_TIME'"
              [class.bg-background]="perspective() !== 'ALL_TIME'"
              [class.text-text-secondary]="perspective() !== 'ALL_TIME'"
            >
              Acumulado Geral
            </button>

            <button
              type="button"
              (click)="setPerspective('CUSTOM')"
              class="rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-colors cursor-pointer"
              [class.bg-support]="perspective() === 'CUSTOM'"
              [class.text-white]="perspective() === 'CUSTOM'"
              [class.bg-background]="perspective() !== 'CUSTOM'"
              [class.text-text-secondary]="perspective() !== 'CUSTOM'"
            >
              Personalizado
            </button>
          </div>

          <!-- Navegador do Período (Mensal / Trimestral / Anual) -->
          @if (perspective() === 'MONTHLY' || perspective() === 'QUARTERLY' || perspective() === 'YEARLY') {
            <div class="flex items-center gap-2">
              <button
                type="button"
                (click)="navigatePeriod(-1)"
                aria-label="Período anterior"
                class="rounded-xl border border-border bg-background px-3 py-1.5 text-sm font-bold text-text-secondary hover:text-text transition-colors cursor-pointer"
              >
                ←
              </button>

              <div
                class="min-w-[175px] rounded-xl border border-border bg-background px-4 py-1.5 text-center text-sm font-bold text-text"
              >
                {{ periodLabel() }}
              </div>

              <button
                type="button"
                (click)="navigatePeriod(1)"
                aria-label="Próximo período"
                class="rounded-xl border border-border bg-background px-3 py-1.5 text-sm font-bold text-text-secondary hover:text-text transition-colors cursor-pointer"
              >
                →
              </button>

              @if (!isCurrentPeriodSelected()) {
                <button
                  type="button"
                  (click)="resetToToday()"
                  class="rounded-xl bg-support/15 px-3 py-1.5 text-sm font-semibold text-support hover:bg-support hover:text-white transition-colors cursor-pointer"
                >
                  Hoje
                </button>
              }
            </div>
          } @else if (perspective() === 'ALL_TIME') {
            <div class="text-xs font-semibold text-support">
              Exibindo todo o histórico e projeções futuras
            </div>
          }
        </div>

        <!-- Campos de Data para Período Personalizado -->
        @if (perspective() === 'CUSTOM') {
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3.5 items-end border-t border-border pt-3.5">
            <div>
              <label for="dash-custom-start" class="block text-xs font-medium text-text-secondary mb-1">
                Data inicial
              </label>
              <input
                id="dash-custom-start"
                type="date"
                [(ngModel)]="customStartDate"
                class="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-text focus:outline-none focus:ring-2 focus:ring-support"
              />
            </div>

            <div>
              <label for="dash-custom-end" class="block text-xs font-medium text-text-secondary mb-1">
                Data final
              </label>
              <input
                id="dash-custom-end"
                type="date"
                [(ngModel)]="customEndDate"
                class="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-text focus:outline-none focus:ring-2 focus:ring-support"
              />
            </div>

            <div>
              <button
                type="button"
                (click)="applyCustomRange()"
                class="w-full rounded-xl bg-support px-4 py-2 text-xs font-semibold text-white hover:opacity-95 transition-opacity cursor-pointer"
              >
                Aplicar período
              </button>
            </div>
          </div>
          @if (customRangeError()) {
            <p class="text-xs text-expense">{{ customRangeError() }}</p>
          }
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
            Consolidando informações do seu painel financeiro...
          </p>
        </div>
      } @else if (summary(); as s) {
        <!-- Linha 1: 4 Cards Principais de Situação Financeira -->
        <section class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <!-- Card 1: Saldo Atual -->
          <div class="rounded-2xl border border-border bg-surface p-5 shadow-xs flex flex-col justify-between">
            <div>
              <div class="flex items-center justify-between">
                <span class="text-xs font-semibold uppercase tracking-wider text-text-muted">
                  Saldo Atual
                </span>
                <span class="rounded-full bg-support/15 px-2 py-0.5 text-[10px] font-semibold text-support">
                  Realizado
                </span>
              </div>
              <p
                class="mt-2 text-2xl font-bold"
                [class.text-income]="s.currentBalance >= 0"
                [class.text-expense]="s.currentBalance < 0"
              >
                {{ s.currentBalance | currency: 'BRL' }}
              </p>
            </div>
            <p class="mt-3 border-t border-border pt-2.5 text-[11px] text-text-secondary">
              Resultado realizado no período:
              <strong
                [class.text-income]="s.periodRealizedResult >= 0"
                [class.text-expense]="s.periodRealizedResult < 0"
              >
                {{ s.periodRealizedResult | currency: 'BRL' }}
              </strong>
            </p>
          </div>

          <!-- Card 2: Saldo Projetado -->
          <div class="rounded-2xl border border-border bg-surface p-5 shadow-xs flex flex-col justify-between">
            <div>
              <div class="flex items-center justify-between">
                <span class="text-xs font-semibold uppercase tracking-wider text-text-muted">
                  Saldo Projetado
                </span>
                <span class="rounded-full bg-info/15 px-2 py-0.5 text-[10px] font-semibold text-info">
                  Previsão
                </span>
              </div>
              <p
                class="mt-2 text-2xl font-bold"
                [class.text-income]="s.projectedBalance >= 0"
                [class.text-expense]="s.projectedBalance < 0"
              >
                {{ s.projectedBalance | currency: 'BRL' }}
              </p>
            </div>
            <p class="mt-3 border-t border-border pt-2.5 text-[11px] text-text-secondary">
              Resultado projetado no período:
              <strong
                [class.text-income]="s.periodProjectedResult >= 0"
                [class.text-expense]="s.periodProjectedResult < 0"
              >
                {{ s.periodProjectedResult | currency: 'BRL' }}
              </strong>
            </p>
          </div>

          <!-- Card 3: Entradas do Período -->
          <div class="rounded-2xl border border-border bg-surface p-5 shadow-xs flex flex-col justify-between">
            <div>
              <div class="flex items-center justify-between">
                <span class="text-xs font-semibold uppercase tracking-wider text-text-muted">
                  Entradas ({{ periodLabel() }})
                </span>
                <span class="h-2.5 w-2.5 rounded-full bg-income"></span>
              </div>
              <p class="mt-2 text-2xl font-bold text-income">
                {{ s.realizedIncome | currency: 'BRL' }}
              </p>
              <p class="mt-0.5 text-[11px] text-text-muted">
                Previsto pendente: + {{ s.pendingIncome | currency: 'BRL' }}
              </p>
            </div>

            <div class="mt-3 space-y-1">
              <div class="flex items-center justify-between text-[10px] text-text-muted">
                <span>Progresso de recebimento</span>
                <span class="font-semibold text-text">{{ incomeRealizationRate() }}%</span>
              </div>
              <div class="h-1.5 w-full rounded-full bg-background overflow-hidden">
                <div
                  class="h-full rounded-full bg-income transition-all"
                  [style.width.%]="incomeRealizationRate()"
                ></div>
              </div>
            </div>
          </div>

          <!-- Card 4: Despesas do Período -->
          <div class="rounded-2xl border border-border bg-surface p-5 shadow-xs flex flex-col justify-between">
            <div>
              <div class="flex items-center justify-between">
                <span class="text-xs font-semibold uppercase tracking-wider text-text-muted">
                  Despesas ({{ periodLabel() }})
                </span>
                <span class="h-2.5 w-2.5 rounded-full bg-expense"></span>
              </div>
              <p class="mt-2 text-2xl font-bold text-expense">
                {{ s.realizedExpense | currency: 'BRL' }}
              </p>
              <p class="mt-0.5 text-[11px] text-text-muted">
                Previsto pendente: + {{ s.pendingExpense | currency: 'BRL' }}
              </p>
            </div>

            <div class="mt-3 space-y-1">
              <div class="flex items-center justify-between text-[10px] text-text-muted">
                <span>Progresso de quitação</span>
                <span class="font-semibold text-text">{{ expenseRealizationRate() }}%</span>
              </div>
              <div class="h-1.5 w-full rounded-full bg-background overflow-hidden">
                <div
                  class="h-full rounded-full bg-expense transition-all"
                  [style.width.%]="expenseRealizationRate()"
                ></div>
              </div>
            </div>
          </div>
        </section>

        <!-- Linha 2: Balanço do Período & Distribuição por Categoria -->
        <section class="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <!-- Coluna Esquerda (5 cols): Termômetro Previsto vs. Realizado -->
          <div class="lg:col-span-5 rounded-2xl border border-border bg-surface p-5 sm:p-6 shadow-xs flex flex-col justify-between space-y-5">
            <div>
              <h2 class="text-base font-bold text-text">
                Balanço do Período: Realizado vs. Projetado
              </h2>
              <p class="mt-0.5 text-xs text-text-secondary">
                Comparativo entre o que já foi efetivado e a previsão total do período.
              </p>
            </div>

            <div class="space-y-4">
              <!-- Total de Entradas (Realizado + Pendente) -->
              <div class="rounded-xl border border-border bg-background p-4 space-y-2">
                <div class="flex items-center justify-between text-xs">
                  <span class="font-semibold text-text">Total de Entradas Previstas</span>
                  <span class="font-bold text-income">
                    {{ totalExpectedIncome() | currency: 'BRL' }}
                  </span>
                </div>
                <div class="flex items-center justify-between text-[11px] text-text-secondary">
                  <span>Efetivado: {{ s.realizedIncome | currency: 'BRL' }}</span>
                  <span>Pendente: {{ s.pendingIncome | currency: 'BRL' }}</span>
                </div>
              </div>

              <!-- Total de Despesas (Realizado + Pendente) -->
              <div class="rounded-xl border border-border bg-background p-4 space-y-2">
                <div class="flex items-center justify-between text-xs">
                  <span class="font-semibold text-text">Total de Despesas Previstas</span>
                  <span class="font-bold text-expense">
                    {{ totalExpectedExpense() | currency: 'BRL' }}
                  </span>
                </div>
                <div class="flex items-center justify-between text-[11px] text-text-secondary">
                  <span>Efetivado: {{ s.realizedExpense | currency: 'BRL' }}</span>
                  <span>Pendente: {{ s.pendingExpense | currency: 'BRL' }}</span>
                </div>
              </div>

              <!-- Taxa de Comprometimento -->
              <div class="rounded-xl border border-border bg-background p-4">
                <div class="flex items-center justify-between text-xs mb-1.5">
                  <span class="font-medium text-text-secondary">
                    Comprometimento das Entradas no Período
                  </span>
                  <span
                    class="font-bold"
                    [class.text-income]="expenseToIncomeRatio() <= 80"
                    [class.text-pending]="expenseToIncomeRatio() > 80 && expenseToIncomeRatio() <= 100"
                    [class.text-expense]="expenseToIncomeRatio() > 100"
                  >
                    {{ expenseToIncomeRatio() }}%
                  </span>
                </div>
                <div class="h-2 w-full rounded-full bg-surface overflow-hidden">
                  <div
                    class="h-full rounded-full transition-all"
                    [class.bg-income]="expenseToIncomeRatio() <= 80"
                    [class.bg-pending]="expenseToIncomeRatio() > 80 && expenseToIncomeRatio() <= 100"
                    [class.bg-expense]="expenseToIncomeRatio() > 100"
                    [style.width.%]="expenseToIncomeRatio() > 100 ? 100 : expenseToIncomeRatio()"
                  ></div>
                </div>
              </div>
            </div>

            <div class="border-t border-border pt-3 flex items-center justify-between text-xs">
              <span class="text-text-muted">{{ transactions().length }} movimentação(ões) no período</span>
              <a routerLink="/financial" class="font-semibold text-support hover:underline">
                Ver análise completa →
              </a>
            </div>
          </div>

          <!-- Coluna Direita (7 cols): Distribuição por Categoria -->
          <div class="lg:col-span-7 rounded-2xl border border-border bg-surface p-5 sm:p-6 shadow-xs flex flex-col justify-between space-y-4">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 class="text-base font-bold text-text">Distribuição por Categoria</h2>
                <p class="mt-0.5 text-xs text-text-secondary">
                  Participação das categorias no período (realizado + pendente).
                </p>
              </div>

              <div class="inline-flex rounded-xl border border-border bg-background p-1 self-start">
                <button
                  type="button"
                  (click)="categoryChartKind.set('EXPENSE')"
                  class="rounded-lg px-3 py-1 text-xs font-semibold transition-colors cursor-pointer"
                  [class.bg-expense]="categoryChartKind() === 'EXPENSE'"
                  [class.text-white]="categoryChartKind() === 'EXPENSE'"
                  [class.text-text-secondary]="categoryChartKind() !== 'EXPENSE'"
                >
                  Despesas
                </button>
                <button
                  type="button"
                  (click)="categoryChartKind.set('INCOME')"
                  class="rounded-lg px-3 py-1 text-xs font-semibold transition-colors cursor-pointer"
                  [class.bg-income]="categoryChartKind() === 'INCOME'"
                  [class.text-white]="categoryChartKind() === 'INCOME'"
                  [class.text-text-secondary]="categoryChartKind() !== 'INCOME'"
                >
                  Entradas
                </button>
              </div>
            </div>

            @if (rankedCategoryItems().length === 0) {
              <div
                class="flex-1 flex flex-col items-center justify-center rounded-xl border border-border bg-background p-8 text-center"
              >
                <p class="text-xs font-medium text-text-secondary">
                  Nenhuma {{ categoryChartKind() === 'EXPENSE' ? 'despesa' : 'entrada' }} registrada neste período.
                </p>
              </div>
            } @else {
              <div class="space-y-3 max-h-72 overflow-y-auto pr-1">
                @for (item of rankedCategoryItems(); track item.category.categoryId ?? 'uncategorized') {
                  <div
                    class="rounded-xl border border-border bg-background p-3.5 transition-colors hover:border-support/40"
                  >
                    <div class="flex items-center justify-between gap-2 text-xs">
                      <div class="flex items-center gap-2 min-w-0">
                        <span class="font-bold text-text truncate">
                          {{ item.category.categoryName }}
                        </span>
                        <span class="text-[11px] text-text-muted">
                          ({{ item.sharePercent }}%)
                        </span>
                      </div>

                      <div class="flex items-center gap-2.5 shrink-0">
                        <span
                          class="font-bold"
                          [class.text-expense]="categoryChartKind() === 'EXPENSE'"
                          [class.text-income]="categoryChartKind() === 'INCOME'"
                        >
                          {{ item.totalAmount | currency: 'BRL' }}
                        </span>

                        @if (item.category.categoryId) {
                          <button
                            type="button"
                            (click)="openCategoryReport(item.category)"
                            class="text-[11px] font-semibold text-support hover:underline cursor-pointer"
                          >
                            Detalhar
                          </button>
                        }
                      </div>
                    </div>

                    <div class="mt-2 h-2 w-full rounded-full bg-surface overflow-hidden">
                      <div
                        class="h-full rounded-full transition-all"
                        [class.bg-expense]="categoryChartKind() === 'EXPENSE'"
                        [class.bg-income]="categoryChartKind() === 'INCOME'"
                        [style.width.%]="item.sharePercent"
                      ></div>
                    </div>

                    <div class="mt-1.5 flex items-center justify-between text-[10px] text-text-muted">
                      <span>Efetivado: {{ item.realizedAmount | currency: 'BRL' }}</span>
                      <span>Pendente: {{ item.pendingAmount | currency: 'BRL' }}</span>
                    </div>
                  </div>
                }
              </div>
            }

            <div class="border-t border-border pt-3 flex items-center justify-between text-xs">
              <span class="text-text-muted">
                {{ rankedCategoryItems().length }} categoria(s) exibida(s)
              </span>
              <a routerLink="/categories" class="font-semibold text-support hover:underline">
                Gerenciar categorias →
              </a>
            </div>
          </div>
        </section>

        <!-- Linha 3: Compromissos Pendentes do Período & Últimas Movimentações -->
        <section class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <!-- Compromissos Pendentes (Acompanhamento Atual e Futuro) -->
          <div class="rounded-2xl border border-border bg-surface p-5 sm:p-6 shadow-xs flex flex-col justify-between space-y-4">
            <div class="flex items-center justify-between">
              <div>
                <h2 class="text-base font-bold text-text">
                  Compromissos Pendentes no Período
                </h2>
                <p class="mt-0.5 text-xs text-text-secondary">
                  Entradas e despesas previstas aguardando efetivação.
                </p>
              </div>
              <span
                class="rounded-full bg-pending/15 px-2.5 py-0.5 text-xs font-bold text-pending"
              >
                {{ pendingTransactions().length }}
              </span>
            </div>

            @if (pendingTransactions().length === 0) {
              <div
                class="flex-1 flex flex-col items-center justify-center rounded-xl border border-border bg-background p-8 text-center"
              >
                <p class="text-xs font-semibold text-income">
                  Tudo em dia! Não há compromissos pendentes neste período.
                </p>
              </div>
            } @else {
              <div class="divide-y divide-border rounded-xl border border-border bg-background max-h-80 overflow-y-auto">
                @for (tx of pendingTransactions(); track tx.id) {
                  <div class="flex items-center justify-between gap-3 px-4 py-3 text-xs">
                    <div class="min-w-0 flex-1">
                      <div class="flex flex-wrap items-center gap-1.5">
                        <span class="font-semibold text-text truncate">{{ tx.description }}</span>

                        @switch (getDueStatus(tx.date)) {
                          @case ('OVERDUE') {
                            <span
                              class="rounded-full bg-expense/15 px-2 py-0.5 text-[10px] font-semibold text-expense"
                            >
                              Atrasado
                            </span>
                          }
                          @case ('TODAY') {
                            <span
                              class="rounded-full bg-pending/20 px-2 py-0.5 text-[10px] font-semibold text-pending"
                            >
                              Vence hoje
                            </span>
                          }
                          @case ('UPCOMING') {
                            <span
                              class="rounded-full bg-info/15 px-2 py-0.5 text-[10px] font-semibold text-info"
                            >
                              Previsto
                            </span>
                          }
                        }

                        @if (tx.occurrenceNumber !== null) {
                          <span
                            class="rounded-md bg-surface border border-border px-1.5 py-0.5 text-[10px] font-medium text-text-muted"
                          >
                            {{
                              tx.totalOccurrences
                                ? tx.occurrenceNumber + '/' + tx.totalOccurrences
                                : '#' + tx.occurrenceNumber
                            }}
                          </span>
                        }
                      </div>

                      <p class="mt-0.5 text-[11px] text-text-muted">
                        Vencimento: {{ tx.date | date: 'dd/MM/yyyy' }}
                        @if (tx.categoryName) {
                          · {{ tx.categoryName }}
                        }
                      </p>
                    </div>

                    <div class="flex items-center gap-2.5 shrink-0">
                      <span
                        class="font-bold"
                        [class.text-income]="tx.type === 'INCOME'"
                        [class.text-expense]="tx.type === 'EXPENSE'"
                      >
                        {{ tx.type === 'INCOME' ? '+' : '-' }}
                        {{ tx.amount | currency: 'BRL' }}
                      </span>

                      <button
                        type="button"
                        (click)="openCompleteModal(tx)"
                        class="rounded-lg bg-income/15 px-2.5 py-1 text-[11px] font-semibold text-income hover:bg-income hover:text-white transition-colors cursor-pointer"
                      >
                        Efetivar
                      </button>
                    </div>
                  </div>
                }
              </div>
            }

            <div class="border-t border-border pt-3 text-right">
              <a
                routerLink="/transactions"
                class="text-xs font-semibold text-support hover:underline"
              >
                Gerenciar todas as transações →
              </a>
            </div>
          </div>

          <!-- Últimas Movimentações do Período -->
          <div class="rounded-2xl border border-border bg-surface p-5 sm:p-6 shadow-xs flex flex-col justify-between space-y-4">
            <div class="flex items-center justify-between">
              <div>
                <h2 class="text-base font-bold text-text">
                  Movimentações do Período
                </h2>
                <p class="mt-0.5 text-xs text-text-secondary">
                  Últimos lançamentos registrados no período selecionado.
                </p>
              </div>
              <span class="text-xs font-semibold text-text-muted">
                {{ recentTransactions().length }} exibido(s)
              </span>
            </div>

            @if (recentTransactions().length === 0) {
              <div
                class="flex-1 flex flex-col items-center justify-center rounded-xl border border-border bg-background p-8 text-center"
              >
                <p class="text-xs text-text-secondary">
                  Nenhuma movimentação encontrada para este período.
                </p>
              </div>
            } @else {
              <div class="divide-y divide-border rounded-xl border border-border bg-background max-h-80 overflow-y-auto">
                @for (tx of recentTransactions(); track tx.id) {
                  <div
                    class="flex items-center justify-between gap-3 px-4 py-3 text-xs"
                    [class.opacity-60]="tx.status === 'CANCELED'"
                  >
                    <div class="min-w-0 flex-1">
                      <div class="flex flex-wrap items-center gap-1.5">
                        <span
                          class="font-semibold text-text truncate"
                          [class.line-through]="tx.status === 'CANCELED'"
                        >
                          {{ tx.description }}
                        </span>

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
                        @if (tx.categoryName) {
                          · {{ tx.categoryName }}
                        }
                      </p>
                    </div>

                    <span
                      class="font-bold whitespace-nowrap"
                      [class.text-income]="tx.type === 'INCOME' && tx.status !== 'CANCELED'"
                      [class.text-expense]="tx.type === 'EXPENSE' && tx.status !== 'CANCELED'"
                      [class.text-cancelled]="tx.status === 'CANCELED'"
                    >
                      {{ tx.type === 'INCOME' ? '+' : '-' }}
                      {{ (tx.realizedAmount ?? tx.amount) | currency: 'BRL' }}
                    </span>
                  </div>
                }
              </div>
            }

            <div class="border-t border-border pt-3 text-right">
              <a
                routerLink="/transactions"
                class="text-xs font-semibold text-support hover:underline"
              >
                Ver histórico completo →
              </a>
            </div>
          </div>
        </section>
      }

      <!-- Modal de Criação Rápida de Transação -->
      <app-transaction-form-modal
        [open]="txFormModalOpen()"
        [initialType]="txFormInitialType()"
        [categories]="categories()"
        (saved)="onDashboardTransactionUpdated()"
        (closed)="txFormModalOpen.set(false)"
      />

      <!-- Modal de Efetivação Rápida -->
      <app-complete-transaction-modal
        [open]="completeModalOpen()"
        [transaction]="completingTransaction()"
        (completed)="onDashboardTransactionUpdated()"
        (closed)="closeCompleteModal()"
      />

      <!-- Modal de Detalhamento por Categoria -->
      <app-category-report-modal
        [open]="categoryReportOpen()"
        [categoryId]="selectedCategoryForReport()?.categoryId ?? null"
        [categoryName]="selectedCategoryForReport()?.categoryName ?? ''"
        [filters]="currentCategoryReportFilters()"
        (closed)="closeCategoryReport()"
      />
    </div>
  `,
})
export class DashboardPageComponent implements OnInit {
  readonly authService = inject(AuthService);
  private readonly financialService = inject(FinancialService);
  private readonly transactionService = inject(TransactionService);
  private readonly categoryService = inject(CategoryService);
  private readonly toastService = inject(ToastService);

  // Estado da Perspectiva Temporal (Visão Mensal como padrão)
  readonly perspective = signal<TemporalPerspective>('MONTHLY');
  readonly referenceYear = signal<number>(new Date().getFullYear());
  readonly referenceMonth = signal<number>(new Date().getMonth()); // 0-11
  readonly referenceQuarter = signal<number>(Math.floor(new Date().getMonth() / 3)); // 0-3

  customStartDate = '';
  customEndDate = '';
  readonly customRangeError = signal<string | null>(null);

  // Dados Financeiros do Painel
  readonly isLoading = signal(false);
  readonly summary = signal<FinancialSummaryDTO | null>(null);
  readonly categorySummaries = signal<CategoryFinancialSummaryDTO[]>([]);
  readonly transactions = signal<TransactionResponseDTO[]>([]);
  readonly categories = signal<CategoryResponseDTO[]>([]);

  readonly categoryChartKind = signal<TransactionType>('EXPENSE');

  // Modais
  readonly txFormModalOpen = signal(false);
  readonly txFormInitialType = signal<TransactionType>('EXPENSE');

  readonly completeModalOpen = signal(false);
  readonly completingTransaction = signal<TransactionResponseDTO | null>(null);

  readonly categoryReportOpen = signal(false);
  readonly selectedCategoryForReport = signal<CategoryFinancialSummaryDTO | null>(null);

  readonly activeDateRange = computed<{ startDate: string; endDate: string }>(() => {
    const mode = this.perspective();
    const year = this.referenceYear();

    if (mode === 'MONTHLY') {
      const month = this.referenceMonth();
      const first = new Date(year, month, 1);
      const last = new Date(year, month + 1, 0);
      return {
        startDate: this.formatIsoDate(first),
        endDate: this.formatIsoDate(last),
      };
    }

    if (mode === 'QUARTERLY') {
      const q = this.referenceQuarter();
      const startMonth = q * 3;
      const first = new Date(year, startMonth, 1);
      const last = new Date(year, startMonth + 3, 0);
      return {
        startDate: this.formatIsoDate(first),
        endDate: this.formatIsoDate(last),
      };
    }

    if (mode === 'YEARLY') {
      return {
        startDate: `${year}-01-01`,
        endDate: `${year}-12-31`,
      };
    }

    if (mode === 'CUSTOM') {
      return {
        startDate: this.customStartDate,
        endDate: this.customEndDate,
      };
    }

    return { startDate: '', endDate: '' };
  });

  readonly periodLabel = computed(() => {
    const mode = this.perspective();
    if (mode === 'MONTHLY') {
      return `${MONTH_NAMES_PT[this.referenceMonth()]} de ${this.referenceYear()}`;
    }
    if (mode === 'QUARTERLY') {
      return `${this.referenceQuarter() + 1}º Trimestre de ${this.referenceYear()}`;
    }
    if (mode === 'YEARLY') {
      return `Ano de ${this.referenceYear()}`;
    }
    if (mode === 'ALL_TIME') {
      return 'Todo o Período';
    }
    if (this.customStartDate && this.customEndDate) {
      return `${this.customStartDate} a ${this.customEndDate}`;
    }
    return 'Período Personalizado';
  });

  readonly isCurrentPeriodSelected = computed(() => {
    const now = new Date();
    const mode = this.perspective();
    if (mode === 'MONTHLY') {
      return (
        this.referenceYear() === now.getFullYear() &&
        this.referenceMonth() === now.getMonth()
      );
    }
    if (mode === 'QUARTERLY') {
      return (
        this.referenceYear() === now.getFullYear() &&
        this.referenceQuarter() === Math.floor(now.getMonth() / 3)
      );
    }
    if (mode === 'YEARLY') {
      return this.referenceYear() === now.getFullYear();
    }
    return true;
  });

  readonly totalExpectedIncome = computed(() => {
    const s = this.summary();
    if (!s) {
      return 0;
    }
    return Number(s.realizedIncome) + Number(s.pendingIncome);
  });

  readonly totalExpectedExpense = computed(() => {
    const s = this.summary();
    if (!s) {
      return 0;
    }
    return Number(s.realizedExpense) + Number(s.pendingExpense);
  });

  readonly incomeRealizationRate = computed(() => {
    const s = this.summary();
    const total = this.totalExpectedIncome();
    if (!s || total <= 0) {
      return 0;
    }
    return Math.round((Number(s.realizedIncome) / total) * 100);
  });

  readonly expenseRealizationRate = computed(() => {
    const s = this.summary();
    const total = this.totalExpectedExpense();
    if (!s || total <= 0) {
      return 0;
    }
    return Math.round((Number(s.realizedExpense) / total) * 100);
  });

  readonly expenseToIncomeRatio = computed(() => {
    const income = this.totalExpectedIncome();
    const expense = this.totalExpectedExpense();
    if (income <= 0) {
      return expense > 0 ? 100 : 0;
    }
    return Math.round((expense / income) * 100);
  });

  readonly rankedCategoryItems = computed(() => {
    const kind = this.categoryChartKind();
    const items = this.categorySummaries()
      .map((cat) => {
        const realizedAmount =
          kind === 'EXPENSE' ? Number(cat.realizedExpense) : Number(cat.realizedIncome);
        const pendingAmount =
          kind === 'EXPENSE' ? Number(cat.pendingExpense) : Number(cat.pendingIncome);
        const totalAmount = realizedAmount + pendingAmount;
        return {
          category: cat,
          realizedAmount,
          pendingAmount,
          totalAmount,
        };
      })
      .filter((item) => item.totalAmount > 0)
      .sort((a, b) => b.totalAmount - a.totalAmount);

    const grandTotal = items.reduce((acc, item) => acc + item.totalAmount, 0);

    return items.map((item) => ({
      ...item,
      sharePercent: grandTotal > 0 ? Math.round((item.totalAmount / grandTotal) * 100) : 0,
    }));
  });

  readonly pendingTransactions = computed(() => {
    return this.transactions()
      .filter((tx) => tx.status === 'PENDING')
      .slice()
      .sort((a, b) => a.date.localeCompare(b.date));
  });

  readonly recentTransactions = computed(() => {
    return this.transactions().slice(0, 10);
  });

  readonly currentCategoryReportFilters = computed<FinancialCategoryFilters>(() => {
    const range = this.activeDateRange();
    return {
      startDate: range.startDate,
      endDate: range.endDate,
    };
  });

  ngOnInit(): void {
    this.loadCategories();
    this.loadDashboardData();
  }

  setPerspective(mode: TemporalPerspective): void {
    this.perspective.set(mode);
    this.customRangeError.set(null);

    if (mode === 'CUSTOM') {
      const current = this.activeDateRange();
      if (!this.customStartDate || !this.customEndDate) {
        const now = new Date();
        this.customStartDate = this.formatIsoDate(
          new Date(now.getFullYear(), now.getMonth(), 1)
        );
        this.customEndDate = this.formatIsoDate(
          new Date(now.getFullYear(), now.getMonth() + 1, 0)
        );
      } else {
        this.customStartDate = current.startDate;
        this.customEndDate = current.endDate;
      }
    }

    this.loadDashboardData();
  }

  navigatePeriod(step: number): void {
    const mode = this.perspective();

    if (mode === 'MONTHLY') {
      const target = new Date(this.referenceYear(), this.referenceMonth() + step, 1);
      this.referenceYear.set(target.getFullYear());
      this.referenceMonth.set(target.getMonth());
    } else if (mode === 'QUARTERLY') {
      let nextQuarter = this.referenceQuarter() + step;
      let nextYear = this.referenceYear();
      if (nextQuarter > 3) {
        nextQuarter = 0;
        nextYear++;
      } else if (nextQuarter < 0) {
        nextQuarter = 3;
        nextYear--;
      }
      this.referenceQuarter.set(nextQuarter);
      this.referenceYear.set(nextYear);
    } else if (mode === 'YEARLY') {
      this.referenceYear.update((y) => y + step);
    }

    this.loadDashboardData();
  }

  resetToToday(): void {
    const now = new Date();
    this.referenceYear.set(now.getFullYear());
    this.referenceMonth.set(now.getMonth());
    this.referenceQuarter.set(Math.floor(now.getMonth() / 3));
    this.loadDashboardData();
  }

  applyCustomRange(): void {
    this.customRangeError.set(null);
    if (
      this.customStartDate &&
      this.customEndDate &&
      this.customStartDate > this.customEndDate
    ) {
      this.customRangeError.set('A data inicial não pode ser posterior à data final.');
      return;
    }
    this.loadDashboardData();
  }

  loadCategories(): void {
    this.categoryService.findAll().subscribe({
      next: (list) => this.categories.set(list),
    });
  }

  loadDashboardData(): void {
    const { startDate, endDate } = this.activeDateRange();

    this.isLoading.set(true);
    forkJoin({
      summary: this.financialService.getSummary(startDate, endDate),
      byCategory: this.financialService.getSummaryByCategory({ startDate, endDate }),
      transactions: this.transactionService.findAll({ startDate, endDate }),
    })
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: ({ summary, byCategory, transactions }) => {
          this.summary.set(summary);
          this.categorySummaries.set(byCategory);
          this.transactions.set(transactions);
        },
        error: (err: unknown) => {
          const parsed = parseHttpError(err);
          this.toastService.error(parsed.message, 'Erro ao carregar o painel');
        },
      });
  }

  getDueStatus(dateIso: string): 'OVERDUE' | 'TODAY' | 'UPCOMING' {
    const todayIso = this.formatIsoDate(new Date());
    if (dateIso < todayIso) {
      return 'OVERDUE';
    }
    if (dateIso === todayIso) {
      return 'TODAY';
    }
    return 'UPCOMING';
  }

  openQuickTransactionModal(type: TransactionType): void {
    this.txFormInitialType.set(type);
    this.txFormModalOpen.set(true);
  }

  openCompleteModal(tx: TransactionResponseDTO): void {
    this.completingTransaction.set(tx);
    this.completeModalOpen.set(true);
  }

  closeCompleteModal(): void {
    this.completeModalOpen.set(false);
    this.completingTransaction.set(null);
  }

  onDashboardTransactionUpdated(): void {
    this.txFormModalOpen.set(false);
    this.closeCompleteModal();
    this.loadCategories();
    this.loadDashboardData();
  }

  openCategoryReport(cat: CategoryFinancialSummaryDTO): void {
    if (!cat.categoryId) {
      return;
    }
    this.selectedCategoryForReport.set(cat);
    this.categoryReportOpen.set(true);
  }

  closeCategoryReport(): void {
    this.categoryReportOpen.set(false);
    this.selectedCategoryForReport.set(null);
  }

  private formatIsoDate(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
}
