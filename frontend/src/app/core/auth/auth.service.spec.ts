import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { environment } from '../../../environments/environment';
import { AuthResponseDTO, UserResponseDTO } from '../models/auth.model';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;

  const mockUser: UserResponseDTO = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    name: 'Guilherme',
    email: 'guilherme@norte.app',
    createdAt: '2026-11-09T10:00:00Z',
    updatedAt: '2026-11-09T10:00:00Z',
  };

  const mockAuthResponse: AuthResponseDTO = {
    tokenType: 'Bearer',
    token: 'jwt-test-token-123',
    user: mockUser,
  };

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('should register a user and store session state', () => {
    service
      .register({
        name: 'Guilherme',
        email: 'guilherme@norte.app',
        password: 'password123',
        confirmPassword: 'password123',
      })
      .subscribe((res) => {
        expect(res).toEqual(mockAuthResponse);
      });

    const req = httpMock.expectOne(`${environment.apiUrl}/auth/register`);
    expect(req.request.method).toBe('POST');
    req.flush(mockAuthResponse);

    expect(service.isAuthenticated()).toBe(true);
    expect(service.token()).toBe('jwt-test-token-123');
    expect(service.currentUser()).toEqual(mockUser);
  });

  it('should login and store session state', () => {
    service
      .login({
        email: 'guilherme@norte.app',
        password: 'password123',
      })
      .subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/auth/login`);
    expect(req.request.method).toBe('POST');
    req.flush(mockAuthResponse);

    expect(service.isAuthenticated()).toBe(true);
    expect(service.currentUser()?.email).toBe('guilherme@norte.app');
  });

  it('should clear session on logout', () => {
    service
      .login({
        email: 'guilherme@norte.app',
        password: 'password123',
      })
      .subscribe();

    httpMock.expectOne(`${environment.apiUrl}/auth/login`).flush(mockAuthResponse);
    expect(service.isAuthenticated()).toBe(true);

    service.logout(false);
    expect(service.isAuthenticated()).toBe(false);
    expect(service.token()).toBeNull();
    expect(service.currentUser()).toBeNull();
  });
});
