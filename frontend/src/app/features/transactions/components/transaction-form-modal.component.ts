import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { parseHttpError } from '../../../core/http/api-error.model';
import { CategoryResponseDTO } from '../../../core/models/category.model';
import {
  TransactionRequestDTO,
  TransactionResponseDTO,
  TransactionStatus,
  TransactionType,
  TypedTransactionRequestDTO,
} from '../../../core/models/transaction.model';
import { TransactionService } from '../../../core/services/transaction.service';
import { CurrencyMaskDirective } from '../../../shared/directives/currency-mask.directive';
import { ToastService } from '../../../shared/services/toast.service';

@Component({
  selector: 'app-transaction-form-modal',
  standalone: true,
  imports: [ReactiveFormsModule, CurrencyMaskDirective],
  template: `
    @if (open()) {
      <div
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-[1px] overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="tx-modal-title"
      >
        <div
          class="w-full max-w-lg rounded-2xl border border-border bg-surface p-6 sm:p-7 shadow-xl my-8"
        >
          <!-- Cabeçalho -->
          <div class="flex items-start justify-between gap-4 border-b border-border pb-4">
            <div>
              <h2 id="tx-modal-title" class="text-lg font-bold text-text">
                {{ modalTitle() }}
              </h2>
              <p class="mt-0.5 text-xs text-text-secondary">
                {{
                  isEditMode()
                    ? 'Atualize os dados e a classificação do lançamento selecionado.'
                    : 'Preencha os campos abaixo para registrar e classificar a movimentação.'
                }}
              </p>
            </div>

            <button
              type="button"
              (click)="onClose()"
              aria-label="Fechar modal"
              class="rounded-lg p-1.5 text-text-muted hover:bg-background hover:text-text transition-colors cursor-pointer"
            >
              ✕
            </button>
          </div>

          @if (errorMessage()) {
            <div
              role="alert"
              class="mt-4 flex items-start gap-2.5 rounded-xl border border-expense/40 bg-expense/10 px-4 py-3 text-xs text-expense"
            >
              <span class="font-bold">!</span>
              <span>{{ errorMessage() }}</span>
            </div>
          }

          <form [formGroup]="form" (ngSubmit)="onSubmit()" novalidate class="mt-5 space-y-4">
            <!-- Seletor de Tipo (Entrada / Despesa) -->
            <div>
              <label class="block text-xs font-semibold uppercase tracking-wider text-text-muted mb-2">
                Tipo de Lançamento
              </label>
              <div class="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  (click)="selectType('INCOME')"
                  class="flex items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-all cursor-pointer"
                  [class.border-income]="form.controls.type.value === 'INCOME'"
                  [class.bg-income/15]="form.controls.type.value === 'INCOME'"
                  [class.text-income]="form.controls.type.value === 'INCOME'"
                  [class.border-border]="form.controls.type.value !== 'INCOME'"
                  [class.bg-background]="form.controls.type.value !== 'INCOME'"
                  [class.text-text-secondary]="form.controls.type.value !== 'INCOME'"
                >
                  <span>↑</span>
                  <span>Entrada</span>
                </button>

                <button
                  type="button"
                  (click)="selectType('EXPENSE')"
                  class="flex items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-all cursor-pointer"
                  [class.border-expense]="form.controls.type.value === 'EXPENSE'"
                  [class.bg-expense/15]="form.controls.type.value === 'EXPENSE'"
                  [class.text-expense]="form.controls.type.value === 'EXPENSE'"
                  [class.border-border]="form.controls.type.value !== 'EXPENSE'"
                  [class.bg-background]="form.controls.type.value !== 'EXPENSE'"
                  [class.text-text-secondary]="form.controls.type.value !== 'EXPENSE'"
                >
                  <span>↓</span>
                  <span>Despesa</span>
                </button>
              </div>
            </div>

            <!-- Descrição -->
            <div>
              <label for="tx-description" class="block text-sm font-medium text-text mb-1.5">
                Descrição <span class="text-expense">*</span>
              </label>
              <input
                id="tx-description"
                type="text"
                formControlName="description"
                autocomplete="off"
                placeholder="Ex.: Salário mensal, Conta de energia, Supermercado..."
                class="w-full rounded-xl border bg-background px-3.5 py-2.5 text-sm text-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-support transition-colors"
                [class.border-expense]="hasFieldError('description')"
                [class.border-border]="!hasFieldError('description')"
              />
              @if (getFieldError('description'); as error) {
                <p class="mt-1 text-xs text-expense">{{ error }}</p>
              }
            </div>

            <!-- Valor Previsto e Data Prevista -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label for="tx-amount" class="block text-sm font-medium text-text mb-1.5">
                  Valor previsto (R$) <span class="text-expense">*</span>
                </label>
                <input
                  id="tx-amount"
                  type="text"
                  inputmode="numeric"
                  appCurrencyMask
                  formControlName="amount"
                  placeholder="R$ 0,00"
                  class="w-full rounded-xl border bg-background px-3.5 py-2.5 text-sm text-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-support transition-colors"
                  [class.border-expense]="hasFieldError('amount')"
                  [class.border-border]="!hasFieldError('amount')"
                />
                @if (getFieldError('amount'); as error) {
                  <p class="mt-1 text-xs text-expense">{{ error }}</p>
                }
              </div>

              <div>
                <label for="tx-date" class="block text-sm font-medium text-text mb-1.5">
                  Data prevista <span class="text-expense">*</span>
                </label>
                <input
                  id="tx-date"
                  type="date"
                  formControlName="date"
                  class="w-full rounded-xl border bg-background px-3.5 py-2.5 text-sm text-text focus:outline-none focus:ring-2 focus:ring-support transition-colors"
                  [class.border-expense]="hasFieldError('date')"
                  [class.border-border]="!hasFieldError('date')"
                />
                @if (getFieldError('date'); as error) {
                  <p class="mt-1 text-xs text-expense">{{ error }}</p>
                }
              </div>
            </div>

            <!-- Categoria (Seleção existente ou Criação Inline) -->
            <div>
              <div class="flex items-center justify-between mb-1.5">
                <label
                  [for]="useNewCategory() ? 'tx-category-name' : 'tx-category-id'"
                  class="block text-sm font-medium text-text"
                >
                  Categoria
                </label>
                <button
                  type="button"
                  (click)="toggleCategoryMode()"
                  class="text-xs font-semibold text-support hover:underline cursor-pointer"
                >
                  {{
                    useNewCategory()
                      ? 'Selecionar categoria existente'
                      : '+ Criar nova categoria'
                  }}
                </button>
              </div>

              @if (useNewCategory()) {
                <input
                  id="tx-category-name"
                  type="text"
                  formControlName="categoryName"
                  placeholder="Digite o nome da nova categoria (máx. 100 caracteres)"
                  class="w-full rounded-xl border bg-background px-3.5 py-2.5 text-sm text-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-support transition-colors"
                  [class.border-expense]="hasFieldError('categoryName')"
                  [class.border-border]="!hasFieldError('categoryName')"
                />
                @if (getFieldError('categoryName'); as error) {
                  <p class="mt-1 text-xs text-expense">{{ error }}</p>
                } @else {
                  <p class="mt-1 text-[11px] text-text-muted">
                    A nova categoria será criada automaticamente ao salvar este lançamento.
                  </p>
                }
              } @else {
                <select
                  id="tx-category-id"
                  formControlName="categoryId"
                  class="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-text focus:outline-none focus:ring-2 focus:ring-support transition-colors"
                >
                  <option value="">Sem categoria</option>
                  @for (cat of selectableCategories(); track cat.id) {
                    <option [value]="cat.id">
                      {{ cat.name }}{{ !cat.active ? ' (Inativa - atual)' : '' }}
                    </option>
                  }
                </select>
              }
            </div>

            <!-- Status -->
            <div>
              <label for="tx-status" class="block text-sm font-medium text-text mb-1.5">
                Status <span class="text-expense">*</span>
              </label>
              <select
                id="tx-status"
                formControlName="status"
                class="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-text focus:outline-none focus:ring-2 focus:ring-support transition-colors"
              >
                <option value="PENDING">Pendente (Previsto)</option>
                <option value="COMPLETED">Efetivado (Pago / Recebido)</option>
                @if (isEditMode()) {
                  <option value="CANCELED">Cancelado</option>
                }
              </select>
            </div>

            <!-- Valor Efetivamente Realizado (exibido quando COMPLETED) -->
            @if (form.controls.status.value === 'COMPLETED') {
              <div class="rounded-xl border border-border bg-background/60 p-3.5">
                <label for="tx-realized-amount" class="block text-xs font-semibold text-text mb-1">
                  Valor efetivamente realizado (R$) — opcional
                </label>
                <input
                  id="tx-realized-amount"
                  type="text"
                  inputmode="numeric"
                  appCurrencyMask
                  formControlName="realizedAmount"
                  placeholder="Deixe em branco para usar o valor previsto"
                  class="w-full rounded-xl border bg-surface px-3 py-2 text-sm text-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-support transition-colors"
                  [class.border-expense]="hasFieldError('realizedAmount')"
                  [class.border-border]="!hasFieldError('realizedAmount')"
                />
                @if (getFieldError('realizedAmount'); as error) {
                  <p class="mt-1 text-xs text-expense">{{ error }}</p>
                } @else {
                  <p class="mt-1 text-[11px] text-text-muted">
                    Útil quando o valor pago ou recebido teve desconto, juros ou variação em relação ao valor previsto.
                  </p>
                }
              </div>
            }

            <!-- Rodapé de Ações -->
            <div class="flex items-center justify-end gap-2.5 border-t border-border pt-4 mt-6">
              <button
                type="button"
                (click)="onClose()"
                [disabled]="isSubmitting()"
                class="rounded-xl border border-border bg-background px-4 py-2.5 text-xs font-semibold text-text-secondary hover:text-text disabled:opacity-60 transition-colors cursor-pointer"
              >
                Cancelar
              </button>

              <button
                type="submit"
                [disabled]="isSubmitting()"
                class="inline-flex items-center gap-2 rounded-xl bg-support px-5 py-2.5 text-xs font-semibold text-white shadow-sm hover:opacity-95 disabled:opacity-60 transition-all cursor-pointer"
              >
                @if (isSubmitting()) {
                  <span
                    class="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent"
                  ></span>
                  <span>Salvando...</span>
                } @else {
                  <span>{{ isEditMode() ? 'Salvar alterações' : 'Registrar lançamento' }}</span>
                }
              </button>
            </div>
          </form>
        </div>
      </div>
    }
  `,
})
export class TransactionFormModalComponent {
  private readonly fb = inject(FormBuilder);
  private readonly transactionService = inject(TransactionService);
  private readonly toastService = inject(ToastService);

  readonly open = input<boolean>(false);
  readonly initialType = input<TransactionType>('EXPENSE');
  readonly editingTransaction = input<TransactionResponseDTO | null>(null);
  readonly categories = input<CategoryResponseDTO[]>([]);

  readonly saved = output<TransactionResponseDTO>();
  readonly closed = output<void>();

  readonly isSubmitting = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly serverFieldErrors = signal<Record<string, string>>({});
  readonly useNewCategory = signal(false);

  readonly isEditMode = computed(() => Boolean(this.editingTransaction()));

  readonly selectableCategories = computed(() => {
    const all = this.categories();
    const editing = this.editingTransaction();
    return all.filter((cat) => cat.active || (editing && editing.categoryId === cat.id));
  });

  readonly modalTitle = computed(() => {
    const editing = this.editingTransaction();
    if (editing) {
      return 'Editar Transação';
    }
    return 'Nova Transação';
  });

  readonly form = this.fb.group({
    type: this.fb.nonNullable.control<TransactionType>('EXPENSE', [Validators.required]),
    description: this.fb.nonNullable.control('', [
      Validators.required,
      Validators.maxLength(255),
    ]),
    amount: this.fb.control<number | null>(null, [
      Validators.required,
      Validators.min(0.01),
    ]),
    date: this.fb.nonNullable.control(this.getTodayIsoDate(), [Validators.required]),
    categoryId: this.fb.nonNullable.control(''),
    categoryName: this.fb.nonNullable.control('', [Validators.maxLength(100)]),
    status: this.fb.nonNullable.control<TransactionStatus>('COMPLETED', [Validators.required]),
    realizedAmount: this.fb.control<number | null>(null, [Validators.min(0.01)]),
  });

  constructor() {
    effect(() => {
      const isOpen = this.open();
      const editing = this.editingTransaction();
      const defaultType = this.initialType();

      if (!isOpen) {
        return;
      }

      this.errorMessage.set(null);
      this.serverFieldErrors.set({});
      this.useNewCategory.set(false);

      if (editing) {
        this.form.reset({
          type: editing.type,
          description: editing.description,
          amount: editing.amount,
          date: editing.date,
          categoryId: editing.categoryId ?? '',
          categoryName: '',
          status: editing.status,
          realizedAmount: editing.realizedAmount,
        });
      } else {
        const defaultStatus: TransactionStatus =
          defaultType === 'INCOME' ? 'PENDING' : 'COMPLETED';
        this.form.reset({
          type: defaultType,
          description: '',
          amount: null,
          date: this.getTodayIsoDate(),
          categoryId: '',
          categoryName: '',
          status: defaultStatus,
          realizedAmount: null,
        });
      }
    });
  }

  selectType(type: TransactionType): void {
    this.form.controls.type.setValue(type);
    if (!this.isEditMode() && !this.form.controls.status.dirty) {
      this.form.controls.status.setValue(type === 'INCOME' ? 'PENDING' : 'COMPLETED');
    }
  }

  toggleCategoryMode(): void {
    this.useNewCategory.update((val) => {
      const next = !val;
      if (next) {
        this.form.controls.categoryId.setValue('');
      } else {
        this.form.controls.categoryName.setValue('');
      }
      return next;
    });
  }

  hasFieldError(
    field: 'description' | 'amount' | 'date' | 'status' | 'realizedAmount' | 'categoryName'
  ): boolean {
    const control = this.form.controls[field];
    return Boolean(
      (control.invalid && (control.dirty || control.touched)) ||
      this.serverFieldErrors()[field]
    );
  }

  getFieldError(
    field: 'description' | 'amount' | 'date' | 'status' | 'realizedAmount' | 'categoryName'
  ): string | null {
    const serverError = this.serverFieldErrors()[field];
    if (serverError) {
      return serverError;
    }

    const control = this.form.controls[field];
    if (!control.invalid || (!control.dirty && !control.touched)) {
      return null;
    }

    if (control.hasError('required')) {
      switch (field) {
        case 'description':
          return 'A descrição é obrigatória';
        case 'amount':
          return 'O valor previsto é obrigatório';
        case 'date':
          return 'A data prevista é obrigatória';
        case 'status':
          return 'O status da transação é obrigatório';
      }
    }

    if (control.hasError('maxlength')) {
      return field === 'categoryName'
        ? 'O nome da categoria deve ter no máximo 100 caracteres'
        : 'A descrição deve ter no máximo 255 caracteres';
    }

    if (control.hasError('min')) {
      return field === 'realizedAmount'
        ? 'O valor realizado deve ser maior que zero'
        : 'O valor previsto deve ser maior que zero';
    }

    return null;
  }

  onClose(): void {
    if (!this.isSubmitting()) {
      this.closed.emit();
    }
  }

  onSubmit(): void {
    this.errorMessage.set(null);
    this.serverFieldErrors.set({});

    const descriptionTrimmed = this.form.controls.description.value.trim();
    if (!descriptionTrimmed) {
      this.form.controls.description.setValue('');
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    const amount = Number(raw.amount);
    const realizedAmount =
      raw.status === 'COMPLETED' && raw.realizedAmount !== null && raw.realizedAmount !== undefined
        ? Number(raw.realizedAmount)
        : null;

    const categoryNameTrimmed = this.useNewCategory() ? raw.categoryName.trim() : '';
    const categoryId =
      !this.useNewCategory() && raw.categoryId ? raw.categoryId : null;
    const categoryName =
      this.useNewCategory() && categoryNameTrimmed ? categoryNameTrimmed : null;

    const editing = this.editingTransaction();
    this.isSubmitting.set(true);

    if (editing) {
      const updatePayload: TransactionRequestDTO = {
        type: raw.type,
        description: descriptionTrimmed,
        amount,
        date: raw.date,
        status: raw.status,
        realizedAmount,
        realizedAt: raw.status === 'COMPLETED' ? editing.realizedAt : null,
        categoryId,
        categoryName,
      };

      this.transactionService
        .update(editing.id, updatePayload)
        .pipe(finalize(() => this.isSubmitting.set(false)))
        .subscribe({
          next: (updated) => {
            this.toastService.success('Lançamento atualizado com sucesso.');
            this.saved.emit(updated);
          },
          error: (err: unknown) => {
            const parsed = parseHttpError(err);
            this.serverFieldErrors.set(parsed.fieldErrors);
            this.errorMessage.set(parsed.message);
          },
        });
      return;
    }

    const typedPayload: TypedTransactionRequestDTO = {
      description: descriptionTrimmed,
      amount,
      date: raw.date,
      status: raw.status,
      realizedAmount,
      categoryId,
      categoryName,
    };

    const request$ =
      raw.type === 'INCOME'
        ? this.transactionService.createIncome(typedPayload)
        : this.transactionService.createExpense(typedPayload);

    request$.pipe(finalize(() => this.isSubmitting.set(false))).subscribe({
      next: (created) => {
        this.toastService.success(
          raw.type === 'INCOME'
            ? 'Entrada registrada com sucesso.'
            : 'Despesa registrada com sucesso.'
        );
        this.saved.emit(created);
      },
      error: (err: unknown) => {
        const parsed = parseHttpError(err);
        this.serverFieldErrors.set(parsed.fieldErrors);
        this.errorMessage.set(parsed.message);
      },
    });
  }

  private getTodayIsoDate(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
