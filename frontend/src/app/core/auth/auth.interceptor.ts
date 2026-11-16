import {
  HttpContext,
  HttpContextToken,
  HttpErrorResponse,
  HttpInterceptorFn,
  HttpRequest,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from './auth.service';

const PUBLIC_AUTH_PATHS = ['/auth/login', '/auth/register', '/auth/refresh', '/auth/logout'];
const IS_RETRY_AFTER_REFRESH = new HttpContextToken<boolean>(() => false);

function isPublicAuthEndpoint(url: string): boolean {
  return PUBLIC_AUTH_PATHS.some((path) => url.endsWith(path));
}

function attachBearerToken(req: HttpRequest<unknown>, token: string): HttpRequest<unknown> {
  return req.clone({
    setHeaders: {
      Authorization: `Bearer ${token}`,
    },
  });
}

function cloneForRetry(req: HttpRequest<unknown>, token: string): HttpRequest<unknown> {
  const retryContext = new HttpContext();
  for (const key of req.context.keys()) {
    retryContext.set(key, req.context.get(key));
  }
  retryContext.set(IS_RETRY_AFTER_REFRESH, true);

  return req.clone({
    setHeaders: {
      Authorization: `Bearer ${token}`,
    },
    context: retryContext,
  });
}

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);

  if (isPublicAuthEndpoint(req.url)) {
    return next(req);
  }

  const currentToken = authService.token();
  const outgoingReq = currentToken ? attachBearerToken(req, currentToken) : req;

  return next(outgoingReq).pipe(
    catchError((error: unknown) => {
      if (
        !(error instanceof HttpErrorResponse) ||
        error.status !== 401 ||
        req.context.get(IS_RETRY_AFTER_REFRESH) ||
        !authService.refreshToken()
      ) {
        return throwError(() => error);
      }

      // Se outra requisição concorrente já renovou o access token enquanto esta
      // falhava, reaproveita imediatamente o token atualizado sem disparar novo refresh.
      const latestToken = authService.token();
      if (latestToken && latestToken !== currentToken) {
        return next(cloneForRetry(req, latestToken));
      }

      return authService.refreshAccessToken().pipe(
        switchMap((newToken) => next(cloneForRetry(req, newToken)))
      );
    })
  );
};
