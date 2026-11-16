import { Component, inject } from '@angular/core';
import { LucideMoon, LucideSun } from '@lucide/angular';
import { ThemeService } from '../../core/services/theme.service';

@Component({
  selector: 'app-theme-toggle',
  standalone: true,
  imports: [LucideSun, LucideMoon],
  template: `
    <button
      type="button"
      role="switch"
      [attr.aria-checked]="themeService.isDark()"
      (click)="themeService.toggleTheme()"
      [attr.aria-label]="
        themeService.isDark() ? 'Alternar para tema claro' : 'Alternar para tema escuro'
      "
      [title]="themeService.isDark() ? 'Mudar para tema claro' : 'Mudar para tema escuro'"
      class="relative inline-flex h-8 w-14 shrink-0 items-center justify-between rounded-full border border-border bg-background px-1.5 transition-colors hover:border-support/50 focus:outline-none focus:ring-2 focus:ring-support cursor-pointer"
    >
      <span
        aria-hidden="true"
        class="pointer-events-none absolute left-1 h-6 w-6 rounded-full border border-border bg-surface shadow-xs transition-transform duration-200"
        [class.translate-x-[22px]]="themeService.isDark()"
        [class.translate-x-0]="!themeService.isDark()"
      ></span>

      <svg
        lucideSun
        [size]="14"
        class="relative z-10 ml-0.5 transition-colors"
        [class.text-pending]="!themeService.isDark()"
        [class.text-text-muted]="themeService.isDark()"
      />

      <svg
        lucideMoon
        [size]="14"
        class="relative z-10 mr-0.5 transition-colors"
        [class.text-support]="themeService.isDark()"
        [class.text-text-muted]="!themeService.isDark()"
      />
    </button>
  `,
})
export class ThemeToggleComponent {
  readonly themeService = inject(ThemeService);
}
