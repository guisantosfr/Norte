import { DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { parseHttpError } from '../../core/http/api-error.model';
import { CategoryResponseDTO } from '../../core/models/category.model';
import { CategoryService } from '../../core/services/category.service';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog.component';
import { ToastService } from '../../shared/services/toast.service';
import { CategoryReportModalComponent } from '../financial/components/category-report-modal.component';

@Component({
  selector: 'app-categories-page',
  standalone: true,
  imports: [
    FormsModule,
    ReactiveFormsModule,
    DatePipe,
    ConfirmDialogComponent,
    CategoryReportModalComponent,
  ],
  template: `
    <div class="space-y-6">
      <!-- Cabeçalho -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 class="text-2xl font-bold text-text">Categorias</h1>
          <p class="mt-1 text-sm text-text-secondary">
            Organize e classifique suas entradas e despesas para analisar para onde vai o seu dinheiro.
          </p>
        </div>

        <button
          type="button"
          (click)="openCreateModal()"
          class="self-start sm:self-auto inline-flex items-center gap-2 rounded-xl bg-support px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:opacity-95 transition-opacity cursor-pointer"
        >
          <span class="text-sm font-bold">+</span>
          <span>Nova Categoria</span>
        </button>
      </div>

      <!-- Resumo e Filtro de Status -->
      <div
        class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-border bg-surface p-4 shadow-xs"
      >
        <div class="flex flex-wrap items-center gap-2">
          <button
            type="button"
            (click)="setStatusFilter('all')"
            class="rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-colors cursor-pointer"
            [class.bg-support]="statusFilter() === 'all'"
            [class.text-white]="statusFilter() === 'all'"
            [class.bg-background]="statusFilter() !== 'all'"
            [class.text-text-secondary]="statusFilter() !== 'all'"
          >
            Todas ({{ counts().total }})
          </button>

          <button
            type="button"
            (click)="setStatusFilter('active')"
            class="rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-colors cursor-pointer"
            [class.bg-support]="statusFilter() === 'active'"
            [class.text-white]="statusFilter() === 'active'"
            [class.bg-background]="statusFilter() !== 'active'"
            [class.text-text-secondary]="statusFilter() !== 'active'"
          >
            Ativas ({{ counts().active }})
          </button>

          <button
            type="button"
            (click)="setStatusFilter('inactive')"
            class="rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-colors cursor-pointer"
            [class.bg-support]="statusFilter() === 'inactive'"
            [class.text-white]="statusFilter() === 'inactive'"
            [class.bg-background]="statusFilter() !== 'inactive'"
            [class.text-text-secondary]="statusFilter() !== 'inactive'"
          >
            Inativas ({{ counts().inactive }})
          </button>
        </div>
      </div>

      <!-- Listagem de Categorias -->
      @if (isLoading()) {
        <div
          class="flex flex-col items-center justify-center rounded-2xl border border-border bg-surface py-16 text-center"
        >
          <span
            class="inline-block h-7 w-7 animate-spin rounded-full border-3 border-support border-t-transparent"
          ></span>
          <p class="mt-3 text-sm font-medium text-text-secondary">
            Carregando categorias...
          </p>
        </div>
      } @else if (filteredCategories().length === 0) {
        <div
          class="flex flex-col items-center justify-center rounded-2xl border border-border bg-surface px-6 py-14 text-center"
        >
          <div
            class="flex h-12 w-12 items-center justify-center rounded-2xl bg-support/15 text-support font-bold text-lg"
          >
            #
          </div>
          <h2 class="mt-4 text-base font-bold text-text">
            Nenhuma categoria encontrada
          </h2>
        </div>
      } @else {
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          @for (cat of filteredCategories(); track cat.id) {
            <div
              class="flex flex-col justify-between rounded-2xl border border-border bg-surface p-5 shadow-xs transition-all hover:border-support/40"
              [class.opacity-70]="!cat.active"
            >
              <div>
                <div class="flex items-start justify-between gap-2">
                  <h3 class="text-base font-bold text-text truncate" [title]="cat.name">
                    {{ cat.name }}
                  </h3>

                  @if (cat.active) {
                    <span
                      class="shrink-0 rounded-full bg-income/15 px-2.5 py-0.5 text-[11px] font-semibold text-income"
                    >
                      Ativa
                    </span>
                  } @else {
                    <span
                      class="shrink-0 rounded-full bg-cancelled/20 px-2.5 py-0.5 text-[11px] font-semibold text-cancelled"
                    >
                      Inativa
                    </span>
                  }
                </div>

                <p class="mt-1.5 text-xs text-text-muted">
                  Criada em {{ cat.createdAt | date: 'dd/MM/yyyy' }}
                </p>
              </div>

              <div class="mt-5 flex items-center justify-between border-t border-border pt-3.5">
                <button
                  type="button"
                  (click)="openReport(cat)"
                  class="text-xs font-semibold text-support hover:underline cursor-pointer"
                >
                  Ver movimentações
                </button>

                <div class="flex items-center gap-1.5">
                  <button
                    type="button"
                    (click)="openEditModal(cat)"
                    class="rounded-lg border border-border bg-background px-2.5 py-1 text-xs font-medium text-text-secondary hover:text-text transition-colors cursor-pointer"
                  >
                    Renomear
                  </button>

                  @if (cat.active) {
                    <button
                      type="button"
                      (click)="requestDelete(cat)"
                      class="rounded-lg border border-border bg-background px-2.5 py-1 text-xs font-medium text-text-secondary hover:border-expense/40 hover:text-expense transition-colors cursor-pointer"
                    >
                      Excluir
                    </button>
                  }
                </div>
              </div>
            </div>
          }
        </div>
      }

      <!-- Modal Criar / Renomear Categoria -->
      @if (formModalOpen()) {
        <div
          class="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-[1px]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="cat-modal-title"
        >
          <div class="w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-xl">
            <div class="flex items-start justify-between gap-4 border-b border-border pb-4">
              <div>
                <h2 id="cat-modal-title" class="text-base font-bold text-text">
                  {{ editingCategory() ? 'Renomear Categoria' : 'Nova Categoria' }}
                </h2>
                <p class="mt-0.5 text-xs text-text-secondary">
                  Informe um nome único de até 100 caracteres.
                </p>
              </div>

              <button
                type="button"
                (click)="closeFormModal()"
                class="rounded-lg p-1.5 text-text-muted hover:bg-background hover:text-text transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            @if (formError()) {
              <div
                role="alert"
                class="mt-4 rounded-xl border border-expense/40 bg-expense/10 px-3.5 py-2.5 text-xs text-expense"
              >
                {{ formError() }}
              </div>
            }

            <form [formGroup]="categoryForm" (ngSubmit)="onSaveCategory()" novalidate class="mt-4 space-y-4">
              <div>
                <label for="cat-name" class="block text-sm font-medium text-text mb-1.5">
                  Nome da categoria <span class="text-expense">*</span>
                </label>
                <input
                  id="cat-name"
                  type="text"
                  formControlName="name"
                  placeholder="Ex.: Alimentação, Moradia, Lazer, Investimentos..."
                  class="w-full rounded-xl border bg-background px-3.5 py-2.5 text-sm text-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-support transition-colors"
                  [class.border-expense]="hasNameError()"
                  [class.border-border]="!hasNameError()"
                />
                @if (getNameError(); as err) {
                  <p class="mt-1 text-xs text-expense">{{ err }}</p>
                }
              </div>

              <div class="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  (click)="closeFormModal()"
                  [disabled]="isSubmitting()"
                  class="rounded-xl border border-border bg-background px-4 py-2 text-xs font-semibold text-text-secondary hover:text-text disabled:opacity-60 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  [disabled]="isSubmitting()"
                  class="inline-flex items-center gap-2 rounded-xl bg-support px-4 py-2 text-xs font-semibold text-white shadow-sm hover:opacity-95 disabled:opacity-60 transition-all cursor-pointer"
                >
                  @if (isSubmitting()) {
                    <span
                      class="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent"
                    ></span>
                  }
                  <span>{{ editingCategory() ? 'Salvar nome' : 'Criar categoria' }}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      }

      <!-- Modal Confirmar Exclusão/Inativação -->
      <app-confirm-dialog
        [open]="deleteDialogOpen()"
        title="Excluir ou inativar categoria"
        [message]="deleteDialogMessage()"
        confirmLabel="Confirmar"
        variant="danger"
        [loading]="isDeleting()"
        (confirmed)="confirmDelete()"
        (cancelled)="closeDeleteDialog()"
      />

      <!-- Modal de Relatório da Categoria -->
      <app-category-report-modal
        [open]="reportModalOpen()"
        [categoryId]="reportCategory()?.id ?? null"
        [categoryName]="reportCategory()?.name ?? ''"
        (closed)="closeReport()"
      />
    </div>
  `,
})
export class CategoriesPageComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly categoryService = inject(CategoryService);
  private readonly toastService = inject(ToastService);

  readonly categories = signal<CategoryResponseDTO[]>([]);
  readonly statusFilter = signal<'all' | 'active' | 'inactive'>('all');
  readonly isLoading = signal(false);

  // Modal Criar/Editar
  readonly formModalOpen = signal(false);
  readonly editingCategory = signal<CategoryResponseDTO | null>(null);
  readonly isSubmitting = signal(false);
  readonly formError = signal<string | null>(null);

  // Modal Excluir
  readonly deleteDialogOpen = signal(false);
  readonly deletingCategory = signal<CategoryResponseDTO | null>(null);
  readonly isDeleting = signal(false);

  // Modal Relatório por Categoria
  readonly reportModalOpen = signal(false);
  readonly reportCategory = signal<CategoryResponseDTO | null>(null);

  readonly categoryForm = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(100)]],
  });

  readonly counts = computed(() => {
    const all = this.categories();
    const active = all.filter((c) => c.active).length;
    return {
      total: all.length,
      active,
      inactive: all.length - active,
    };
  });

  readonly filteredCategories = computed(() => {
    const filter = this.statusFilter();
    const all = this.categories();
    if (filter === 'active') {
      return all.filter((c) => c.active);
    }
    if (filter === 'inactive') {
      return all.filter((c) => !c.active);
    }
    return all;
  });

  readonly deleteDialogMessage = computed(() => {
    const cat = this.deletingCategory();
    if (!cat) {
      return '';
    }
    return `Deseja remover a categoria "${cat.name}"? Caso ela já possua transações ou recorrências vinculadas, será marcada como Inativa para preservar seu histórico financeiro; caso contrário, será excluída definitivamente.`;
  });

  ngOnInit(): void {
    this.loadCategories();
  }

  setStatusFilter(filter: 'all' | 'active' | 'inactive'): void {
    this.statusFilter.set(filter);
  }

  loadCategories(): void {
    this.isLoading.set(true);
    this.categoryService
      .findAll()
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (data) => this.categories.set(data),
        error: (err: unknown) => {
          const parsed = parseHttpError(err);
          this.toastService.error(parsed.message, 'Erro ao carregar categorias');
        },
      });
  }

  openCreateModal(): void {
    this.editingCategory.set(null);
    this.formError.set(null);
    this.categoryForm.reset({ name: '' });
    this.formModalOpen.set(true);
  }

  openEditModal(cat: CategoryResponseDTO): void {
    this.editingCategory.set(cat);
    this.formError.set(null);
    this.categoryForm.reset({ name: cat.name });
    this.formModalOpen.set(true);
  }

  closeFormModal(): void {
    if (!this.isSubmitting()) {
      this.formModalOpen.set(false);
      this.editingCategory.set(null);
    }
  }

  hasNameError(): boolean {
    const ctrl = this.categoryForm.controls.name;
    return Boolean(ctrl.invalid && (ctrl.dirty || ctrl.touched));
  }

  getNameError(): string | null {
    const ctrl = this.categoryForm.controls.name;
    if (!ctrl.invalid || (!ctrl.dirty && !ctrl.touched)) {
      return null;
    }
    if (ctrl.hasError('required')) {
      return 'O nome da categoria é obrigatório';
    }
    if (ctrl.hasError('maxlength')) {
      return 'O nome da categoria deve ter no máximo 100 caracteres';
    }
    return null;
  }

  onSaveCategory(): void {
    this.formError.set(null);
    const trimmed = this.categoryForm.controls.name.value.trim();
    if (!trimmed) {
      this.categoryForm.controls.name.setValue('');
    }

    if (this.categoryForm.invalid) {
      this.categoryForm.markAllAsTouched();
      return;
    }

    const editing = this.editingCategory();
    this.isSubmitting.set(true);

    const req$ = editing
      ? this.categoryService.update(editing.id, { name: trimmed })
      : this.categoryService.create({ name: trimmed });

    req$.pipe(finalize(() => this.isSubmitting.set(false))).subscribe({
      next: () => {
        this.toastService.success(
          editing ? 'Categoria renomeada com sucesso.' : 'Categoria criada com sucesso.'
        );
        this.closeFormModal();
        this.loadCategories();
      },
      error: (err: unknown) => {
        const parsed = parseHttpError(err);
        this.formError.set(parsed.fieldErrors['name'] || parsed.message);
      },
    });
  }

  requestDelete(cat: CategoryResponseDTO): void {
    this.deletingCategory.set(cat);
    this.deleteDialogOpen.set(true);
  }

  closeDeleteDialog(): void {
    if (!this.isDeleting()) {
      this.deleteDialogOpen.set(false);
      this.deletingCategory.set(null);
    }
  }

  confirmDelete(): void {
    const cat = this.deletingCategory();
    if (!cat) {
      return;
    }

    this.isDeleting.set(true);
    this.categoryService
      .delete(cat.id)
      .pipe(finalize(() => this.isDeleting.set(false)))
      .subscribe({
        next: () => {
          this.toastService.success(
            `A categoria "${cat.name}" foi excluída ou inativada conforme seus vínculos.`
          );
          this.closeDeleteDialog();
          this.loadCategories();
        },
        error: (err: unknown) => {
          const parsed = parseHttpError(err);
          this.toastService.error(parsed.message);
        },
      });
  }

  openReport(cat: CategoryResponseDTO): void {
    this.reportCategory.set(cat);
    this.reportModalOpen.set(true);
  }

  closeReport(): void {
    this.reportModalOpen.set(false);
    this.reportCategory.set(null);
  }
}
