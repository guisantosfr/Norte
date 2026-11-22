import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, effect, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { parseHttpError } from '../../../core/http/api-error.model';
import { TransactionResponseDTO } from '../../../core/models/transaction.model';
import { TransactionService } from '../../../core/services/transaction.service';
import { CurrencyMaskDirective } from '../../../shared/directives/currency-mask.directive';
import { ToastService } from '../../../shared/services/toast.service';

@Component({
  selector: 'app-complete-transaction-modal',
  standalone: true,
  imports: [ReactiveFormsModule, CurrencyPipe, DatePipe, CurrencyMaskDirective],
  template: `
    @if (open() && transaction(); as tx) {
      <div
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-[1px]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="complete-tx-title"
      >
        <div class="w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-xl">
          <div class="flex items-start justify-between gap-4 border-b border-border pb-4">
            <div>
              <h2 id="complete-tx-title" class="text-base font-bold text-text">
                Efetivar {{ tx.type === 'INCOME' ? 'Entrada' : 'Despesa' }}
              </h2>
              <p class="mt-0.5 text-xs text-text-secondary">
                Confirme o valor efetivamente {{ tx.type === 'INCOME' ? 'recebido' : 'pago' }}.
              </p>
            </div>

            <button
              type="button"
              (click)="onClose()"
              aria-label="Fechar modal"
              class="rounded-lg p-1.5 text-text-muted hover:bg-background hover:text-text transition-colors cursor-pointer"
            >
              ✕
            </button>
          </div>

          <div class="mt-4 rounded-xl border border-border bg-background p-3.5 text-xs space-y-1">
            <div class="flex items-center justify-between">
              <span class="text-text-muted">Descrição:</span>
              <span class="font-semibold text-text truncate max-w-[220px]">{{ tx.description }}</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-text-muted">Data prevista:</span>
              <span class="font-medium text-text">{{ tx.date | date: 'dd/MM/yyyy' }}</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-text-muted">Valor previsto:</span>
              <span class="font-semibold text-text">{{ tx.amount | currency: 'BRL' }}</span>
            </div>
          </div>

          @if (errorMessage()) {
            <div
              role="alert"
              class="mt-4 rounded-xl border border-expense/40 bg-expense/10 px-3.5 py-2.5 text-xs text-expense"
            >
              {{ errorMessage() }}
            </div>
          }

          <form [formGroup]="form" (ngSubmit)="onSubmit()" novalidate class="mt-4 space-y-4">
            <div>
              <label for="complete-realized-amount" class="block text-sm font-medium text-text mb-1.5">
                Valor realizado (R$)
              </label>
              <input
                id="complete-realized-amount"
                type="text"
                inputmode="numeric"
                appCurrencyMask
                formControlName="realizedAmount"
                placeholder="R$ 0,00"
                class="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-text focus:outline-none focus:ring-2 focus:ring-support transition-colors"
              />
              <p class="mt-1 text-[11px] text-text-muted">
                Você pode manter o valor previsto ou ajustá-lo caso tenha havido diferença no pagamento/recebimento.
              </p>
            </div>

            <div class="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                (click)="onClose()"
                [disabled]="isSubmitting()"
                class="rounded-xl border border-border bg-background px-4 py-2 text-xs font-semibold text-text-secondary hover:text-text disabled:opacity-60 transition-colors cursor-pointer"
              >
                Voltar
              </button>

              <button
                type="submit"
                [disabled]="isSubmitting() || form.invalid"
                class="inline-flex items-center gap-2 rounded-xl bg-income px-4 py-2 text-xs font-semibold text-white shadow-sm hover:opacity-95 disabled:opacity-60 transition-all cursor-pointer"
              >
                @if (isSubmitting()) {
                  <span
                    class="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent"
                  ></span>
                }
                <span>Confirmar efetivação</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    }
  `,
})
export class CompleteTransactionModalComponent {
  private readonly fb = inject(FormBuilder);
  private readonly transactionService = inject(TransactionService);
  private readonly toastService = inject(ToastService);

  readonly open = input<boolean>(false);
  readonly transaction = input<TransactionResponseDTO | null>(null);

  readonly completed = output<TransactionResponseDTO>();
  readonly closed = output<void>();

  readonly isSubmitting = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly form = this.fb.group({
    realizedAmount: this.fb.control<number | null>(null, [Validators.min(0.01)]),
  });

  constructor() {
    effect(() => {
      const isOpen = this.open();
      const tx = this.transaction();
      if (isOpen && tx) {
        this.errorMessage.set(null);
        this.form.reset({
          realizedAmount: tx.amount,
        });
      }
    });
  }

  onClose(): void {
    if (!this.isSubmitting()) {
      this.closed.emit();
    }
  }

  onSubmit(): void {
    const tx = this.transaction();
    if (!tx || this.form.invalid) {
      return;
    }

    const rawAmount = this.form.controls.realizedAmount.value;
    const realizedAmount =
      rawAmount !== null && rawAmount !== undefined ? Number(rawAmount) : tx.amount;

    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    this.transactionService
      .complete(tx.id, { realizedAmount })
      .pipe(finalize(() => this.isSubmitting.set(false)))
      .subscribe({
        next: (updated) => {
          this.toastService.success('Transação efetivada com sucesso!');
          this.completed.emit(updated);
        },
        error: (err: unknown) => {
          const parsed = parseHttpError(err);
          this.errorMessage.set(parsed.message);
        },
      });
  }
}
