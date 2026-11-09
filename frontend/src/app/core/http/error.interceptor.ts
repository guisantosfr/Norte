import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { ToastService } from '../../shared/services/toast.service';
import { AuthService } from '../auth/auth.service';
import { parseHttpError } from './api-error.model';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const toastService = inject(ToastService);

  return next(req).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse) {
        const isLoginOrRegister =
          req.url.endsWith('/auth/login') || req.url.endsWith('/auth/register');

        if (error.status === 401 && !isLoginOrRegister) {
          const hadToken = authService.isAuthenticated();
          authService.clearSession();
          if (hadToken) {
            toastService.warning(
              'Sua sessão expirou. Faça login novamente para continuar.',
              'Sessão expirada'
            );
          }
          void router.navigate(['/login']);
        } else if (error.status >= 500) {
          const parsed = parseHttpError(error);
          toastService.error(parsed.message, 'Erro no servidor');
        }
      }

      return throwError(() => error);
    })
  );
};
