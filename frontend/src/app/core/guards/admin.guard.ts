import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { Auth, authState } from '@angular/fire/auth';
import { catchError, map, switchMap, take } from 'rxjs/operators';
import { of } from 'rxjs';
import { ApiService } from '../services/api.service';

/** Protege herramientas sensibles sin modificar el authGuard existente. */
export const adminGuard = () => {
  const auth = inject(Auth);
  const router = inject(Router);
  const api = inject(ApiService);

  return authState(auth).pipe(
    take(1),
    switchMap(user => {
      if (!user) {
        router.navigate(['/login']);
        return of(false);
      }
      return api.getUser(user.uid).pipe(
        map((response: any) => {
          const data = response?.user || response;
          const role = String(data?.role || '').trim().toLowerCase().replace(/_/g, '-');
          const allowed = ['administrador','admin','administrator','super-admin','superadmin','super administrador'].includes(role);
          if (!allowed) router.navigate(['/403']);
          return allowed;
        }),
        catchError(() => {
          router.navigate(['/403']);
          return of(false);
        })
      );
    })
  );
};
