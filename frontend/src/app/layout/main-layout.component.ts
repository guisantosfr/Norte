import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../core/auth/auth.service';
import { NotificationService } from '../core/services/notification.service';
import { ThemeToggleComponent } from '../shared/components/theme-toggle.component';
import { ToastService } from '../shared/services/toast.service';
import { NotificationBellComponent } from './components/notification-bell.component';

interface NavItem {
  label: string;
  route: string;
  exact?: boolean;
  available: boolean;
  sprintBadge?: string;
}

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    ThemeToggleComponent,
    NotificationBellComponent,
  ],
  template: `
    <div class="min-h-screen flex flex-col lg:flex-row bg-background text-text">
      <!-- Mobile Header -->
      <header
        class="lg:hidden flex items-center justify-between border-b border-border bg-surface px-4 py-3"
      >
        <div class="flex items-center gap-2.5">
          <button
            type="button"
            (click)="toggleMobileMenu()"
            aria-label="Abrir menu de navegação"
            class="rounded-lg border border-border p-2 text-text-secondary hover:bg-background hover:text-text cursor-pointer"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="2"
            >
              <path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <span class="text-base font-bold text-text">Norte</span>
        </div>

        <div class="flex items-center gap-2">
          <app-notification-bell />
          <app-theme-toggle />
        </div>
      </header>

      <!-- Sidebar Overlay (Mobile) -->
      @if (mobileMenuOpen()) {
        <div
          class="fixed inset-0 z-30 bg-black/50 lg:hidden"
          (click)="closeMobileMenu()"
          aria-hidden="true"
        ></div>
      }

      <!-- Sidebar -->
      <aside
        class="fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-border bg-surface transition-transform duration-200 lg:static lg:translate-x-0"
        [class.translate-x-0]="mobileMenuOpen()"
        [class.-translate-x-full]="!mobileMenuOpen()"
      >
        <!-- Brand -->
        <div class="flex items-center justify-between border-b border-border px-5 py-4">
          <div class="flex items-center gap-2.5">
            <div
              class="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-white shadow-sm"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-5 w-5 text-support"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2.2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
              </svg>
            </div>
            <div>
              <p class="text-base font-bold leading-tight text-text">Norte</p>
              <p class="text-xs text-text-muted">Finanças Pessoais</p>
            </div>
          </div>

          <button
            type="button"
            (click)="closeMobileMenu()"
            aria-label="Fechar menu"
            class="lg:hidden rounded-lg p-1 text-text-muted hover:text-text cursor-pointer"
          >
            ✕
          </button>
        </div>

        <!-- Navigation -->
        <nav class="flex-1 space-y-1 px-3 py-4 overflow-y-auto">
          @for (item of navItems; track item.label) {
            @if (item.available) {
              <a
                [routerLink]="item.route"
                routerLinkActive="bg-support/15 text-support font-semibold border-support/30"
                [routerLinkActiveOptions]="{ exact: item.exact ?? false }"
                (click)="closeMobileMenu()"
                class="flex items-center justify-between rounded-xl border border-transparent px-3.5 py-2.5 text-sm text-text-secondary hover:bg-background hover:text-text transition-colors"
              >
                <span>{{ item.label }}</span>
                @if (item.route === '/notifications' && notificationService.unreadCount() > 0) {
                  <span
                    class="rounded-full bg-expense px-1.5 py-0.5 text-[10px] font-bold text-white"
                  >
                    {{ notificationService.unreadCount() }}
                  </span>
                }
              </a>
            } @else {
              <div
                class="flex items-center justify-between rounded-xl px-3.5 py-2.5 text-sm text-text-muted/70 select-none"
                title="Previsto para {{ item.sprintBadge }}"
              >
                <span>{{ item.label }}</span>
                @if (item.sprintBadge) {
                  <span
                    class="rounded-md border border-border bg-background px-1.5 py-0.5 text-[10px] font-medium text-text-muted"
                  >
                    {{ item.sprintBadge }}
                  </span>
                }
              </div>
            }
          }
        </nav>

        <!-- User Profile & Logout -->
        <div class="border-t border-border p-4">
          <div class="flex items-center gap-3 mb-3">
            <div
              class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-white"
            >
              {{ userInitials() }}
            </div>
            <div class="min-w-0 flex-1">
              <p class="truncate text-sm font-semibold text-text">
                {{ authService.currentUser()?.name || 'Usuário' }}
              </p>
              <p class="truncate text-xs text-text-muted">
                {{ authService.currentUser()?.email || '' }}
              </p>
            </div>
          </div>

          <button
            type="button"
            (click)="onLogout()"
            class="w-full flex items-center justify-center gap-2 rounded-xl border border-border bg-background px-3 py-2 text-xs font-medium text-text-secondary hover:border-expense/40 hover:bg-expense/10 hover:text-expense transition-colors cursor-pointer"
          >
            <span>Sair da conta</span>
          </button>
        </div>
      </aside>

      <!-- Main Area -->
      <div class="flex-1 flex flex-col min-w-0">
        <!-- Desktop Topbar -->
        <header
          class="hidden lg:flex items-center justify-between border-b border-border bg-surface px-8 py-3.5"
        >
          <div>
            <p class="text-sm font-medium text-text-secondary">
              Olá, <span class="font-semibold text-text">{{ authService.currentUser()?.name }}</span>
            </p>
          </div>

          <div class="flex items-center gap-3">
            <app-notification-bell />
            <app-theme-toggle />
          </div>
        </header>

        <!-- Page Content -->
        <main class="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <router-outlet />
        </main>
      </div>
    </div>
  `,
})
export class MainLayoutComponent {
  readonly authService = inject(AuthService);
  readonly notificationService = inject(NotificationService);
  private readonly toastService = inject(ToastService);

  readonly mobileMenuOpen = signal(false);

  readonly navItems: NavItem[] = [
    { label: 'Visão Geral', route: '/dashboard', exact: true, available: true },
    { label: 'Transações', route: '/transactions', available: true },
    { label: 'Categorias', route: '/categories', available: true },
    { label: 'Indicadores', route: '/financial', available: true },
    { label: 'Recorrências', route: '/recurrences', available: true },
    { label: 'Lembretes', route: '/notifications', available: true },
    { label: 'Anotações', route: '/notes', available: true },
  ];

  readonly userInitials = computed(() => {
    const name = this.authService.currentUser()?.name?.trim();
    if (!name) {
      return 'U';
    }
    const parts = name.split(/\s+/);
    if (parts.length === 1) {
      return parts[0].slice(0, 2).toUpperCase();
    }
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  });

  toggleMobileMenu(): void {
    this.mobileMenuOpen.update((open) => !open);
  }

  closeMobileMenu(): void {
    this.mobileMenuOpen.set(false);
  }

  onLogout(): void {
    this.authService.logout();
    this.toastService.info('Você saiu da sua conta com segurança.');
  }
}
