import { HttpInterceptorFn } from '@angular/common/http';

export const authInterceptor: HttpInterceptorFn = (req, next) => {

  // No enviar token en endpoints públicos
  if (
    req.url.includes('/api/auth/login/') ||
    req.url.includes('/api/auth/google-login/') ||
    req.url.includes('/api/auth/check-provider/')
  ) {
    return next(req);
  }

  const token = localStorage.getItem('token');

  if (!token) {
    return next(req);
  }

  const cloned = req.clone({
    setHeaders: {
      Authorization: `Bearer ${token}`
    }
  });

  return next(cloned);

};