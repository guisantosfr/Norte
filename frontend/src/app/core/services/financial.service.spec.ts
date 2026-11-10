import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import {
  CategoryFinancialSummaryDTO,
  CategoryTransactionsReportDTO,
  FinancialSummaryDTO,
} from '../models/financial.model';
import { FinancialService } from './financial.service';

describe('FinancialService', () => {
  let service: FinancialService;
  let httpMock: HttpTestingController;

  const mockSummary: FinancialSummaryDTO = {
    startDate: '2026-11-01',
    endDate: '2026-11-30',
    realizedIncome: 5000,
    realizedExpense: 1800,
    pendingIncome: 500,
    pendingExpense: 400,
    periodRealizedResult: 3200,
    periodProjectedResult: 3300,
    currentBalance: 4500,
    projectedBalance: 4600,
  };

  const mockCategorySummary: CategoryFinancialSummaryDTO = {
    categoryId: 'cat-1',
    categoryName: 'Moradia',
    realizedIncome: 0,
    realizedExpense: 1200,
    pendingIncome: 0,
    pendingExpense: 200,
    netRealizedResult: -1200,
    netProjectedResult: -1400,
    transactionCount: 2,
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(FinancialService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should fetch financial summary via GET /financial/summary', () => {
    service.getSummary('2026-11-01', '2026-11-30').subscribe((res) => {
      expect(res.currentBalance).toBe(4500);
      expect(res.projectedBalance).toBe(4600);
    });

    const req = httpMock.expectOne(
      (r) =>
        r.url === `${environment.apiUrl}/financial/summary` &&
        r.params.get('startDate') === '2026-11-01' &&
        r.params.get('endDate') === '2026-11-30'
    );
    expect(req.request.method).toBe('GET');
    req.flush(mockSummary);
  });

  it('should fetch summary by category via GET /financial/by-category', () => {
    service
      .getSummaryByCategory({
        startDate: '2026-11-01',
        endDate: '2026-11-30',
        type: 'EXPENSE',
      })
      .subscribe((list) => {
        expect(list.length).toBe(1);
        expect(list[0].categoryName).toBe('Moradia');
      });

    const req = httpMock.expectOne(
      (r) =>
        r.url === `${environment.apiUrl}/financial/by-category` &&
        r.params.get('type') === 'EXPENSE'
    );
    expect(req.request.method).toBe('GET');
    req.flush([mockCategorySummary]);
  });

  it('should fetch category transactions report via GET /financial/by-category/{categoryId}', () => {
    const mockReport: CategoryTransactionsReportDTO = {
      summary: mockCategorySummary,
      transactions: [],
    };

    service.getCategoryTransactionsReport('cat-1').subscribe((res) => {
      expect(res.summary.categoryId).toBe('cat-1');
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/financial/by-category/cat-1`);
    expect(req.request.method).toBe('GET');
    req.flush(mockReport);
  });
});
