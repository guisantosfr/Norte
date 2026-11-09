import { Component, inject } from '@angular/core';
import { ToastService, ToastType } from '../services/toast.service';

@Component({
  selector: 'app-toast-container',
  standalone: true,
  template: `
    <div
      aria-live="polite"
      aria-atomic="true"
      class="fixed bottom-4 right-4 z-50 flex w-full max-w-sm flex-col gap-2.5 px-4 sm:px-0 pointer-events-none"
    >
      @for (toast of toastService.toasts(); track toast.id) {
        <div
          role="status"
          class="pointer-events-auto flex items-start gap-3 rounded-xl border bg-surface p-4 shadow-lg transition-all duration-200"
          [class.border-income]="toast.type === 'success'"
          [class.border-expense]="toast.type === 'error'"
          [class.border-pending]="toast.type === 'warning'"
          [class.border-info]="toast.type === 'info'"
        >
          <span
            class="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
            [class.bg-income]="toast.type === 'success'"
            [class.bg-expense]="toast.type === 'error'"
            [class.bg-pending]="toast.type === 'warning'"
            [class.bg-info]="toast.type === 'info'"
          >
            {{ getIcon(toast.type) }}
          </span>

          <div class="flex-1 text-sm">
            @if (toast.title) {
              <p class="font-semibold text-text">{{ toast.title }}</p>
            }
            <p class="text-text-secondary">{{ toast.message }}</p>
          </div>

          <button
            type="button"
            (click)="toastService.dismiss(toast.id)"
            aria-label="Fechar notificação"
            class="rounded-md p-1 text-text-muted hover:bg-background hover:text-text transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>
      }
    </div>
  `,
})
export class ToastContainerComponent {
  readonly toastService = inject(ToastService);

  getIcon(type: ToastType): string {
    switch (type) {
      case 'success':
        return '✓';
      case 'error':
        return '!';
      case 'warning':
        return '!';
      default:
        return 'i';
    }
  }
}
