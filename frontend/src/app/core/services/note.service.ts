import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { NoteRequestDTO, NoteResponseDTO } from '../models/note.model';

@Injectable({
  providedIn: 'root',
})
export class NoteService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/notes`;

  findAll(search?: string): Observable<NoteResponseDTO[]> {
    let params = new HttpParams();
    const trimmed = search?.trim();
    if (trimmed) {
      params = params.set('search', trimmed);
    }
    return this.http.get<NoteResponseDTO[]>(this.apiUrl, { params });
  }

  findById(id: string): Observable<NoteResponseDTO> {
    return this.http.get<NoteResponseDTO>(`${this.apiUrl}/${id}`);
  }

  create(dto: NoteRequestDTO): Observable<NoteResponseDTO> {
    return this.http.post<NoteResponseDTO>(this.apiUrl, dto);
  }

  update(id: string, dto: NoteRequestDTO): Observable<NoteResponseDTO> {
    return this.http.put<NoteResponseDTO>(`${this.apiUrl}/${id}`, dto);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
