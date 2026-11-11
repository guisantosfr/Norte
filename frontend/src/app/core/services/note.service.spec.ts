import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { NoteResponseDTO } from '../models/note.model';
import { NoteService } from './note.service';

describe('NoteService', () => {
  let service: NoteService;
  let httpMock: HttpTestingController;
  const baseUrl = `${environment.apiUrl}/notes`;

  const mockNote: NoteResponseDTO = {
    id: 'note-1',
    userId: 'user-1',
    title: 'Planejamento de reserva',
    content: 'Separar 20% da renda mensal para reserva de emergência.',
    createdAt: '2026-11-11T10:00:00Z',
    updatedAt: '2026-11-11T10:00:00Z',
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [NoteService, provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(NoteService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should list notes with optional search query parameter', () => {
    service.findAll('reserva').subscribe((notes) => {
      expect(notes.length).toBe(1);
      expect(notes[0].title).toBe('Planejamento de reserva');
    });

    const req = httpMock.expectOne(
      (request) => request.url === baseUrl && request.params.get('search') === 'reserva'
    );
    expect(req.request.method).toBe('GET');
    req.flush([mockNote]);
  });

  it('should create, update and delete a note', () => {
    service.create({ title: 'Planejamento de reserva', content: mockNote.content }).subscribe((res) => {
      expect(res.id).toBe('note-1');
    });
    const createReq = httpMock.expectOne(baseUrl);
    expect(createReq.request.method).toBe('POST');
    createReq.flush(mockNote);

    service.update('note-1', { title: 'Atualizado', content: 'Novo conteúdo' }).subscribe();
    const updateReq = httpMock.expectOne(`${baseUrl}/note-1`);
    expect(updateReq.request.method).toBe('PUT');
    updateReq.flush({ ...mockNote, title: 'Atualizado', content: 'Novo conteúdo' });

    service.delete('note-1').subscribe();
    const deleteReq = httpMock.expectOne(`${baseUrl}/note-1`);
    expect(deleteReq.request.method).toBe('DELETE');
    deleteReq.flush(null);
  });
});
