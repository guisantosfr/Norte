import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from './auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const token = authService.token();

  const isPublicAuthEndpoint =
    req.url.endsWith('/auth/login') || req.url.endsWith('/auth/register');

  if (token && !isPublicAuthEndpoint) {
    const authorizedReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
      },
    });
    return next(authorizedReq);
  }

  return next(req);
};
