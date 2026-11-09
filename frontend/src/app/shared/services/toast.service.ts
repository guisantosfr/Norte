import { Injectable, signal } from '@angular/core';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastMessage {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
}

@Injectable({
  providedIn: 'root',
})
export class ToastService {
  readonly toasts = signal<ToastMessage[]>([]);

  show(message: string, type: ToastType = 'info', title?: string, durationMs = 4500): void {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const toast: ToastMessage = { id, type, title, message };

    this.toasts.update((list) => [...list, toast]);

    if (durationMs > 0) {
      setTimeout(() => {
        this.dismiss(id);
      }, durationMs);
    }
  }

  success(message: string, title?: string): void {
    this.show(message, 'success', title);
  }

  error(message: string, title?: string): void {
    this.show(message, 'error', title, 6000);
  }

  warning(message: string, title?: string): void {
    this.show(message, 'warning', title, 5000);
  }

  info(message: string, title?: string): void {
    this.show(message, 'info', title);
  }

  dismiss(id: string): void {
    this.toasts.update((list) => list.filter((item) => item.id !== id));
  }
}
