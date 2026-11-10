import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { parseHttpError } from '../../../core/http/api-error.model';
import { RecurringTransactionResponseDTO } from '../../../core/models/recurring-transaction.model';
import { TransactionResponseDTO } from '../../../core/models/transaction.model';
import { RecurringTransactionService } from '../../../core/services/recurring-transaction.service';
import { TransactionService } from '../../../core/services/transaction.service';
import { ToastService } from '../../../shared/services/toast.service';
import { CompleteTransactionModalComponent } from '../../transactions/components/complete-transaction-modal.component';

@Component({
  selector: 'app-recurrence-occurrences-modal',
  standalone: true,
  imports: [CurrencyPipe, DatePipe, RouterLink, CompleteTransactionModalComponent],
  template: `
    @if (open() && recurrence(); as rec) {
      <div
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-[1px] overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="rec-occ-title"
      >
        <div
          class="w-full max-w-3xl rounded-2xl border border-border bg-surface p-6 sm:p-7 shadow-xl my-8"
        >
          <!-- Cabeçalho -->
          <div class="flex items-start justify-between gap-4 border-b border-border pb-4">
            <div>
              <div class="flex flex-wrap items-center gap-2">
                <span
                  class="rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
                  [class.bg-info/15]="rec.occurrences !== null"
                  [class.text-info]="rec.occurrences !== null"
                  [class.bg-support/15]="rec.occurrences === null"
                  [class.text-support]="rec.occurrences === null"
                >
                  {{
                    rec.occurrences !== null
                      ? 'Parcelamento em ' + rec.occurrences + 'x'
                      : 'Recorrência Mensal Fixa'
                  }}
                </span>

                @if (rec.active) {
                  <span
                    class="rounded-full bg-income/15 px-2.5 py-0.5 text-[11px] font-semibold text-income"
                  >
                    Ativa
                  </span>
                } @else {
                  <span
                    class="rounded-full bg-cancelled/20 px-2.5 py-0.5 text-[11px] font-semibold text-cancelled"
                  >
                    Encerrada
                  </span>
                }
              </div>

              <h2 id="rec-occ-title" class="mt-1.5 text-lg font-bold text-text">
                {{ rec.description }}
              </h2>
              <p class="text-xs text-text-secondary">
                Vencimento todo dia {{ rec.dayOfMonth }} · Valor base:
                <strong>{{ rec.amount | currency: 'BRL' }}</strong>
                @if (rec.categoryName) {
                  · Categoria: <strong>{{ rec.categoryName }}</strong>
                }
              </p>
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
                Carregando ocorrências da série...
              </p>
            </div>
          } @else {
            <!-- Métricas da Série -->
            <div class="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div class="rounded-xl border border-border bg-background p-3.5">
                <span class="text-[11px] font-medium text-text-muted">Progresso</span>
                <p class="mt-1 text-sm font-bold text-text">
                  {{ stats().completedCount }} / {{ occurrences().length }} efetivadas
                </p>
                <p class="text-[10px] text-text-muted">
                  {{ stats().pendingCount }} pendente(s)
                </p>
              </div>

              <div class="rounded-xl border border-border bg-background p-3.5">
                <span class="text-[11px] font-medium text-text-muted">Total Efetivado</span>
                <p class="mt-1 text-sm font-bold text-income">
                  {{ stats().realizedSum | currency: 'BRL' }}
                </p>
                <p class="text-[10px] text-text-muted">Histórico preservado</p>
              </div>

              <div class="rounded-xl border border-border bg-background p-3.5">
                <span class="text-[11px] font-medium text-text-muted">Total Pendente</span>
                <p class="mt-1 text-sm font-bold text-pending">
                  {{ stats().pendingSum | currency: 'BRL' }}
                </p>
                <p class="text-[10px] text-text-muted">A vencer / em aberto</p>
              </div>

              <div class="rounded-xl border border-border bg-background p-3.5">
                <span class="text-[11px] font-medium text-text-muted">Gerado até</span>
                <p class="mt-1 text-sm font-bold text-text">
                  {{ rec.generatedUntil ? (rec.generatedUntil | date: 'dd/MM/yyyy') : '-' }}
                </p>
                <p class="text-[10px] text-text-muted">Início: {{ rec.startDate | date: 'dd/MM/yyyy' }}</p>
              </div>
            </div>

            <!-- Lista de Ocorrências -->
            <div class="mt-5">
              <h3 class="text-xs font-semibold uppercase tracking-wider text-text-muted mb-2.5">
                Cronograma de Ocorrências ({{ occurrences().length }})
              </h3>

              @if (occurrences().length === 0) {
                <div
                  class="rounded-xl border border-border bg-background p-6 text-center text-xs text-text-secondary"
                >
                  Nenhuma ocorrência encontrada para esta recorrência.
                </div>
              } @else {
                <div
                  class="max-h-80 overflow-y-auto rounded-xl border border-border bg-background divide-y divide-border"
                >
                  @for (tx of occurrences(); track tx.id) {
                    <div
                      class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 text-xs"
                      [class.opacity-60]="tx.status === 'CANCELED'"
                    >
                      <div class="flex items-center gap-3 min-w-0">
                        <span
                          class="flex h-7 w-12 shrink-0 items-center justify-center rounded-lg bg-surface border border-border font-mono text-[11px] font-bold text-text-secondary"
                        >
                          {{
                            tx.totalOccurrences
                              ? tx.occurrenceNumber + '/' + tx.totalOccurrences
                              : '#' + tx.occurrenceNumber
                          }}
                        </span>

                        <div class="min-w-0">
                          <div class="flex items-center gap-2">
                            <span
                              class="font-semibold text-text truncate"
                              [class.line-through]="tx.status === 'CANCELED'"
                            >
                              {{ tx.date | date: 'dd/MM/yyyy' }} — {{ tx.description }}
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
                        </div>
                      </div>

                      <div class="flex items-center justify-between sm:justify-end gap-3">
                        <span
                          class="font-bold whitespace-nowrap"
                          [class.text-income]="tx.type === 'INCOME' && tx.status !== 'CANCELED'"
                          [class.text-expense]="tx.type === 'EXPENSE' && tx.status !== 'CANCELED'"
                          [class.text-cancelled]="tx.status === 'CANCELED'"
                        >
                          {{ (tx.realizedAmount ?? tx.amount) | currency: 'BRL' }}
                        </span>

                        @if (tx.status === 'PENDING') {
                          <div class="flex items-center gap-1.5">
                            <button
                              type="button"
                              (click)="openCompleteOccurrence(tx)"
                              class="rounded-lg bg-income/15 px-2.5 py-1 text-[11px] font-semibold text-income hover:bg-income hover:text-white transition-colors cursor-pointer"
                            >
                              Efetivar
                            </button>
                            <button
                              type="button"
                              (click)="cancelOccurrence(tx)"
                              class="rounded-lg border border-border bg-surface px-2 py-1 text-[11px] text-text-secondary hover:text-pending transition-colors cursor-pointer"
                            >
                              Cancelar
                            </button>
                          </div>
                        }
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
              [queryParams]="{ recurringTransactionId: rec.id }"
              (click)="closed.emit()"
              class="text-xs font-semibold text-support hover:underline"
            >
              Filtrar estas ocorrências em Transações →
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

      <!-- Modal para Efetivar uma Ocorrência Individual -->
      <app-complete-transaction-modal
        [open]="completeModalOpen()"
        [transaction]="completingOccurrence()"
        (completed)="onOccurrenceUpdated()"
        (closed)="closeCompleteOccurrence()"
      />
    }
  `,
})
export class RecurrenceOccurrencesModalComponent {
  private readonly recurringService = inject(RecurringTransactionService);
  private readonly transactionService = inject(TransactionService);
  private readonly toastService = inject(ToastService);

  readonly open = input<boolean>(false);
  readonly recurrence = input<RecurringTransactionResponseDTO | null>(null);

  readonly updated = output<void>();
  readonly closed = output<void>();

  readonly occurrences = signal<TransactionResponseDTO[]>([]);
  readonly isLoading = signal(false);

  readonly completeModalOpen = signal(false);
  readonly completingOccurrence = signal<TransactionResponseDTO | null>(null);

  readonly stats = computed(() => {
    let completedCount = 0;
    let pendingCount = 0;
    let realizedSum = 0;
    let pendingSum = 0;

    for (const tx of this.occurrences()) {
      if (tx.status === 'COMPLETED') {
        completedCount++;
        realizedSum += Number(tx.realizedAmount ?? tx.amount);
      } else if (tx.status === 'PENDING') {
        pendingCount++;
        pendingSum += Number(tx.amount);
      }
    }

    return { completedCount, pendingCount, realizedSum, pendingSum };
  });

  constructor() {
    effect(() => {
      const isOpen = this.open();
      const rec = this.recurrence();
      if (isOpen && rec) {
        this.loadOccurrences(rec.id);
      }
    });
  }

  loadOccurrences(recurringId: string): void {
    this.isLoading.set(true);
    this.recurringService
      .findOccurrences(recurringId)
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (list) => this.occurrences.set(list),
        error: (err: unknown) => {
          const parsed = parseHttpError(err);
          this.toastService.error(parsed.message, 'Erro ao carregar ocorrências');
        },
      });
  }

  openCompleteOccurrence(tx: TransactionResponseDTO): void {
    this.completingOccurrence.set(tx);
    this.completeModalOpen.set(true);
  }

  closeCompleteOccurrence(): void {
    this.completeModalOpen.set(false);
    this.completingOccurrence.set(null);
  }

  onOccurrenceUpdated(): void {
    this.closeCompleteOccurrence();
    const rec = this.recurrence();
    if (rec) {
      this.loadOccurrences(rec.id);
    }
    this.updated.emit();
  }

  cancelOccurrence(tx: TransactionResponseDTO): void {
    this.transactionService.cancel(tx.id).subscribe({
      next: () => {
        this.toastService.info(`Ocorrência #${tx.occurrenceNumber} marcada como cancelada.`);
        const rec = this.recurrence();
        if (rec) {
          this.loadOccurrences(rec.id);
        }
        this.updated.emit();
      },
      error: (err: unknown) => {
        const parsed = parseHttpError(err);
        this.toastService.error(parsed.message);
      },
    });
  }
}
