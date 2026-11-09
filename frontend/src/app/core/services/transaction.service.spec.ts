import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { TransactionResponseDTO } from '../models/transaction.model';
import { TransactionService } from './transaction.service';

describe('TransactionService', () => {
  let service: TransactionService;
  let httpMock: HttpTestingController;

  const mockTransaction: TransactionResponseDTO = {
    id: 'tx-1',
    userId: 'user-1',
    categoryId: null,
    categoryName: null,
    recurringTransactionId: null,
    type: 'EXPENSE',
    description: 'Supermercado',
    amount: 250.5,
    date: '2026-11-09',
    status: 'COMPLETED',
    realizedAt: '2026-11-09T12:00:00Z',
    realizedAmount: 250.5,
    occurrenceNumber: null,
    totalOccurrences: null,
    createdAt: '2026-11-09T12:00:00Z',
    updatedAt: '2026-11-09T12:00:00Z',
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(TransactionService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should list transactions with query filters', () => {
    service
      .findAll({
        type: 'EXPENSE',
        status: 'COMPLETED',
        startDate: '2026-11-01',
        endDate: '2026-11-30',
      })
      .subscribe((list) => {
        expect(list.length).toBe(1);
        expect(list[0].description).toBe('Supermercado');
      });

    const req = httpMock.expectOne(
      (r) =>
        r.url === `${environment.apiUrl}/transactions` &&
        r.params.get('type') === 'EXPENSE' &&
        r.params.get('status') === 'COMPLETED' &&
        r.params.get('startDate') === '2026-11-01' &&
        r.params.get('endDate') === '2026-11-30'
    );
    expect(req.request.method).toBe('GET');
    req.flush([mockTransaction]);
  });

  it('should create an income transaction via POST /transactions/income', () => {
    service
      .createIncome({
        description: 'Salário',
        amount: 5000,
        date: '2026-11-05',
        status: 'PENDING',
      })
      .subscribe((res) => {
        expect(res.id).toBe('tx-1');
      });

    const req = httpMock.expectOne(`${environment.apiUrl}/transactions/income`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body.description).toBe('Salário');
    req.flush(mockTransaction);
  });

  it('should complete a pending transaction via PATCH /transactions/{id}/complete', () => {
    service.complete('tx-1', { realizedAmount: 260 }).subscribe((res) => {
      expect(res.status).toBe('COMPLETED');
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/transactions/tx-1/complete`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ realizedAmount: 260 });
    req.flush(mockTransaction);
  });

  it('should cancel a transaction via PATCH /transactions/{id}/cancel', () => {
    service.cancel('tx-1').subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/transactions/tx-1/cancel`);
    expect(req.request.method).toBe('PATCH');
    req.flush({ ...mockTransaction, status: 'CANCELED' });
  });

  it('should delete a transaction via DELETE /transactions/{id}', () => {
    service.delete('tx-1').subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/transactions/tx-1`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });
});
