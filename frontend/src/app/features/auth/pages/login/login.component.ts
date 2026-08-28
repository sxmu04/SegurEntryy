import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { ApiService } from '../../../../core/services/api.service';

import Swal from 'sweetalert2';

import { AuthService } from '../../../../core/services/auth.service';


@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule
  ],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class LoginComponent {

  email = '';
  password = '';

  showPassword = false;
  loading = false;


  constructor(
    private auth: AuthService,
    private router: Router,
    private apiService: ApiService
  ) {}


  togglePassword(): void {

    this.showPassword =
      !this.showPassword;

  }


  validateForm(): boolean {

    if (
      !this.email ||
      !this.password
    ) {

      Swal.fire({
        icon: 'warning',
        title: 'Campos incompletos',
        text: 'Por favor llena todos los campos'
      });

      return false;

    }

    const emailRegex =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (
      !emailRegex.test(
        this.email
      )
    ) {

      Swal.fire({
        icon: 'error',
        title: 'Correo inválido',
        text: 'Ingresa un correo válido'
      });

      return false;

    }

    return true;

  }


  async login(): Promise<void> {

    if (
      !this.validateForm()
    ) {
      return;
    }

    if (this.loading) {
      return;
    }

    this.loading = true;

    Swal.fire({
      title: 'Verificando...',
      text: 'Accediendo al sistema',
      allowOutsideClick: false,
      allowEscapeKey: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    try {

      // ==========================================
      // FIREBASE EMAIL + PASSWORD
      // ==========================================

      const userCredential =
        await this.auth.login(
          this.email.trim(),
          this.password
        );

      const firebaseUser =
        userCredential.user;

      if (!firebaseUser) {

        throw new Error(
          'No se encontró el usuario en Firebase'
        );

      }

      // ==========================================
      // OBTENER TOKEN FIREBASE
      // ==========================================

      await firebaseUser
        .getIdToken(true);

      // ==========================================
      // BACKEND DJANGO
      // ==========================================

      this.apiService
        .login(
          firebaseUser.email!
        )
        .subscribe({

          next: (response: any) => {

            const user =
              response?.user;

            const role =
              user?.role;

            const validRoles = [
              'super-admin',
              'administrador',
              'instructor',
              'vigilante',
              'aprendiz',
              'visitante',
              'userx'
            ];

            if (
              !user ||
              !role ||
              !validRoles.includes(
                role
              )
            ) {

              localStorage.removeItem(
                'token'
              );

              localStorage.removeItem(
                'user'
              );

              this.auth.logout();

              Swal.close();

              this.loading = false;

              Swal.fire({
                icon: 'error',
                title: 'Acceso no autorizado',
                text:
                  'Su cuenta no tiene un rol válido asignado. Contacte al administrador.',
                confirmButtonText: 'Entendido',
                allowOutsideClick: false,
                allowEscapeKey: false
              }).then(() => {

                this.router.navigate([
                  '/login'
                ]);

              });

              return;

            }

            localStorage.setItem(
              'token',
              response.access
            );

            localStorage.setItem(
              'user',
              JSON.stringify(
                user
              )
            );

            Swal.close();

            Swal.fire({
              icon: 'success',
              title: 'Bienvenido',
              text: 'Inicio de sesión exitoso',
              timer: 1500,
              showConfirmButton: false,
              allowOutsideClick: false
            }).then(() => {

              switch (role) {

                case 'super-admin':

                  this.router.navigate([
                    '/dashboard/super-admin'
                  ]);

                  break;

                case 'administrador':

                  this.router.navigate([
                    '/dashboard/administrador'
                  ]);

                  break;

                case 'instructor':

                  this.router.navigate([
                    '/dashboard/instructor'
                  ]);

                  break;

                case 'vigilante':

                  this.router.navigate([
                    '/dashboard/vigilante'
                  ]);

                  break;

                case 'aprendiz':

                  this.router.navigate([
                    '/dashboard/aprendiz'
                  ]);

                  break;

                case 'visitante':

                  this.router.navigate([
                    '/dashboard/visitante'
                  ]);

                  break;

                case 'userx':

                  this.router.navigate([
                    '/dashboard/userx'
                  ]);

                  break;

                default:

                  this.auth.logout();

                  localStorage.removeItem(
                    'token'
                  );

                  localStorage.removeItem(
                    'user'
                  );

                  this.loading = false;

                  Swal.fire({
                    icon: 'error',
                    title: 'Acceso no autorizado',
                    text:
                      'Su cuenta no tiene un rol válido asignado.'
                  });

                  this.router.navigate([
                    '/login'
                  ]);

                  break;

              }

            });

          },

          error: async (err: any) => {

            if (
              err.status === 403 &&
              err.error?.code ===
                'USER_INACTIVE'
            ) {

              localStorage.removeItem(
                'token'
              );

              localStorage.removeItem(
                'user'
              );

              await this.auth.logout();

              this.loading = false;

              await Swal.fire({
                icon: 'warning',
                title: 'Cuenta desactivada',
                text:
                  err.error?.message ||
                  'Tu usuario ha sido desactivado. Contacta al administrador para solicitar su activación.',
                confirmButtonText: 'Entendido',
                allowOutsideClick: false,
                allowEscapeKey: false
              });

              await this.router.navigate([
                '/login'
              ]);

              return;

            }

            Swal.close();

            this.loading = false;

            Swal.fire({
              icon: 'error',
              title: 'Error del servidor',
              text:
                err.error?.message ||
                err.error?.detail ||
                'No se pudo obtener la información del usuario.'
            });

          }

        });

    } catch (error: any) {

      let message = '';

      switch (error.code) {

        case 'auth/invalid-email':

          message =
            'El correo no tiene formato válido';

          break;

        case 'auth/user-not-found':

          message =
            'El usuario no existe en Firebase Authentication';

          break;

        case 'auth/wrong-password':

          message =
            'La contraseña es incorrecta';

          break;

        case 'auth/invalid-credential':

          message =
            'Credenciales inválidas. Verifica tu correo y contraseña.';

          break;

        case 'auth/too-many-requests':

          message =
            'Demasiados intentos fallidos. Intenta más tarde.';

          break;

        default:

          message =
            error.message ||
            'Error desconocido';

          break;

      }

      Swal.close();

      this.loading = false;

      Swal.fire({
        icon: 'error',
        title: 'Error al iniciar sesión',
        text: message
      });

    }

  }

}
