import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, catchError, firstValueFrom, of, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  AuthResponseDTO,
  LoginRequestDTO,
  UserRequestDTO,
  UserResponseDTO,
} from '../models/auth.model';

const TOKEN_STORAGE_KEY = 'norte_auth_token';
const USER_STORAGE_KEY = 'norte_auth_user';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly authBaseUrl = `${environment.apiUrl}/auth`;

  readonly token = signal<string | null>(this.loadStoredToken());
  readonly currentUser = signal<UserResponseDTO | null>(this.loadStoredUser());
  readonly isAuthenticated = computed(() => Boolean(this.token()));

  register(payload: UserRequestDTO): Observable<AuthResponseDTO> {
    return this.http
      .post<AuthResponseDTO>(`${this.authBaseUrl}/register`, payload)
      .pipe(tap((response) => this.setSession(response)));
  }

  login(payload: LoginRequestDTO): Observable<AuthResponseDTO> {
    return this.http
      .post<AuthResponseDTO>(`${this.authBaseUrl}/login`, payload)
      .pipe(tap((response) => this.setSession(response)));
  }

  fetchCurrentUser(): Observable<UserResponseDTO> {
    return this.http.get<UserResponseDTO>(`${this.authBaseUrl}/me`).pipe(
      tap((user) => {
        this.currentUser.set(user);
        this.persistUser(user);
      })
    );
  }

  async initializeSession(): Promise<void> {
    const activeToken = this.token();
    if (!activeToken) {
      return;
    }

    await firstValueFrom(
      this.fetchCurrentUser().pipe(
        catchError((err: unknown) => {
          if (
            err instanceof HttpErrorResponse &&
            (err.status === 401 || err.status === 403 || err.status === 404)
          ) {
            this.clearSession();
          }
          return of(null);
        })
      )
    );
  }

  logout(navigateToLogin = true): void {
    this.clearSession();
    if (navigateToLogin) {
      void this.router.navigate(['/login']);
    }
  }

  clearSession(): void {
    this.token.set(null);
    this.currentUser.set(null);
    try {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      localStorage.removeItem(USER_STORAGE_KEY);
    } catch {
      // Ignore storage access errors
    }
  }

  private setSession(authResponse: AuthResponseDTO): void {
    this.token.set(authResponse.token);
    this.currentUser.set(authResponse.user);
    try {
      localStorage.setItem(TOKEN_STORAGE_KEY, authResponse.token);
      this.persistUser(authResponse.user);
    } catch {
      // Ignore storage access errors
    }
  }

  private persistUser(user: UserResponseDTO): void {
    try {
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
    } catch {
      // Ignore storage access errors
    }
  }

  private loadStoredToken(): string | null {
    try {
      return localStorage.getItem(TOKEN_STORAGE_KEY);
    } catch {
      return null;
    }
  }

  private loadStoredUser(): UserResponseDTO | null {
    try {
      const raw = localStorage.getItem(USER_STORAGE_KEY);
      return raw ? (JSON.parse(raw) as UserResponseDTO) : null;
    } catch {
      return null;
    }
  }
}
