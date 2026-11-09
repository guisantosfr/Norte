import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  template: `
    @if (open()) {
      <div
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-[1px]"
        role="dialog"
        aria-modal="true"
        [attr.aria-labelledby]="'confirm-dialog-title'"
      >
        <div
          class="w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-xl transition-all"
        >
          <div class="flex items-start gap-3.5">
            <div
              class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold"
              [class.bg-expense/15]="variant() === 'danger'"
              [class.text-expense]="variant() === 'danger'"
              [class.bg-pending/15]="variant() === 'warning'"
              [class.text-pending]="variant() === 'warning'"
            >
              !
            </div>

            <div class="flex-1">
              <h2 id="confirm-dialog-title" class="text-base font-bold text-text">
                {{ title() }}
              </h2>
              <p class="mt-1.5 text-sm text-text-secondary">
                {{ message() }}
              </p>
            </div>
          </div>

          <div class="mt-6 flex items-center justify-end gap-2.5">
            <button
              type="button"
              (click)="cancelled.emit()"
              [disabled]="loading()"
              class="rounded-xl border border-border bg-background px-4 py-2 text-xs font-semibold text-text-secondary hover:text-text disabled:opacity-60 transition-colors cursor-pointer"
            >
              {{ cancelLabel() }}
            </button>

            <button
              type="button"
              (click)="confirmed.emit()"
              [disabled]="loading()"
              class="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold text-white shadow-sm disabled:opacity-60 transition-opacity cursor-pointer"
              [class.bg-expense]="variant() === 'danger'"
              [class.bg-pending]="variant() === 'warning'"
            >
              @if (loading()) {
                <span
                  class="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent"
                ></span>
              }
              <span>{{ confirmLabel() }}</span>
            </button>
          </div>
        </div>
      </div>
    }
  `,
})
export class ConfirmDialogComponent {
  readonly open = input<boolean>(false);
  readonly title = input<string>('Confirmar ação');
  readonly message = input<string>('Tem certeza que deseja prosseguir?');
  readonly confirmLabel = input<string>('Confirmar');
  readonly cancelLabel = input<string>('Voltar');
  readonly variant = input<'danger' | 'warning'>('danger');
  readonly loading = input<boolean>(false);

  readonly confirmed = output<void>();
  readonly cancelled = output<void>();
}
