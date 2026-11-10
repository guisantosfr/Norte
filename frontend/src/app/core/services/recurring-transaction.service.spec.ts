import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { RecurringTransactionResponseDTO } from '../models/recurring-transaction.model';
import { RecurringTransactionService } from './recurring-transaction.service';

describe('RecurringTransactionService', () => {
  let service: RecurringTransactionService;
  let httpMock: HttpTestingController;

  const mockRecurring: RecurringTransactionResponseDTO = {
    id: 'rec-1',
    userId: 'user-1',
    categoryId: 'cat-1',
    categoryName: 'Moradia',
    type: 'EXPENSE',
    description: 'Aluguel',
    amount: 1800,
    frequency: 'MONTHLY',
    startDate: '2026-11-10',
    dayOfMonth: 10,
    occurrences: null,
    active: true,
    generatedUntil: '2027-10-10',
    createdAt: '2026-11-10T10:00:00Z',
    updatedAt: '2026-11-10T10:00:00Z',
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(RecurringTransactionService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should list recurring transactions with filters', () => {
    service
      .findAll({ active: true, type: 'EXPENSE', categoryId: 'cat-1' })
      .subscribe((list) => {
        expect(list.length).toBe(1);
        expect(list[0].description).toBe('Aluguel');
      });

    const req = httpMock.expectOne(
      (r) =>
        r.url === `${environment.apiUrl}/recurring-transactions` &&
        r.params.get('active') === 'true' &&
        r.params.get('type') === 'EXPENSE' &&
        r.params.get('categoryId') === 'cat-1'
    );
    expect(req.request.method).toBe('GET');
    req.flush([mockRecurring]);
  });

  it('should create a recurring transaction via POST /recurring-transactions', () => {
    service
      .create({
        type: 'EXPENSE',
        description: 'Aluguel',
        amount: 1800,
        dayOfMonth: 10,
        occurrences: null,
      })
      .subscribe((res) => {
        expect(res.id).toBe('rec-1');
      });

    const req = httpMock.expectOne(`${environment.apiUrl}/recurring-transactions`);
    expect(req.request.method).toBe('POST');
    req.flush(mockRecurring);
  });

  it('should fetch occurrences via GET /recurring-transactions/{id}/transactions', () => {
    service.findOccurrences('rec-1').subscribe((list) => {
      expect(list).toEqual([]);
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/recurring-transactions/rec-1/transactions`);
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('should update a recurring transaction with scope query param', () => {
    service
      .update('rec-1', 'FUTURE', {
        type: 'EXPENSE',
        description: 'Aluguel Reajustado',
        amount: 1950,
        dayOfMonth: 10,
        occurrences: null,
      })
      .subscribe((res) => {
        expect(res.amount).toBe(1950);
      });

    const req = httpMock.expectOne(
      (r) =>
        r.url === `${environment.apiUrl}/recurring-transactions/rec-1` &&
        r.params.get('scope') === 'FUTURE'
    );
    expect(req.request.method).toBe('PUT');
    req.flush({ ...mockRecurring, amount: 1950 });
  });

  it('should delete/end a recurring transaction with scope query param', () => {
    service.delete('rec-1', 'ALL').subscribe();

    const req = httpMock.expectOne(
      (r) =>
        r.url === `${environment.apiUrl}/recurring-transactions/rec-1` &&
        r.params.get('scope') === 'ALL'
    );
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });
});
