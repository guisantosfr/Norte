import { DOCUMENT } from '@angular/common';
import { Injectable, computed, effect, inject, signal } from '@angular/core';

export type ThemeMode = 'light' | 'dark';

const THEME_STORAGE_KEY = 'norte_theme';

@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  private readonly document = inject(DOCUMENT);

  readonly theme = signal<ThemeMode>(this.resolveInitialTheme());
  readonly isDark = computed(() => this.theme() === 'dark');

  constructor() {
    effect(() => {
      const currentTheme = this.theme();
      const rootElement = this.document.documentElement;

      if (currentTheme === 'dark') {
        rootElement.classList.add('dark');
      } else {
        rootElement.classList.remove('dark');
      }

      try {
        localStorage.setItem(THEME_STORAGE_KEY, currentTheme);
      } catch {
        // Ignore storage errors in restricted environments
      }
    });
  }

  toggleTheme(): void {
    this.theme.update((current) => (current === 'dark' ? 'light' : 'dark'));
  }

  setTheme(mode: ThemeMode): void {
    this.theme.set(mode);
  }

  private resolveInitialTheme(): ThemeMode {
    try {
      const saved = localStorage.getItem(THEME_STORAGE_KEY);
      if (saved === 'dark' || saved === 'light') {
        return saved;
      }
      if (
        typeof window !== 'undefined' &&
        typeof window.matchMedia === 'function' &&
        window.matchMedia('(prefers-color-scheme: dark)').matches
      ) {
        return 'dark';
      }
    } catch {
      // Fallback to light
    }
    return 'light';
  }
}
