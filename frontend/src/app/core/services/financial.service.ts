import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  CategoryFinancialSummaryDTO,
  CategoryTransactionsReportDTO,
  FinancialCategoryFilters,
  FinancialSummaryDTO,
} from '../models/financial.model';

@Injectable({
  providedIn: 'root',
})
export class FinancialService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/financial`;

  getSummary(startDate?: string | '', endDate?: string | ''): Observable<FinancialSummaryDTO> {
    let params = new HttpParams();
    if (startDate) {
      params = params.set('startDate', startDate);
    }
    if (endDate) {
      params = params.set('endDate', endDate);
    }
    return this.http.get<FinancialSummaryDTO>(`${this.baseUrl}/summary`, { params });
  }

  getSummaryByCategory(
    filters?: FinancialCategoryFilters
  ): Observable<CategoryFinancialSummaryDTO[]> {
    const params = this.buildCategoryFilterParams(filters);
    return this.http.get<CategoryFinancialSummaryDTO[]>(`${this.baseUrl}/by-category`, {
      params,
    });
  }

  getCategoryTransactionsReport(
    categoryId: string,
    filters?: FinancialCategoryFilters
  ): Observable<CategoryTransactionsReportDTO> {
    const params = this.buildCategoryFilterParams(filters);
    return this.http.get<CategoryTransactionsReportDTO>(
      `${this.baseUrl}/by-category/${categoryId}`,
      { params }
    );
  }

  private buildCategoryFilterParams(filters?: FinancialCategoryFilters): HttpParams {
    let params = new HttpParams();
    if (!filters) {
      return params;
    }
    if (filters.startDate) {
      params = params.set('startDate', filters.startDate);
    }
    if (filters.endDate) {
      params = params.set('endDate', filters.endDate);
    }
    if (filters.type) {
      params = params.set('type', filters.type);
    }
    if (filters.status) {
      params = params.set('status', filters.status);
    }
    return params;
  }
}
