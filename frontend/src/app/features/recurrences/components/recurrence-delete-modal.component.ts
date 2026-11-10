import { Component, effect, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { parseHttpError } from '../../../core/http/api-error.model';
import {
  RecurrenceScope,
  RecurringTransactionResponseDTO,
} from '../../../core/models/recurring-transaction.model';
import { RecurringTransactionService } from '../../../core/services/recurring-transaction.service';
import { ToastService } from '../../../shared/services/toast.service';

@Component({
  selector: 'app-recurrence-delete-modal',
  standalone: true,
  imports: [FormsModule],
  template: `
    @if (open() && recurrence(); as rec) {
      <div
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-[1px]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="rec-delete-title"
      >
        <div class="w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-xl">
          <div class="flex items-start gap-3.5">
            <div
              class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-expense/15 text-expense text-sm font-bold"
            >
              !
            </div>

            <div class="flex-1">
              <h2 id="rec-delete-title" class="text-base font-bold text-text">
                Encerrar ou excluir "{{ rec.description }}"
              </h2>
              <p class="mt-1 text-xs text-text-secondary">
                Escolha quais ocorrências pendentes devem ser removidas. Ocorrências já efetivadas ou canceladas serão preservadas no histórico.
              </p>
            </div>
          </div>

          <div class="mt-4 space-y-2.5 rounded-xl border border-border bg-background p-3.5 text-xs">
            <label class="flex items-start gap-2.5 cursor-pointer">
              <input
                type="radio"
                name="deleteScope"
                [(ngModel)]="selectedScope"
                value="FUTURE"
                class="mt-0.5 accent-support"
              />
              <div>
                <span class="font-semibold text-text">
                  Remover apenas pendentes futuras (FUTURE)
                </span>
                <p class="text-[11px] text-text-secondary">
                  Remove somente as ocorrências pendentes de hoje em diante.
                </p>
              </div>
            </label>

            <label class="flex items-start gap-2.5 cursor-pointer">
              <input
                type="radio"
                name="deleteScope"
                [(ngModel)]="selectedScope"
                value="ALL"
                class="mt-0.5 accent-support"
              />
              <div>
                <span class="font-semibold text-text">
                  Remover todas as ocorrências pendentes (ALL)
                </span>
                <p class="text-[11px] text-text-secondary">
                  Remove todas as ocorrências ainda pendentes, inclusive anteriores a hoje.
                </p>
              </div>
            </label>
          </div>

          <p class="mt-3 text-[11px] text-text-muted">
            Se restarem parcelas já efetivadas/canceladas, esta série será marcada como
            <strong>Encerrada</strong> para manter seu histórico intacto.
          </p>

          @if (errorMessage()) {
            <div class="mt-3 rounded-xl border border-expense/40 bg-expense/10 px-3 py-2 text-xs text-expense">
              {{ errorMessage() }}
            </div>
          }

          <div class="mt-5 flex items-center justify-end gap-2.5">
            <button
              type="button"
              (click)="onClose()"
              [disabled]="isSubmitting()"
              class="rounded-xl border border-border bg-background px-4 py-2 text-xs font-semibold text-text-secondary hover:text-text disabled:opacity-60 transition-colors cursor-pointer"
            >
              Voltar
            </button>

            <button
              type="button"
              (click)="onConfirm()"
              [disabled]="isSubmitting()"
              class="inline-flex items-center gap-2 rounded-xl bg-expense px-4 py-2 text-xs font-semibold text-white shadow-sm hover:opacity-95 disabled:opacity-60 transition-opacity cursor-pointer"
            >
              @if (isSubmitting()) {
                <span
                  class="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent"
                ></span>
              }
              <span>Confirmar remoção</span>
            </button>
          </div>
        </div>
      </div>
    }
  `,
})
export class RecurrenceDeleteModalComponent {
  private readonly recurringService = inject(RecurringTransactionService);
  private readonly toastService = inject(ToastService);

  readonly open = input<boolean>(false);
  readonly recurrence = input<RecurringTransactionResponseDTO | null>(null);

  readonly deleted = output<void>();
  readonly closed = output<void>();

  selectedScope: RecurrenceScope = 'FUTURE';
  readonly isSubmitting = signal(false);
  readonly errorMessage = signal<string | null>(null);

  constructor() {
    effect(() => {
      if (this.open()) {
        this.selectedScope = 'FUTURE';
        this.errorMessage.set(null);
      }
    });
  }

  onClose(): void {
    if (!this.isSubmitting()) {
      this.closed.emit();
    }
  }

  onConfirm(): void {
    const rec = this.recurrence();
    if (!rec) {
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    this.recurringService
      .delete(rec.id, this.selectedScope)
      .pipe(finalize(() => this.isSubmitting.set(false)))
      .subscribe({
        next: () => {
          this.toastService.success(
            `A série "${rec.description}" foi encerrada/excluída preservando o histórico.`
          );
          this.deleted.emit();
        },
        error: (err: unknown) => {
          const parsed = parseHttpError(err);
          this.errorMessage.set(parsed.message);
        },
      });
  }
}
