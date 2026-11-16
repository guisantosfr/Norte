import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import {
  Observable,
  catchError,
  finalize,
  firstValueFrom,
  map,
  of,
  shareReplay,
  switchMap,
  tap,
  throwError,
} from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  AuthResponseDTO,
  LoginRequestDTO,
  LogoutRequestDTO,
  RefreshTokenRequestDTO,
  UserRequestDTO,
  UserResponseDTO,
} from '../models/auth.model';

const TOKEN_STORAGE_KEY = 'norte_auth_token';
const REFRESH_TOKEN_STORAGE_KEY = 'norte_auth_refresh_token';
const USER_STORAGE_KEY = 'norte_auth_user';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly authBaseUrl = `${environment.apiUrl}/auth`;

  readonly token = signal<string | null>(this.loadStoredItem(TOKEN_STORAGE_KEY));
  readonly refreshToken = signal<string | null>(
    this.loadStoredItem(REFRESH_TOKEN_STORAGE_KEY)
  );
  readonly currentUser = signal<UserResponseDTO | null>(this.loadStoredUser());
  readonly isAuthenticated = computed(() => Boolean(this.token() || this.refreshToken()));

  private refreshInFlight$: Observable<string> | null = null;

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

  /**
   * Renova o par de tokens usando mecanismo single-flight: múltiplas chamadas
   * simultâneas compartilham a mesma requisição HTTP em andamento, evitando
   * rotação duplicada e falso-positivo de reutilização de refresh token no backend.
   */
  refreshAccessToken(): Observable<string> {
    if (this.refreshInFlight$) {
      return this.refreshInFlight$;
    }

    const currentRefreshToken = this.refreshToken();
    if (!currentRefreshToken) {
      return throwError(() => new Error('Refresh token ausente.'));
    }

    const payload: RefreshTokenRequestDTO = { refreshToken: currentRefreshToken };

    this.refreshInFlight$ = this.http
      .post<AuthResponseDTO>(`${this.authBaseUrl}/refresh`, payload)
      .pipe(
        tap((response) => this.setSession(response)),
        map((response) => response.token),
        finalize(() => {
          this.refreshInFlight$ = null;
        }),
        shareReplay({ bufferSize: 1, refCount: false })
      );

    return this.refreshInFlight$;
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
    const activeRefreshToken = this.refreshToken();

    if (!activeToken && !activeRefreshToken) {
      return;
    }

    if (!activeToken && activeRefreshToken) {
      await firstValueFrom(
        this.refreshAccessToken().pipe(
          switchMap(() => this.fetchCurrentUser()),
          catchError(() => {
            this.clearSession();
            return of(null);
          })
        )
      );
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
    const currentRefreshToken = this.refreshToken();
    this.clearSession();

    if (currentRefreshToken) {
      const payload: LogoutRequestDTO = { refreshToken: currentRefreshToken };
      this.http
        .post<void>(`${this.authBaseUrl}/logout`, payload)
        .pipe(catchError(() => of(void 0)))
        .subscribe();
    }

    if (navigateToLogin) {
      void this.router.navigate(['/login']);
    }
  }

  clearSession(): void {
    this.token.set(null);
    this.refreshToken.set(null);
    this.currentUser.set(null);
    try {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
      localStorage.removeItem(USER_STORAGE_KEY);
    } catch {
      // Ignore storage access errors
    }
  }

  private setSession(authResponse: AuthResponseDTO): void {
    this.token.set(authResponse.token);
    this.refreshToken.set(authResponse.refreshToken);
    this.currentUser.set(authResponse.user);
    try {
      localStorage.setItem(TOKEN_STORAGE_KEY, authResponse.token);
      if (authResponse.refreshToken) {
        localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, authResponse.refreshToken);
      }
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

  private loadStoredItem(key: string): string | null {
    try {
      return localStorage.getItem(key);
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
