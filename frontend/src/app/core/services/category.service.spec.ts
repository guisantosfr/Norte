import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { CategoryResponseDTO } from '../models/category.model';
import { CategoryService } from './category.service';

describe('CategoryService', () => {
  let service: CategoryService;
  let httpMock: HttpTestingController;

  const mockCategory: CategoryResponseDTO = {
    id: 'cat-1',
    userId: 'user-1',
    name: 'Alimentação',
    active: true,
    createdAt: '2026-11-10T10:00:00Z',
    updatedAt: '2026-11-10T10:00:00Z',
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(CategoryService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should list categories with optional active filter', () => {
    service.findAll(true).subscribe((list) => {
      expect(list.length).toBe(1);
      expect(list[0].name).toBe('Alimentação');
    });

    const req = httpMock.expectOne(
      (r) => r.url === `${environment.apiUrl}/categories` && r.params.get('active') === 'true'
    );
    expect(req.request.method).toBe('GET');
    req.flush([mockCategory]);
  });

  it('should create a category via POST /categories', () => {
    service.create({ name: 'Alimentação' }).subscribe((res) => {
      expect(res.id).toBe('cat-1');
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/categories`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ name: 'Alimentação' });
    req.flush(mockCategory);
  });

  it('should update a category via PUT /categories/{id}', () => {
    service.update('cat-1', { name: 'Supermercado' }).subscribe((res) => {
      expect(res.name).toBe('Supermercado');
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/categories/cat-1`);
    expect(req.request.method).toBe('PUT');
    req.flush({ ...mockCategory, name: 'Supermercado' });
  });

  it('should delete or deactivate a category via DELETE /categories/{id}', () => {
    service.delete('cat-1').subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/categories/cat-1`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });
});
