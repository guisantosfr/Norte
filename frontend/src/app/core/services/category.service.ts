import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CategoryRequestDTO, CategoryResponseDTO } from '../models/category.model';

@Injectable({
  providedIn: 'root',
})
export class CategoryService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/categories`;

  findAll(active?: boolean | null): Observable<CategoryResponseDTO[]> {
    let params = new HttpParams();
    if (active !== undefined && active !== null) {
      params = params.set('active', String(active));
    }
    return this.http.get<CategoryResponseDTO[]>(this.baseUrl, { params });
  }

  findById(id: string): Observable<CategoryResponseDTO> {
    return this.http.get<CategoryResponseDTO>(`${this.baseUrl}/${id}`);
  }

  create(payload: CategoryRequestDTO): Observable<CategoryResponseDTO> {
    return this.http.post<CategoryResponseDTO>(this.baseUrl, payload);
  }

  update(id: string, payload: CategoryRequestDTO): Observable<CategoryResponseDTO> {
    return this.http.put<CategoryResponseDTO>(`${this.baseUrl}/${id}`, payload);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
