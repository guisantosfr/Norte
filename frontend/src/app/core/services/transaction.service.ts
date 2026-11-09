import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  CompleteTransactionRequestDTO,
  TransactionFilters,
  TransactionRequestDTO,
  TransactionResponseDTO,
  TypedTransactionRequestDTO,
} from '../models/transaction.model';

@Injectable({
  providedIn: 'root',
})
export class TransactionService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/transactions`;

  findAll(filters?: TransactionFilters): Observable<TransactionResponseDTO[]> {
    let params = new HttpParams();

    if (filters) {
      if (filters.type) {
        params = params.set('type', filters.type);
      }
      if (filters.status) {
        params = params.set('status', filters.status);
      }
      if (filters.categoryId) {
        params = params.set('categoryId', filters.categoryId);
      }
      if (filters.recurringTransactionId) {
        params = params.set('recurringTransactionId', filters.recurringTransactionId);
      }
      if (filters.startDate) {
        params = params.set('startDate', filters.startDate);
      }
      if (filters.endDate) {
        params = params.set('endDate', filters.endDate);
      }
    }

    return this.http.get<TransactionResponseDTO[]>(this.baseUrl, { params });
  }

  findById(id: string): Observable<TransactionResponseDTO> {
    return this.http.get<TransactionResponseDTO>(`${this.baseUrl}/${id}`);
  }

  create(payload: TransactionRequestDTO): Observable<TransactionResponseDTO> {
    return this.http.post<TransactionResponseDTO>(this.baseUrl, payload);
  }

  createIncome(payload: TypedTransactionRequestDTO): Observable<TransactionResponseDTO> {
    return this.http.post<TransactionResponseDTO>(`${this.baseUrl}/income`, payload);
  }

  createExpense(payload: TypedTransactionRequestDTO): Observable<TransactionResponseDTO> {
    return this.http.post<TransactionResponseDTO>(`${this.baseUrl}/expense`, payload);
  }

  update(id: string, payload: TransactionRequestDTO): Observable<TransactionResponseDTO> {
    return this.http.put<TransactionResponseDTO>(`${this.baseUrl}/${id}`, payload);
  }

  complete(
    id: string,
    payload?: CompleteTransactionRequestDTO
  ): Observable<TransactionResponseDTO> {
    return this.http.patch<TransactionResponseDTO>(`${this.baseUrl}/${id}/complete`, payload ?? {});
  }

  cancel(id: string): Observable<TransactionResponseDTO> {
    return this.http.patch<TransactionResponseDTO>(`${this.baseUrl}/${id}/cancel`, {});
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
