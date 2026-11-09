import { Component, inject } from '@angular/core';
import { ThemeService } from '../../core/services/theme.service';

@Component({
  selector: 'app-theme-toggle',
  standalone: true,
  template: `
    <button
      type="button"
      (click)="themeService.toggleTheme()"
      [attr.aria-label]="
        themeService.isDark() ? 'Alternar para tema claro' : 'Alternar para tema escuro'
      "
      [title]="themeService.isDark() ? 'Mudar para tema claro' : 'Mudar para tema escuro'"
      class="inline-flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-xs font-medium text-text-secondary hover:bg-background hover:text-text transition-colors cursor-pointer"
    >
      @if (themeService.isDark()) {
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="h-4 w-4 text-pending"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2" />
          <path d="M12 20v2" />
          <path d="m4.93 4.93 1.41 1.41" />
          <path d="m17.66 17.66 1.41 1.41" />
          <path d="M2 12h2" />
          <path d="M20 12h2" />
          <path d="m6.34 17.66-1.41 1.41" />
          <path d="m19.07 4.93-1.41 1.41" />
        </svg>
        <span class="hidden sm:inline">Tema Claro</span>
      } @else {
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="h-4 w-4 text-support"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
        </svg>
        <span class="hidden sm:inline">Tema Escuro</span>
      }
    </button>
  `,
})
export class ThemeToggleComponent {
  readonly themeService = inject(ThemeService);
}
