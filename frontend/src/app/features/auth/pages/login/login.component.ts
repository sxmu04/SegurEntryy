import { Component, OnInit } from '@angular/core';
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
export class LoginComponent implements OnInit {

  email = '';
  password = '';

  showPassword = false;
  loading = false;

  constructor(
    private auth: AuthService,
    private router: Router,
    private apiService: ApiService
  ) { }

  ngOnInit(): void {
    const theme = localStorage.getItem("theme");

    if (theme === "dark") {
      document.body.classList.add("dark");
    }
  }

  toggleDarkMode() {
    document.body.classList.toggle("dark");

    const theme =
      document.body.classList.contains("dark")
        ? "dark"
        : "light";

    localStorage.setItem("theme", theme);
  }

  togglePassword() {
    this.showPassword = !this.showPassword;
  }

  validateForm(): boolean {

    if (!this.email || !this.password) {
      Swal.fire({
        icon: 'warning',
        title: 'Campos incompletos',
        text: 'Por favor llena todos los campos'
      });

      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(this.email)) {
      Swal.fire({
        icon: 'error',
        title: 'Correo inválido',
        text: 'Ingresa un correo válido'
      });

      return false;
    }

    return true;
  }

  async login() {

    if (!this.validateForm()) return;

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

      const userCredential = await this.auth.login(
        this.email.trim(),
        this.password
      );

      const user = userCredential.user;

      if (!user) {
        throw new Error(
          'No se encontró el usuario en Firebase'
        );
      }

      console.log('🔥 Firebase UID:', user.uid);
      console.log('📧 Firebase EMAIL:', user.email);

      // ==========================================
      // OBTENER TOKEN
      // ==========================================

      await user.getIdToken(true);

      // ==========================================
      // BACKEND DJANGO
      // ==========================================

      this.apiService.login(user.email!).subscribe({

        next: (response: any) => {

          console.log('✅ RESPUESTA BACKEND:', response);

          const user = response?.user;
          const role = user?.role;

          const validRoles = [
            'super-admin',
            'administrador',
            'instructor',
            'vigilante',
            'aprendiz',
            'visitante',
            'userx'
          ];

          if (!user || !role || !validRoles.includes(role)) {

            console.error('❌ USUARIO SIN ROL VÁLIDO:', user);

            localStorage.removeItem('token');
            localStorage.removeItem('user');

            this.auth.logout();

            Swal.close();

            this.loading = false;

            Swal.fire({
              icon: 'error',
              title: 'Acceso no autorizado',
              text: 'Su cuenta no tiene un rol válido asignado. Contacte al administrador.',
              confirmButtonText: 'Entendido',
              allowOutsideClick: false,
              allowEscapeKey: false
            }).then(() => {
              this.router.navigate(['/login']);
            });

            return;
          }

          localStorage.setItem(
            'token',
            response.access
          );

          localStorage.setItem(
            'user',
            JSON.stringify(user)
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
                this.router.navigate(['/dashboard/super-admin']);
                break;

              case 'administrador':
                this.router.navigate(['/dashboard/administrador']);
                break;

              case 'instructor':
                this.router.navigate(['/dashboard/instructor']);
                break;

              case 'vigilante':
                this.router.navigate(['/dashboard/vigilante']);
                break;

              case 'aprendiz':
                this.router.navigate(['/dashboard/aprendiz']);
                break;

              case 'visitante':
                this.router.navigate(['/dashboard/visitante']);
                break;

              case 'userx':
                this.router.navigate(['/dashboard/userx']);
                break;

              default:
                this.auth.logout();
                localStorage.clear();

                Swal.fire({
                  icon: 'error',
                  title: 'Acceso no autorizado',
                  text: 'Su cuenta no tiene un rol válido asignado.'
                });

                this.router.navigate(['/login']);
                break;
            }
          });
        },

        error: async (err) => {

          console.error('❌ ERROR BACKEND:', err);

          // ==========================================
          // 🚫 CUENTA INACTIVA
          // ==========================================

          if (
            err.status === 403 &&
            err.error?.code === 'USER_INACTIVE'
          ) {

            console.log('🚫 CUENTA INACTIVA');

            // MUY IMPORTANTE:
            // eliminar cualquier sesión local
            localStorage.removeItem('token');
            localStorage.removeItem('user');

            // cerrar Firebase
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

            // Forzar regreso al login
            await this.router.navigate(['/login']);

            return;
          }

          // ==========================================
          // OTROS ERRORES
          // ==========================================

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

      console.error(
        '❌ ERROR FIREBASE:',
        error
      );

      let mensaje = '';

      switch (error.code) {

        case 'auth/invalid-email':

          mensaje =
            'El correo no tiene formato válido';

          break;

        case 'auth/user-not-found':

          mensaje =
            'El usuario no existe en Firebase Authentication';

          break;

        case 'auth/wrong-password':

          mensaje =
            'La contraseña es incorrecta';

          break;

        case 'auth/invalid-credential':

          mensaje =
            'Credenciales inválidas. Verifica tu correo y contraseña.';

          break;

        case 'auth/too-many-requests':

          mensaje =
            'Demasiados intentos fallidos. Intenta más tarde.';

          break;

        default:

          mensaje =
            error.message ||
            'Error desconocido';

          break;
      }

      Swal.close();

      this.loading = false;

      Swal.fire({

        icon: 'error',

        title: 'Error al iniciar sesión',

        text: mensaje

      });

    }
  }
}