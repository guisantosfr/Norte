import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, input, output, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { finalize } from 'rxjs';
import { parseHttpError } from '../../../core/http/api-error.model';
import { NoteRequestDTO, NoteResponseDTO } from '../../../core/models/note.model';
import { NoteService } from '../../../core/services/note.service';
import { ToastService } from '../../../shared/services/toast.service';

function notBlankValidator(control: AbstractControl): ValidationErrors | null {
  const value = String(control.value ?? '');
  if (!value.trim()) {
    return { blank: true };
  }
  return null;
}

@Component({
  selector: 'app-note-form-modal',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <div
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
      (click)="onCancel()"
    >
      <div
        class="w-full max-w-2xl rounded-2xl border border-border bg-surface p-6 shadow-xl"
        (click)="$event.stopPropagation()"
      >
        <!-- Header -->
        <div class="flex items-start justify-between gap-4 border-b border-border pb-4">
          <div>
            <h2 class="text-lg font-bold text-text">
              {{ note() ? 'Editar Anotação' : 'Nova Anotação' }}
            </h2>
            <p class="mt-0.5 text-xs text-text-secondary">
              Registre metas, lembretes livres, ideias de orçamento ou observações financeiras.
            </p>
          </div>
          <button
            type="button"
            (click)="onCancel()"
            aria-label="Fechar modal"
            class="rounded-lg p-1 text-text-muted hover:bg-background hover:text-text cursor-pointer"
          >
            ✕
          </button>
        </div>

        @if (errorMessage()) {
          <div
            class="mt-4 rounded-xl border border-expense/40 bg-expense/10 px-4 py-3 text-xs font-medium text-expense"
          >
            {{ errorMessage() }}
          </div>
        }

        <form [formGroup]="form" (ngSubmit)="onSubmit()" class="mt-4 space-y-4">
          <!-- Title -->
          <div>
            <div class="flex items-center justify-between">
              <label for="note-title" class="block text-xs font-semibold text-text-secondary">
                Título <span class="font-normal text-text-muted">(opcional)</span>
              </label>
              <span
                class="text-[11px]"
                [class.text-expense]="titleLength() > 150"
                [class.text-text-muted]="titleLength() <= 150"
              >
                {{ titleLength() }}/150
              </span>
            </div>
            <input
              id="note-title"
              type="text"
              formControlName="title"
              maxlength="150"
              placeholder="Ex.: Metas financeiras do semestre, Planejamento de viagem..."
              class="mt-1.5 w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-text placeholder:text-text-muted focus:border-support focus:outline-none"
            />
            @if (form.controls.title.touched && form.controls.title.errors?.['maxlength']) {
              <p class="mt-1 text-xs text-expense">
                O título deve ter no máximo 150 caracteres.
              </p>
            }
          </div>

          <!-- Content -->
          <div>
            <div class="flex items-center justify-between">
              <label for="note-content" class="block text-xs font-semibold text-text-secondary">
                Conteúdo *
              </label>
              <span
                class="text-[11px]"
                [class.text-expense]="contentLength() > 5000"
                [class.text-text-muted]="contentLength() <= 5000"
              >
                {{ contentLength() }}/5000
              </span>
            </div>
            <textarea
              id="note-content"
              rows="8"
              formControlName="content"
              maxlength="5000"
              placeholder="Escreva sua anotação aqui..."
              class="mt-1.5 w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-text placeholder:text-text-muted focus:border-support focus:outline-none resize-y"
            ></textarea>
            @if (form.controls.content.touched && form.controls.content.invalid) {
              <p class="mt-1 text-xs text-expense">
                @if (form.controls.content.errors?.['required'] || form.controls.content.errors?.['blank']) {
                  O conteúdo da anotação é obrigatório.
                } @else if (form.controls.content.errors?.['maxlength']) {
                  O conteúdo da anotação deve ter no máximo 5000 caracteres.
                }
              </p>
            }
          </div>

          <!-- Actions -->
          <div class="flex items-center justify-end gap-2.5 border-t border-border pt-4">
            <button
              type="button"
              (click)="onCancel()"
              [disabled]="isSubmitting()"
              class="rounded-xl border border-border bg-background px-4 py-2 text-xs font-semibold text-text-secondary hover:text-text disabled:opacity-50 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              [disabled]="isSubmitting()"
              class="rounded-xl bg-primary px-5 py-2 text-xs font-semibold text-white shadow-sm hover:opacity-95 disabled:opacity-50 cursor-pointer"
            >
              {{ isSubmitting() ? 'Salvando...' : note() ? 'Salvar alterações' : 'Criar anotação' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  `,
})
export class NoteFormModalComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly noteService = inject(NoteService);
  private readonly toastService = inject(ToastService);

  readonly note = input<NoteResponseDTO | null>(null);
  readonly saved = output<NoteResponseDTO>();
  readonly cancelled = output<void>();

  readonly isSubmitting = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    title: ['', [Validators.maxLength(150)]],
    content: ['', [Validators.required, notBlankValidator, Validators.maxLength(5000)]],
  });

  ngOnInit(): void {
    const existing = this.note();
    if (existing) {
      this.form.patchValue({
        title: existing.title ?? '',
        content: existing.content,
      });
    }
  }

  titleLength(): number {
    return (this.form.controls.title.value ?? '').length;
  }

  contentLength(): number {
    return (this.form.controls.content.value ?? '').length;
  }

  onCancel(): void {
    if (!this.isSubmitting()) {
      this.cancelled.emit();
    }
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.errorMessage.set(null);
    this.isSubmitting.set(true);

    const raw = this.form.getRawValue();
    const trimmedTitle = raw.title.trim();
    const payload: NoteRequestDTO = {
      title: trimmedTitle.length > 0 ? trimmedTitle : null,
      content: raw.content.trim(),
    };

    const existing = this.note();
    const request$ = existing
      ? this.noteService.update(existing.id, payload)
      : this.noteService.create(payload);

    request$.pipe(finalize(() => this.isSubmitting.set(false))).subscribe({
      next: (savedNote) => {
        this.toastService.success(
          existing ? 'Anotação atualizada com sucesso.' : 'Anotação criada com sucesso.'
        );
        this.saved.emit(savedNote);
      },
      error: (err: HttpErrorResponse) => {
        const parsed = parseHttpError(err);
        const firstFieldError = Object.values(parsed.fieldErrors)[0];
        this.errorMessage.set(firstFieldError ?? parsed.message);
      },
    });
  }
}
