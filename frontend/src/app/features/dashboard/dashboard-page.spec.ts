import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { environment } from '../../../environments/environment';
import { FinancialSummaryDTO } from '../../core/models/financial.model';
import { DashboardPageComponent } from './dashboard-page.component';

describe('DashboardPageComponent', () => {
  let httpMock: HttpTestingController;

  const mockSummary: FinancialSummaryDTO = {
    startDate: '2026-11-01',
    endDate: '2026-11-30',
    realizedIncome: 6000,
    realizedExpense: 2500,
    pendingIncome: 1000,
    pendingExpense: 500,
    periodRealizedResult: 3500,
    periodProjectedResult: 4000,
    currentBalance: 8000,
    projectedBalance: 8500,
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardPageComponent],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should initialize in MONTHLY perspective by default and load financial data', () => {
    const fixture = TestBed.createComponent(DashboardPageComponent);
    const component = fixture.componentInstance;

    fixture.detectChanges();

    expect(component.perspective()).toBe('MONTHLY');

    httpMock.expectOne(`${environment.apiUrl}/categories`).flush([]);
    httpMock
      .expectOne((r) => r.url === `${environment.apiUrl}/financial/summary`)
      .flush(mockSummary);
    httpMock
      .expectOne((r) => r.url === `${environment.apiUrl}/financial/by-category`)
      .flush([]);
    httpMock
      .expectOne((r) => r.url === `${environment.apiUrl}/transactions`)
      .flush([]);

    expect(component.summary()?.currentBalance).toBe(8000);
    expect(component.summary()?.projectedBalance).toBe(8500);
  });

  it('should switch to YEARLY perspective and request full year range', () => {
    const fixture = TestBed.createComponent(DashboardPageComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    httpMock.expectOne(`${environment.apiUrl}/categories`).flush([]);
    httpMock.expectOne((r) => r.url === `${environment.apiUrl}/financial/summary`).flush(mockSummary);
    httpMock.expectOne((r) => r.url === `${environment.apiUrl}/financial/by-category`).flush([]);
    httpMock.expectOne((r) => r.url === `${environment.apiUrl}/transactions`).flush([]);

    const currentYear = component.referenceYear();
    component.setPerspective('YEARLY');

    expect(component.perspective()).toBe('YEARLY');
    expect(component.activeDateRange()).toEqual({
      startDate: `${currentYear}-01-01`,
      endDate: `${currentYear}-12-31`,
    });

    httpMock
      .expectOne(
        (r) =>
          r.url === `${environment.apiUrl}/financial/summary` &&
          r.params.get('startDate') === `${currentYear}-01-01` &&
          r.params.get('endDate') === `${currentYear}-12-31`
      )
      .flush(mockSummary);
    httpMock.expectOne((r) => r.url === `${environment.apiUrl}/financial/by-category`).flush([]);
    httpMock.expectOne((r) => r.url === `${environment.apiUrl}/transactions`).flush([]);
  });
});
