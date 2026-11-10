import { CurrencyPipe } from '@angular/common';
import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { parseHttpError } from '../../../core/http/api-error.model';
import { CategoryResponseDTO } from '../../../core/models/category.model';
import {
  RecurrenceScope,
  RecurringTransactionRequestDTO,
  RecurringTransactionResponseDTO,
  RecurringTransactionUpdateDTO,
} from '../../../core/models/recurring-transaction.model';
import { TransactionType } from '../../../core/models/transaction.model';
import { RecurringTransactionService } from '../../../core/services/recurring-transaction.service';
import { ToastService } from '../../../shared/services/toast.service';

export type RecurrenceMode = 'FIXED' | 'INSTALLMENT';

@Component({
  selector: 'app-recurrence-form-modal',
  standalone: true,
  imports: [ReactiveFormsModule, CurrencyPipe],
  template: `
    @if (open()) {
      <div
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-[1px] overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="rec-modal-title"
      >
        <div
          class="w-full max-w-xl rounded-2xl border border-border bg-surface p-6 sm:p-7 shadow-xl my-8"
        >
          <!-- Cabeçalho -->
          <div class="flex items-start justify-between gap-4 border-b border-border pb-4">
            <div>
              <h2 id="rec-modal-title" class="text-lg font-bold text-text">
                {{ modalTitle() }}
              </h2>
              <p class="mt-0.5 text-xs text-text-secondary">
                {{
                  isEditMode()
                    ? 'Ajuste as regras da série preservando as ocorrências já realizadas.'
                    : 'Automatize o lançamento mensal de contas fixas, salários ou compras parceladas.'
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
            <!-- Modalidade: Recorrência Fixa vs Parcelamento -->
            <div>
              <label class="block text-xs font-semibold uppercase tracking-wider text-text-muted mb-2">
                Modalidade da Série
              </label>
              <div class="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  (click)="setMode('FIXED')"
                  class="flex flex-col items-start rounded-xl border p-3 text-left transition-all cursor-pointer"
                  [class.border-support]="mode() === 'FIXED'"
                  [class.bg-support/10]="mode() === 'FIXED'"
                  [class.border-border]="mode() !== 'FIXED'"
                  [class.bg-background]="mode() !== 'FIXED'"
                >
                  <span
                    class="text-xs font-bold"
                    [class.text-support]="mode() === 'FIXED'"
                    [class.text-text]="mode() !== 'FIXED'"
                  >
                    Recorrência Fixa
                  </span>
                  <span class="mt-0.5 text-[11px] text-text-muted">
                    Contínua (ex.: Aluguel, Salário, Internet)
                  </span>
                </button>

                <button
                  type="button"
                  (click)="setMode('INSTALLMENT')"
                  class="flex flex-col items-start rounded-xl border p-3 text-left transition-all cursor-pointer"
                  [class.border-info]="mode() === 'INSTALLMENT'"
                  [class.bg-info/10]="mode() === 'INSTALLMENT'"
                  [class.border-border]="mode() !== 'INSTALLMENT'"
                  [class.bg-background]="mode() !== 'INSTALLMENT'"
                >
                  <span
                    class="text-xs font-bold"
                    [class.text-info]="mode() === 'INSTALLMENT'"
                    [class.text-text]="mode() !== 'INSTALLMENT'"
                  >
                    Parcelamento
                  </span>
                  <span class="mt-0.5 text-[11px] text-text-muted">
                    Quantidade definida de parcelas (ex.: 10x)
                  </span>
                </button>
              </div>
            </div>

            <!-- Tipo: Entrada ou Despesa -->
            <div>
              <label class="block text-xs font-semibold uppercase tracking-wider text-text-muted mb-2">
                Natureza Financeira
              </label>
              <div class="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  (click)="form.controls.type.setValue('INCOME')"
                  class="flex items-center justify-center gap-2 rounded-xl border px-4 py-2 text-xs font-semibold transition-all cursor-pointer"
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
                  (click)="form.controls.type.setValue('EXPENSE')"
                  class="flex items-center justify-center gap-2 rounded-xl border px-4 py-2 text-xs font-semibold transition-all cursor-pointer"
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
              <label for="rec-description" class="block text-sm font-medium text-text mb-1.5">
                Descrição <span class="text-expense">*</span>
              </label>
              <input
                id="rec-description"
                type="text"
                formControlName="description"
                [placeholder]="
                  mode() === 'INSTALLMENT'
                    ? 'Ex.: Notebook, Seguro Anual, Curso...'
                    : 'Ex.: Aluguel, Salário, Condomínio, Academia...'
                "
                class="w-full rounded-xl border bg-background px-3.5 py-2.5 text-sm text-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-support transition-colors"
                [class.border-expense]="hasFieldError('description')"
                [class.border-border]="!hasFieldError('description')"
              />
              @if (getFieldError('description'); as error) {
                <p class="mt-1 text-xs text-expense">{{ error }}</p>
              }
            </div>

            <!-- Valor e Dia do Mês -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label for="rec-amount" class="block text-sm font-medium text-text mb-1.5">
                  {{ mode() === 'INSTALLMENT' ? 'Valor da parcela (R$)' : 'Valor mensal (R$)' }}
                  <span class="text-expense">*</span>
                </label>
                <input
                  id="rec-amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  formControlName="amount"
                  placeholder="0,00"
                  class="w-full rounded-xl border bg-background px-3.5 py-2.5 text-sm text-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-support transition-colors"
                  [class.border-expense]="hasFieldError('amount')"
                  [class.border-border]="!hasFieldError('amount')"
                />
                @if (getFieldError('amount'); as error) {
                  <p class="mt-1 text-xs text-expense">{{ error }}</p>
                }
              </div>

              <div>
                <label for="rec-day" class="block text-sm font-medium text-text mb-1.5">
                  Dia do vencimento (1 a 31) <span class="text-expense">*</span>
                </label>
                <input
                  id="rec-day"
                  type="number"
                  min="1"
                  max="31"
                  formControlName="dayOfMonth"
                  placeholder="Ex.: 10"
                  class="w-full rounded-xl border bg-background px-3.5 py-2.5 text-sm text-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-support transition-colors"
                  [class.border-expense]="hasFieldError('dayOfMonth')"
                  [class.border-border]="!hasFieldError('dayOfMonth')"
                />
                @if (getFieldError('dayOfMonth'); as error) {
                  <p class="mt-1 text-xs text-expense">{{ error }}</p>
                } @else {
                  <p class="mt-1 text-[11px] text-text-muted">
                    Em meses mais curtos (ex.: fevereiro), ajusta para o último dia do mês.
                  </p>
                }
              </div>
            </div>

            <!-- Data de Início (na criação) e Número de Parcelas (quando Parcelamento) -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              @if (!isEditMode()) {
                <div>
                  <label for="rec-start" class="block text-sm font-medium text-text mb-1.5">
                    Data de início
                  </label>
                  <input
                    id="rec-start"
                    type="date"
                    [min]="todayIso"
                    formControlName="startDate"
                    class="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-text focus:outline-none focus:ring-2 focus:ring-support transition-colors"
                  />
                  <p class="mt-1 text-[11px] text-text-muted">
                    Ocorrências são geradas a partir desta data (nunca retroativas).
                  </p>
                </div>
              }

              @if (mode() === 'INSTALLMENT') {
                <div [class.sm:col-span-2]="isEditMode()">
                  <label for="rec-occurrences" class="block text-sm font-medium text-text mb-1.5">
                    Quantidade de parcelas <span class="text-expense">*</span>
                  </label>
                  <input
                    id="rec-occurrences"
                    type="number"
                    min="1"
                    step="1"
                    formControlName="occurrences"
                    placeholder="Ex.: 12"
                    class="w-full rounded-xl border bg-background px-3.5 py-2.5 text-sm text-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-support transition-colors"
                    [class.border-expense]="hasFieldError('occurrences')"
                    [class.border-border]="!hasFieldError('occurrences')"
                  />
                  @if (getFieldError('occurrences'); as error) {
                    <p class="mt-1 text-xs text-expense">{{ error }}</p>
                  }
                </div>
              }
            </div>

            <!-- Categoria -->
            <div>
              <div class="flex items-center justify-between mb-1.5">
                <label
                  [for]="useNewCategory() ? 'rec-category-name' : 'rec-category-id'"
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
                  id="rec-category-name"
                  type="text"
                  formControlName="categoryName"
                  placeholder="Digite o nome da nova categoria (máx. 100 caracteres)"
                  class="w-full rounded-xl border bg-background px-3.5 py-2.5 text-sm text-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-support transition-colors"
                />
              } @else {
                <select
                  id="rec-category-id"
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

            <!-- Escopo de Alteração (Exibido apenas na Edição) -->
            @if (isEditMode()) {
              <div class="rounded-xl border border-support/30 bg-support/10 p-4 space-y-2.5">
                <label class="block text-xs font-bold uppercase tracking-wider text-support">
                  Escopo da Alteração (Preservação de Histórico)
                </label>

                <div class="space-y-2 text-xs">
                  <label class="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="radio"
                      formControlName="scope"
                      value="FUTURE"
                      class="mt-0.5 accent-support"
                    />
                    <div>
                      <span class="font-semibold text-text">
                        Apenas pendentes futuras (Recomendado)
                      </span>
                      <p class="text-[11px] text-text-secondary">
                        Atualiza somente as ocorrências pendentes com vencimento de hoje em diante.
                      </p>
                    </div>
                  </label>

                  <label class="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="radio"
                      formControlName="scope"
                      value="ALL"
                      class="mt-0.5 accent-support"
                    />
                    <div>
                      <span class="font-semibold text-text">
                        Todas as ocorrências pendentes
                      </span>
                      <p class="text-[11px] text-text-secondary">
                        Atualiza todas as ocorrências ainda pendentes (inclusive pendentes vencidas).
                      </p>
                    </div>
                  </label>
                </div>

                <p class="text-[11px] font-medium text-text-muted border-t border-support/20 pt-2">
                  Nota: Lançamentos já efetivados (pagos/recebidos) ou cancelados nunca são alterados.
                </p>
              </div>
            }

            <!-- Resumo / Prévia da Geração -->
            @if (form.controls.amount.value && form.controls.dayOfMonth.value) {
              <div class="rounded-xl border border-border bg-background p-3.5 text-xs text-text-secondary">
                @if (mode() === 'INSTALLMENT' && form.controls.occurrences.value) {
                  <span>
                    Resumo: Serão programadas
                    <strong class="text-text">{{ form.controls.occurrences.value }} parcelas</strong>
                    mensais de
                    <strong class="text-text">{{ form.controls.amount.value | currency: 'BRL' }}</strong>
                    todo dia <strong class="text-text">{{ form.controls.dayOfMonth.value }}</strong>,
                    totalizando
                    <strong class="text-text">
                      {{
                        (form.controls.amount.value * form.controls.occurrences.value)
                          | currency: 'BRL'
                      }}
                    </strong>.
                  </span>
                } @else {
                  <span>
                    Resumo: Série mensal contínua de
                    <strong class="text-text">{{ form.controls.amount.value | currency: 'BRL' }}</strong>
                    todo dia <strong class="text-text">{{ form.controls.dayOfMonth.value }}</strong>
                    (gera automaticamente a janela de 12 meses à frente).
                  </span>
                }
              </div>
            }

            <!-- Rodapé -->
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
                  <span>Processando...</span>
                } @else {
                  <span>
                    {{
                      isEditMode()
                        ? 'Salvar alterações'
                        : mode() === 'INSTALLMENT'
                          ? 'Criar parcelamento'
                          : 'Criar recorrência'
                    }}
                  </span>
                }
              </button>
            </div>
          </form>
        </div>
      </div>
    }
  `,
})
export class RecurrenceFormModalComponent {
  private readonly fb = inject(FormBuilder);
  private readonly recurringService = inject(RecurringTransactionService);
  private readonly toastService = inject(ToastService);

  readonly open = input<boolean>(false);
  readonly initialMode = input<RecurrenceMode>('FIXED');
  readonly editingRecurrence = input<RecurringTransactionResponseDTO | null>(null);
  readonly categories = input<CategoryResponseDTO[]>([]);

  readonly saved = output<RecurringTransactionResponseDTO>();
  readonly closed = output<void>();

  readonly mode = signal<RecurrenceMode>('FIXED');
  readonly useNewCategory = signal(false);
  readonly isSubmitting = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly serverFieldErrors = signal<Record<string, string>>({});

  readonly todayIso = this.getTodayIsoDate();

  readonly isEditMode = computed(() => Boolean(this.editingRecurrence()));

  readonly selectableCategories = computed(() => {
    const all = this.categories();
    const editing = this.editingRecurrence();
    return all.filter((cat) => cat.active || (editing && editing.categoryId === cat.id));
  });

  readonly modalTitle = computed(() => {
    const editing = this.editingRecurrence();
    if (editing) {
      return editing.occurrences !== null ? 'Editar Parcelamento' : 'Editar Recorrência Fixa';
    }
    return this.mode() === 'INSTALLMENT' ? 'Novo Parcelamento' : 'Nova Recorrência Fixa';
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
    dayOfMonth: this.fb.control<number | null>(new Date().getDate(), [
      Validators.required,
      Validators.min(1),
      Validators.max(31),
    ]),
    startDate: this.fb.nonNullable.control(this.todayIso),
    occurrences: this.fb.control<number | null>(null, [Validators.min(1)]),
    categoryId: this.fb.nonNullable.control(''),
    categoryName: this.fb.nonNullable.control('', [Validators.maxLength(100)]),
    scope: this.fb.nonNullable.control<RecurrenceScope>('FUTURE'),
  });

  constructor() {
    effect(() => {
      const isOpen = this.open();
      const editing = this.editingRecurrence();
      const defaultMode = this.initialMode();

      if (!isOpen) {
        return;
      }

      this.errorMessage.set(null);
      this.serverFieldErrors.set({});
      this.useNewCategory.set(false);

      if (editing) {
        const editMode: RecurrenceMode = editing.occurrences !== null ? 'INSTALLMENT' : 'FIXED';
        this.mode.set(editMode);
        this.form.reset({
          type: editing.type,
          description: editing.description,
          amount: editing.amount,
          dayOfMonth: editing.dayOfMonth,
          startDate: editing.startDate,
          occurrences: editing.occurrences,
          categoryId: editing.categoryId ?? '',
          categoryName: '',
          scope: 'FUTURE',
        });
      } else {
        this.mode.set(defaultMode);
        this.form.reset({
          type: 'EXPENSE',
          description: '',
          amount: null,
          dayOfMonth: new Date().getDate(),
          startDate: this.todayIso,
          occurrences: defaultMode === 'INSTALLMENT' ? 12 : null,
          categoryId: '',
          categoryName: '',
          scope: 'FUTURE',
        });
      }
    });
  }

  setMode(newMode: RecurrenceMode): void {
    this.mode.set(newMode);
    if (newMode === 'FIXED') {
      this.form.controls.occurrences.setValue(null);
    } else if (!this.form.controls.occurrences.value) {
      this.form.controls.occurrences.setValue(12);
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
    field: 'description' | 'amount' | 'dayOfMonth' | 'occurrences'
  ): boolean {
    const ctrl = this.form.controls[field];
    if (this.serverFieldErrors()[field]) {
      return true;
    }
    if (
      field === 'occurrences' &&
      this.mode() === 'INSTALLMENT' &&
      !ctrl.value &&
      (ctrl.dirty || ctrl.touched)
    ) {
      return true;
    }
    return Boolean(ctrl.invalid && (ctrl.dirty || ctrl.touched));
  }

  getFieldError(
    field: 'description' | 'amount' | 'dayOfMonth' | 'occurrences'
  ): string | null {
    const serverError = this.serverFieldErrors()[field];
    if (serverError) {
      return serverError;
    }

    const ctrl = this.form.controls[field];
    if (
      field === 'occurrences' &&
      this.mode() === 'INSTALLMENT' &&
      !ctrl.value &&
      (ctrl.dirty || ctrl.touched)
    ) {
      return 'Informe a quantidade de parcelas';
    }

    if (!ctrl.invalid || (!ctrl.dirty && !ctrl.touched)) {
      return null;
    }

    if (ctrl.hasError('required')) {
      switch (field) {
        case 'description':
          return 'A descrição é obrigatória';
        case 'amount':
          return 'O valor previsto é obrigatório';
        case 'dayOfMonth':
          return 'O dia do mês é obrigatório';
      }
    }

    if (ctrl.hasError('maxlength')) {
      return 'A descrição deve ter no máximo 255 caracteres';
    }

    if (ctrl.hasError('min') || ctrl.hasError('max')) {
      if (field === 'dayOfMonth') {
        return 'O dia do mês deve ser entre 1 e 31';
      }
      if (field === 'occurrences') {
        return 'A quantidade de ocorrências deve ser maior que zero';
      }
      return 'O valor previsto deve ser maior que zero';
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

    const descTrimmed = this.form.controls.description.value.trim();
    if (!descTrimmed) {
      this.form.controls.description.setValue('');
    }

    if (this.mode() === 'INSTALLMENT' && !this.form.controls.occurrences.value) {
      this.form.controls.occurrences.markAsTouched();
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    const amount = Number(raw.amount);
    const dayOfMonth = Number(raw.dayOfMonth);
    const occurrences =
      this.mode() === 'INSTALLMENT' && raw.occurrences ? Number(raw.occurrences) : null;

    const categoryNameTrimmed = this.useNewCategory() ? raw.categoryName.trim() : '';
    const categoryId = !this.useNewCategory() && raw.categoryId ? raw.categoryId : null;
    const categoryName = this.useNewCategory() && categoryNameTrimmed ? categoryNameTrimmed : null;

    const editing = this.editingRecurrence();
    this.isSubmitting.set(true);

    if (editing) {
      const updatePayload: RecurringTransactionUpdateDTO = {
        type: raw.type,
        description: descTrimmed,
        amount,
        dayOfMonth,
        occurrences,
        categoryId,
        categoryName,
      };

      this.recurringService
        .update(editing.id, raw.scope, updatePayload)
        .pipe(finalize(() => this.isSubmitting.set(false)))
        .subscribe({
          next: (updated) => {
            this.toastService.success('Série atualizada com sucesso!');
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

    const createPayload: RecurringTransactionRequestDTO = {
      type: raw.type,
      description: descTrimmed,
      amount,
      frequency: 'MONTHLY',
      startDate: raw.startDate || this.todayIso,
      dayOfMonth,
      occurrences,
      categoryId,
      categoryName,
    };

    this.recurringService
      .create(createPayload)
      .pipe(finalize(() => this.isSubmitting.set(false)))
      .subscribe({
        next: (created) => {
          this.toastService.success(
            occurrences
              ? `Parcelamento em ${occurrences}x criado com geração automática das parcelas!`
              : 'Recorrência mensal criada com geração automática das próximas ocorrências!'
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
