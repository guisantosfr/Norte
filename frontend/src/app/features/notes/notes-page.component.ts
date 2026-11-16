import { DatePipe } from '@angular/common';
import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged, finalize } from 'rxjs';
import { NoteResponseDTO } from '../../core/models/note.model';
import { NoteService } from '../../core/services/note.service';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog.component';
import { ToastService } from '../../shared/services/toast.service';
import { NoteFormModalComponent } from './components/note-form-modal.component';

@Component({
  selector: 'app-notes-page',
  standalone: true,
  imports: [DatePipe, FormsModule, ConfirmDialogComponent, NoteFormModalComponent],
  template: `
    <div class="space-y-6">
      <!-- Page Header -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 class="text-2xl font-bold tracking-tight text-text">Anotações Pessoais</h1>
          <p class="mt-1 text-sm text-text-secondary">
            Mantenha metas, lembretes livres e observações do seu planejamento financeiro.
          </p>
        </div>

        <div>
          <button
            type="button"
            (click)="openCreateModal()"
            class="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:opacity-95 transition-opacity cursor-pointer"
          >
            <span>+ Nova anotação</span>
          </button>
        </div>
      </div>

      <!-- Search & Summary Bar -->
      <div
        class="rounded-2xl border border-border bg-surface p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
      >
        <div class="relative flex-1">
          <input
            type="text"
            [ngModel]="searchTerm()"
            (ngModelChange)="onSearchChange($event)"
            placeholder="Pesquisar por título ou conteúdo da anotação..."
            aria-label="Pesquisar anotações"
            class="w-full rounded-xl border border-border bg-background pl-3.5 pr-9 py-2 text-sm text-text placeholder:text-text-muted focus:border-support focus:outline-none"
          />
          @if (searchTerm()) {
            <button
              type="button"
              (click)="clearSearch()"
              title="Limpar busca"
              class="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-xs text-text-muted hover:text-text cursor-pointer"
            >
              ✕
            </button>
          }
        </div>

        <div class="flex items-center justify-between sm:justify-end gap-3 text-xs text-text-muted">
          <span>
            <strong class="font-semibold text-text">{{ notes().length }}</strong> anotação(ões)
            @if (searchTerm().trim()) {
              encontrada(s) para "{{ searchTerm().trim() }}"
            }
          </span>
        </div>
      </div>

      <!-- Notes Grid -->
      @if (isLoading()) {
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          @for (skeleton of [1, 2, 3, 4, 5, 6]; track skeleton) {
            <div class="h-48 rounded-2xl border border-border bg-surface animate-pulse"></div>
          }
        </div>
      } @else if (notes().length === 0) {
        <div
          class="rounded-2xl border border-dashed border-border bg-surface p-10 text-center space-y-3"
        >
          @if (searchTerm().trim()) {
            <p class="text-base font-semibold text-text">
              Nenhuma anotação encontrada para "{{ searchTerm().trim() }}"
            </p>
            <p class="text-xs text-text-secondary">
              Tente outro termo de busca ou limpe o filtro para visualizar todas as suas anotações.
            </p>
            <div>
              <button
                type="button"
                (click)="clearSearch()"
                class="rounded-xl border border-border bg-background px-4 py-2 text-xs font-semibold text-text-secondary hover:text-text cursor-pointer"
              >
                Limpar busca
              </button>
            </div>
          } @else {
            <p class="text-base font-semibold text-text">
              Seu caderno de anotações está vazio
            </p>
            <p class="text-xs text-text-secondary max-w-md mx-auto">
              Crie sua primeira anotação para registrar metas de economia, checklists mensais ou
              decisões financeiras importantes.
            </p>
            <div>
              <button
                type="button"
                (click)="openCreateModal()"
                class="rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-white hover:opacity-95 cursor-pointer"
              >
                + Criar primeira anotação
              </button>
            </div>
          }
        </div>
      } @else {
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          @for (note of notes(); track note.id) {
            <article
              class="group flex flex-col justify-between rounded-2xl border border-border bg-surface p-5 shadow-xs hover:border-support/40 transition-colors"
            >
              <div>
                <!-- Card Header -->
                <div class="flex items-start justify-between gap-2">
                  @if (note.title) {
                    <h2 class="text-base font-bold text-text line-clamp-2">
                      {{ note.title }}
                    </h2>
                  }

                  <span
                    class="shrink-0 rounded-md bg-background px-2 py-0.5 text-[10px] font-medium text-text-muted border border-border ml-auto"
                    title="Última atualização"
                  >
                    {{ note.updatedAt | date: 'dd/MM/yyyy HH:mm' }}
                  </span>
                </div>

                <!-- Content -->
                <p
                  class="mt-3 text-sm text-text-secondary whitespace-pre-line break-words line-clamp-6 leading-relaxed"
                >
                  {{ note.content }}
                </p>
              </div>

              <!-- Card Footer -->
              <div
                class="mt-5 flex items-center justify-between border-t border-border pt-3 text-xs"
              >
                <span class="text-[11px] text-text-muted">
                  @if (note.updatedAt !== note.createdAt) {
                    Editada
                  } @else {
                    Criada em {{ note.createdAt | date: 'dd/MM/yyyy' }}
                  }
                </span>

                <div class="flex items-center gap-2">
                  <button
                    type="button"
                    (click)="openEditModal(note)"
                    class="rounded-lg border border-border bg-background px-2.5 py-1 text-xs font-semibold text-text-secondary hover:text-text hover:border-support/40 transition-colors cursor-pointer"
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    (click)="requestDelete(note)"
                    class="rounded-lg border border-border bg-background px-2.5 py-1 text-xs font-semibold text-text-secondary hover:text-expense hover:border-expense/40 transition-colors cursor-pointer"
                  >
                    Excluir
                  </button>
                </div>
              </div>
            </article>
          }
        </div>
      }

      <!-- Create / Edit Modal -->
      @if (isFormModalOpen()) {
        <app-note-form-modal
          [note]="editingNote()"
          (saved)="onNoteSaved()"
          (cancelled)="closeFormModal()"
        />
      }

      <!-- Delete Confirmation Modal -->
      @if (deletingNote(); as noteToDelete) {
        <app-confirm-dialog
          [open]="true"
          title="Excluir anotação"
          [message]="
            noteToDelete.title
              ? 'Tem certeza que deseja excluir permanentemente a anotação «' +
                noteToDelete.title +
                '»?'
              : 'Tem certeza que deseja excluir permanentemente esta anotação sem título?'
          "
          confirmLabel="Excluir anotação"
          variant="danger"
          [loading]="isDeleting()"
          (confirmed)="confirmDelete()"
          (cancelled)="cancelDelete()"
        />
      }
    </div>
  `,
})
export class NotesPageComponent implements OnInit {
  private readonly noteService = inject(NoteService);
  private readonly toastService = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly searchSubject = new Subject<string>();

  readonly notes = signal<NoteResponseDTO[]>([]);
  readonly searchTerm = signal('');
  readonly isLoading = signal(false);

  readonly isFormModalOpen = signal(false);
  readonly editingNote = signal<NoteResponseDTO | null>(null);
  readonly deletingNote = signal<NoteResponseDTO | null>(null);
  readonly isDeleting = signal(false);

  ngOnInit(): void {
    this.searchSubject
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe((term) => {
        this.loadNotes(term);
      });

    this.loadNotes();
  }

  loadNotes(search = this.searchTerm()): void {
    this.isLoading.set(true);
    this.noteService
      .findAll(search)
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (list) => {
          this.notes.set(list);
        },
        error: () => {
          this.toastService.error('Não foi possível carregar suas anotações.');
        },
      });
  }

  onSearchChange(value: string): void {
    this.searchTerm.set(value);
    this.searchSubject.next(value);
  }

  clearSearch(): void {
    this.searchTerm.set('');
    this.searchSubject.next('');
  }

  openCreateModal(): void {
    this.editingNote.set(null);
    this.isFormModalOpen.set(true);
  }

  openEditModal(note: NoteResponseDTO): void {
    this.editingNote.set(note);
    this.isFormModalOpen.set(true);
  }

  closeFormModal(): void {
    this.isFormModalOpen.set(false);
    this.editingNote.set(null);
  }

  onNoteSaved(): void {
    this.closeFormModal();
    this.loadNotes();
  }

  requestDelete(note: NoteResponseDTO): void {
    this.deletingNote.set(note);
  }

  cancelDelete(): void {
    if (!this.isDeleting()) {
      this.deletingNote.set(null);
    }
  }

  confirmDelete(): void {
    const target = this.deletingNote();
    if (!target) {
      return;
    }

    this.isDeleting.set(true);
    this.noteService
      .delete(target.id)
      .pipe(finalize(() => this.isDeleting.set(false)))
      .subscribe({
        next: () => {
          this.notes.update((list) => list.filter((n) => n.id !== target.id));
          this.deletingNote.set(null);
          this.toastService.success('Anotação excluída com sucesso.');
        },
        error: () => {
          this.deletingNote.set(null);
          this.toastService.error('Não foi possível excluir a anotação.');
        },
      });
  }
}
