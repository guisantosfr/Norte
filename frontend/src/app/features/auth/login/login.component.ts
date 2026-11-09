import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { parseHttpError } from '../../../core/http/api-error.model';
import { ThemeToggleComponent } from '../../../shared/components/theme-toggle.component';
import { ToastService } from '../../../shared/services/toast.service';
import { maxUtf8BytesValidator } from '../../../shared/validators/auth.validators';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, ThemeToggleComponent],
  template: `
    <div class="min-h-screen flex flex-col bg-background text-text">
      <!-- Top Bar -->
      <header class="flex items-center justify-between px-6 py-4 max-w-7xl w-full mx-auto">
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
            <span class="text-lg font-bold tracking-tight text-text">Norte</span>
            <span class="hidden sm:inline-block ml-2 text-xs text-text-muted">
              Organização Financeira
            </span>
          </div>
        </div>

        <app-theme-toggle />
      </header>

      <!-- Main Card -->
      <main class="flex-1 flex items-center justify-center px-4 py-8">
        <div
          class="w-full max-w-md rounded-2xl border border-border bg-surface p-6 sm:p-8 shadow-sm"
        >
          <div class="mb-6 text-center">
            <h1 class="text-2xl font-bold text-text">Acessar sua conta</h1>
            <p class="mt-1.5 text-sm text-text-secondary">
              Informe suas credenciais para acompanhar sua vida financeira.
            </p>
          </div>

          @if (errorMessage()) {
            <div
              role="alert"
              class="mb-5 flex items-start gap-2.5 rounded-xl border border-expense/40 bg-expense/10 px-4 py-3 text-sm text-expense"
            >
              <span class="font-bold">!</span>
              <span>{{ errorMessage() }}</span>
            </div>
          }

          <form [formGroup]="loginForm" (ngSubmit)="onSubmit()" novalidate class="space-y-4">
            <!-- E-mail -->
            <div>
              <label for="email" class="block text-sm font-medium text-text mb-1.5">
                E-mail
              </label>
              <input
                id="email"
                type="email"
                formControlName="email"
                autocomplete="email"
                placeholder="voce@exemplo.com"
                class="w-full rounded-xl border bg-background px-3.5 py-2.5 text-sm text-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-support transition-colors"
                [class.border-expense]="hasFieldError('email')"
                [class.border-border]="!hasFieldError('email')"
              />
              @if (getFieldError('email'); as error) {
                <p class="mt-1.5 text-xs text-expense">{{ error }}</p>
              }
            </div>

            <!-- Senha -->
            <div>
              <div class="flex items-center justify-between mb-1.5">
                <label for="password" class="block text-sm font-medium text-text">
                  Senha
                </label>
              </div>
              <div class="relative">
                <input
                  id="password"
                  [type]="showPassword() ? 'text' : 'password'"
                  formControlName="password"
                  autocomplete="current-password"
                  placeholder="Mínimo de 8 caracteres"
                  class="w-full rounded-xl border bg-background pl-3.5 pr-16 py-2.5 text-sm text-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-support transition-colors"
                  [class.border-expense]="hasFieldError('password')"
                  [class.border-border]="!hasFieldError('password')"
                />
                <button
                  type="button"
                  (click)="togglePassword()"
                  class="absolute inset-y-0 right-2.5 my-auto h-7 px-2 text-xs font-medium text-text-secondary hover:text-text cursor-pointer"
                >
                  {{ showPassword() ? 'Ocultar' : 'Mostrar' }}
                </button>
              </div>
              @if (getFieldError('password'); as error) {
                <p class="mt-1.5 text-xs text-expense">{{ error }}</p>
              }
            </div>

            <!-- Botão Entrar -->
            <button
              type="submit"
              [disabled]="isSubmitting()"
              class="mt-2 w-full flex items-center justify-center gap-2 rounded-xl bg-support px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-support focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed transition-all cursor-pointer"
            >
              @if (isSubmitting()) {
                <span
                  class="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"
                ></span>
                <span>Entrando...</span>
              } @else {
                <span>Entrar</span>
              }
            </button>
          </form>

          <div class="mt-6 border-t border-border pt-5 text-center text-sm text-text-secondary">
            Ainda não possui uma conta?
            <a
              routerLink="/register"
              class="ml-1 font-semibold text-support hover:underline"
            >
              Criar conta gratuitamente
            </a>
          </div>
        </div>
      </main>
    </div>
  `,
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly toastService = inject(ToastService);

  readonly showPassword = signal(false);
  readonly isSubmitting = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly serverFieldErrors = signal<Record<string, string>>({});

  readonly loginForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email, Validators.maxLength(100)]],
    password: ['', [Validators.required, Validators.minLength(8), maxUtf8BytesValidator(72)]],
  });

  togglePassword(): void {
    this.showPassword.update((v) => !v);
  }

  hasFieldError(controlName: 'email' | 'password'): boolean {
    const control = this.loginForm.controls[controlName];
    return Boolean(
      (control.invalid && (control.dirty || control.touched)) ||
        this.serverFieldErrors()[controlName]
    );
  }

  getFieldError(controlName: 'email' | 'password'): string | null {
    const serverError = this.serverFieldErrors()[controlName];
    if (serverError) {
      return serverError;
    }

    const control = this.loginForm.controls[controlName];
    if (!control.invalid || (!control.dirty && !control.touched)) {
      return null;
    }

    if (control.hasError('required')) {
      return controlName === 'email' ? 'O e-mail é obrigatório' : 'A senha é obrigatória';
    }
    if (control.hasError('email')) {
      return 'O e-mail informado não é válido';
    }
    if (control.hasError('maxlength')) {
      return 'O e-mail deve ter no máximo 100 caracteres';
    }
    if (control.hasError('minlength')) {
      return 'A senha deve ter no mínimo 8 caracteres';
    }
    if (control.hasError('maxUtf8Bytes')) {
      return 'A senha deve ter no máximo 72 bytes em UTF-8';
    }

    return null;
  }

  onSubmit(): void {
    this.errorMessage.set(null);
    this.serverFieldErrors.set({});

    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    const payload = {
      email: this.loginForm.controls.email.value.trim(),
      password: this.loginForm.controls.password.value,
    };

    this.isSubmitting.set(true);

    this.authService
      .login(payload)
      .pipe(finalize(() => this.isSubmitting.set(false)))
      .subscribe({
        next: (res) => {
          this.toastService.success(`Bem-vindo(a), ${res.user.name}!`, 'Acesso realizado');
          const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') || '/dashboard';
          void this.router.navigateByUrl(returnUrl);
        },
        error: (err: unknown) => {
          const parsed = parseHttpError(err);
          this.serverFieldErrors.set(parsed.fieldErrors);
          this.errorMessage.set(parsed.message);
        },
      });
  }
}
