import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  RecurrenceScope,
  RecurringTransactionFilters,
  RecurringTransactionRequestDTO,
  RecurringTransactionResponseDTO,
  RecurringTransactionUpdateDTO,
} from '../models/recurring-transaction.model';
import { TransactionResponseDTO } from '../models/transaction.model';

@Injectable({
  providedIn: 'root',
})
export class RecurringTransactionService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/recurring-transactions`;

  findAll(
    filters?: RecurringTransactionFilters
  ): Observable<RecurringTransactionResponseDTO[]> {
    let params = new HttpParams();

    if (filters) {
      if (filters.active !== undefined && filters.active !== null) {
        params = params.set('active', String(filters.active));
      }
      if (filters.type) {
        params = params.set('type', filters.type);
      }
      if (filters.categoryId) {
        params = params.set('categoryId', filters.categoryId);
      }
    }

    return this.http.get<RecurringTransactionResponseDTO[]>(this.baseUrl, { params });
  }

  findById(id: string): Observable<RecurringTransactionResponseDTO> {
    return this.http.get<RecurringTransactionResponseDTO>(`${this.baseUrl}/${id}`);
  }

  findOccurrences(id: string): Observable<TransactionResponseDTO[]> {
    return this.http.get<TransactionResponseDTO[]>(`${this.baseUrl}/${id}/transactions`);
  }

  create(payload: RecurringTransactionRequestDTO): Observable<RecurringTransactionResponseDTO> {
    return this.http.post<RecurringTransactionResponseDTO>(this.baseUrl, payload);
  }

  update(
    id: string,
    scope: RecurrenceScope,
    payload: RecurringTransactionUpdateDTO
  ): Observable<RecurringTransactionResponseDTO> {
    const params = new HttpParams().set('scope', scope);
    return this.http.put<RecurringTransactionResponseDTO>(`${this.baseUrl}/${id}`, payload, {
      params,
    });
  }

  delete(id: string, scope: RecurrenceScope): Observable<void> {
    const params = new HttpParams().set('scope', scope);
    return this.http.delete<void>(`${this.baseUrl}/${id}`, { params });
  }
}
