import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { Auth, authState } from '@angular/fire/auth';
import { map, take, switchMap, catchError } from 'rxjs/operators';
import { of } from 'rxjs';

import Swal from 'sweetalert2';
import { ApiService } from '../services/api.service';

export const authGuard = () => {

  const auth = inject(Auth);
  const router = inject(Router);
  const apiService = inject(ApiService);

  return authState(auth).pipe(

    take(1),

    switchMap(user => {

      // ==========================================
      // NO HAY SESIÓN FIREBASE
      // ==========================================

      if (!user) {

        router.navigate(['/login']);

        return of(false);
      }

      // ==========================================
      // USUARIO AUTENTICADO
      // ==========================================

      return apiService.getUser(user.uid).pipe(

        map((response: any) => {

          console.log(
            '🔐 VERIFICACIÓN GUARD:',
            response
          );

          const userData =
            response?.user ||
            response;

          // ==========================================
          // CUENTA INACTIVA
          // ==========================================

          if (userData?.active === false) {

            console.warn(
              '🚫 USUARIO INACTIVO'
            );

            // Cerrar Firebase
            auth.signOut();

            // Limpiar sesión local
            localStorage.removeItem('token');
            localStorage.removeItem('user');

            Swal.fire({
              icon: 'warning',
              title: 'Cuenta desactivada',
              text:
                'Tu usuario ha sido desactivado. Contacta al administrador para solicitar su activación.',
              confirmButtonText: 'Entendido'
            });

            router.navigate(['/login']);

            return false;
          }

          // ==========================================
          // USUARIO ACTIVO
          // ==========================================

          return true;

        }),

        catchError((error) => {

          console.error(
            '❌ ERROR VERIFICANDO USUARIO:',
            error
          );

          // Si el usuario ya no existe
          auth.signOut();

          localStorage.removeItem('token');
          localStorage.removeItem('user');

          Swal.fire({
            icon: 'error',
            title: 'Sesión inválida',
            text:
              'No fue posible verificar tu cuenta.',
            confirmButtonText: 'Entendido'
          });

          router.navigate(['/login']);

          return of(false);
        })

      );

    })

  );

};