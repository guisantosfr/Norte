import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { parseHttpError } from '../../../core/http/api-error.model';
import { ThemeToggleComponent } from '../../../shared/components/theme-toggle.component';
import { ToastService } from '../../../shared/services/toast.service';
import {
  maxUtf8BytesValidator,
  passwordMatchValidator,
} from '../../../shared/validators/auth.validators';

@Component({
  selector: 'app-register',
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
          <div class="mb-6">
            <h1 class="text-2xl text-center font-bold text-text">Criar sua conta</h1>
            <p class="mt-1.5 text-sm text-text-secondary">
              Comece a organizar suas finanças pessoais com clareza e previsibilidade.
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

          <form [formGroup]="registerForm" (ngSubmit)="onSubmit()" novalidate class="space-y-4">
            <!-- Nome -->
            <div>
              <label for="name" class="block text-sm font-medium text-text mb-1.5">
                Nome
              </label>
              <input
                id="name"
                type="text"
                formControlName="name"
                autocomplete="name"
                placeholder="Seu nome completo"
                class="w-full rounded-xl border bg-background px-3.5 py-2.5 text-sm text-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-support transition-colors"
                [class.border-expense]="hasFieldError('name')"
                [class.border-border]="!hasFieldError('name')"
              />
              @if (getFieldError('name'); as error) {
                <p class="mt-1.5 text-xs text-expense">{{ error }}</p>
              }
            </div>

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
              <label for="password" class="block text-sm font-medium text-text mb-1.5">
                Senha
              </label>
              <div class="relative">
                <input
                  id="password"
                  [type]="showPassword() ? 'text' : 'password'"
                  formControlName="password"
                  autocomplete="new-password"
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

            <!-- Confirmar Senha -->
            <div>
              <label for="confirmPassword" class="block text-sm font-medium text-text mb-1.5">
                Confirmar senha
              </label>
              <input
                id="confirmPassword"
                [type]="showPassword() ? 'text' : 'password'"
                formControlName="confirmPassword"
                autocomplete="new-password"
                placeholder="Repita a senha informada"
                class="w-full rounded-xl border bg-background px-3.5 py-2.5 text-sm text-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-support transition-colors"
                [class.border-expense]="hasFieldError('confirmPassword')"
                [class.border-border]="!hasFieldError('confirmPassword')"
              />
              @if (getFieldError('confirmPassword'); as error) {
                <p class="mt-1.5 text-xs text-expense">{{ error }}</p>
              }
            </div>

            <!-- Botão Criar Conta -->
            <button
              type="submit"
              [disabled]="isSubmitting()"
              class="mt-2 w-full flex items-center justify-center gap-2 rounded-xl bg-support px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-support focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed transition-all cursor-pointer"
            >
              @if (isSubmitting()) {
                <span
                  class="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"
                ></span>
                <span>Criando conta...</span>
              } @else {
                <span>Criar conta</span>
              }
            </button>
          </form>

          <div class="mt-6 border-t border-border pt-5 text-center text-sm text-text-secondary">
            Já possui uma conta?
            <a
              routerLink="/login"
              class="ml-1 font-semibold text-support hover:underline"
            >
              Fazer login
            </a>
          </div>
        </div>
      </main>
    </div>
  `,
})
export class RegisterComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toastService = inject(ToastService);

  readonly showPassword = signal(false);
  readonly isSubmitting = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly serverFieldErrors = signal<Record<string, string>>({});

  readonly registerForm = this.fb.nonNullable.group(
    {
      name: ['', [Validators.required, Validators.maxLength(100)]],
      email: ['', [Validators.required, Validators.email, Validators.maxLength(255)]],
      password: ['', [Validators.required, Validators.minLength(8), maxUtf8BytesValidator(72)]],
      confirmPassword: ['', [Validators.required]],
    },
    {
      validators: [passwordMatchValidator('password', 'confirmPassword')],
    }
  );

  togglePassword(): void {
    this.showPassword.update((v) => !v);
  }

  hasFieldError(controlName: 'name' | 'email' | 'password' | 'confirmPassword'): boolean {
    const control = this.registerForm.controls[controlName];
    const touchedOrDirty = control.dirty || control.touched;

    if (this.serverFieldErrors()[controlName]) {
      return true;
    }

    if (
      controlName === 'confirmPassword' &&
      touchedOrDirty &&
      (this.registerForm.hasError('passwordMismatch') || this.serverFieldErrors()['userRequestDTO'])
    ) {
      return true;
    }

    return Boolean(control.invalid && touchedOrDirty);
  }

  getFieldError(controlName: 'name' | 'email' | 'password' | 'confirmPassword'): string | null {
    const serverError = this.serverFieldErrors()[controlName];
    if (serverError) {
      return serverError;
    }

    if (controlName === 'confirmPassword' && this.serverFieldErrors()['userRequestDTO']) {
      return this.serverFieldErrors()['userRequestDTO'];
    }

    const control = this.registerForm.controls[controlName];
    const touchedOrDirty = control.dirty || control.touched;

    if (
      controlName === 'confirmPassword' &&
      touchedOrDirty &&
      this.registerForm.hasError('passwordMismatch')
    ) {
      return 'As senhas não coincidem';
    }

    if (!control.invalid || !touchedOrDirty) {
      return null;
    }

    if (control.hasError('required')) {
      switch (controlName) {
        case 'name':
          return 'O nome é obrigatório';
        case 'email':
          return 'O e-mail é obrigatório';
        case 'password':
          return 'A senha é obrigatória';
        case 'confirmPassword':
          return 'A confirmação de senha é obrigatória';
      }
    }

    if (control.hasError('email')) {
      return 'O e-mail informado não é válido';
    }

    if (control.hasError('maxlength')) {
      return controlName === 'name'
        ? 'O nome deve ter no máximo 100 caracteres'
        : 'O e-mail deve ter no máximo 255 caracteres';
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

    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }

    const raw = this.registerForm.getRawValue();
    const payload = {
      name: raw.name.trim(),
      email: raw.email.trim(),
      password: raw.password,
      confirmPassword: raw.confirmPassword,
    };

    this.isSubmitting.set(true);

    this.authService
      .register(payload)
      .pipe(finalize(() => this.isSubmitting.set(false)))
      .subscribe({
        next: (res) => {
          this.toastService.success(
            `Conta criada com sucesso! Bem-vindo(a) ao Norte, ${res.user.name}.`,
            'Cadastro concluído'
          );
          void this.router.navigate(['/dashboard']);
        },
        error: (err: unknown) => {
          const parsed = parseHttpError(err);
          this.serverFieldErrors.set(parsed.fieldErrors);
          this.errorMessage.set(parsed.message);
        },
      });
  }
}
