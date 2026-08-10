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
    didOpen: () => {
      Swal.showLoading();
    }
  });

  try {

    // 🔐 1. LOGIN FIREBASE
    const userCredential = await this.auth.login(
      this.email,
      this.password
    );

    const user = userCredential.user;

    if (!user) {
      throw new Error("No se encontró el usuario en Firebase");
    }

    await user.getIdToken();

    // 🌐 2. BACKEND (ROL)
    this.apiService.login(user.email!).subscribe({

      next: (response: any) => {

        console.log("RESPUESTA BACKEND:", response);

        localStorage.setItem("token", response.access);
        localStorage.setItem("user", JSON.stringify(response.user));

        Swal.close();

        const role = response.user.role;

        Swal.fire({
          icon: "success",
          title: "Bienvenido",
          text: "Inicio de sesión exitoso",
          timer: 1500,
          showConfirmButton: false
        }).then(() => {

          console.log("ROL:", role);

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
              Swal.fire({
                icon: 'error',
                title: 'Rol inválido',
                text: 'Su cuenta no tiene un rol asignado.'
              });

              this.auth.logout();
          }

        });

      },

      // ❌ ERROR DEL BACKEND
      error: (err) => {

        console.error("ERROR BACKEND:", err);

        Swal.fire({
          icon: 'error',
          title: 'Error del servidor',
          text: err.error?.message || 'No se pudo obtener el rol del usuario'
        });

        this.loading = false;
      }

    });

  } catch (error: any) {

    console.error("ERROR FIREBASE COMPLETO:", error);

    let mensaje = '';

    switch (error.code) {

      case 'auth/invalid-email':
        mensaje = 'El correo no tiene formato válido';
        break;

      case 'auth/user-not-found':
        mensaje = 'El usuario NO existe en Firebase Authentication';
        break;

      case 'auth/wrong-password':
        mensaje = 'La contraseña es incorrecta';
        break;

      case 'auth/invalid-credential':
        mensaje = 'Credenciales inválidas (usuario no registrado o datos incorrectos)';
        break;

      case 'auth/too-many-requests':
        mensaje = 'Demasiados intentos fallidos. Intenta más tarde';
        break;

      default:
        mensaje = error.message || 'Error desconocido';
        break;
    }

    Swal.fire({
      icon: 'error',
      title: 'Error al iniciar sesión',
      html: `
        <b>${mensaje}</b><br><br>
        <small>Código: ${error.code || 'N/A'}</small>
      `
    });

    this.loading = false;
  }
}

  async loginWithGoogle() {

    Swal.fire({
      title: 'Conectando con Google...',
      text: 'Por favor espera',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    try {

      const result = await this.auth.loginWithGoogle();

      const email = result.user.email!;

      this.apiService.checkProvider(email)
        .subscribe(async (response: any) => {

          if (
            response.exists &&
            response.provider === "password"
          ) {

            await this.auth.logout();

            Swal.fire({
              icon: "warning",
              title: "Correo registrado",
              text: "Este correo ya fue registrado con correo y contraseña."
            });

            return;
          }

          // continuar enviando el token a Django

        });

      // Verificar cómo está registrado ese correo
      const methods = await this.auth.getSignInMethods(email);

      console.log(methods);

      console.log("Métodos de autenticación:", methods);

      // Si el correo SOLO tiene password, bloquear Google
      if (
        methods.includes("password") &&
        !methods.includes("google.com")
      ) {

        await this.auth.logout();

        Swal.fire({
          icon: 'warning',
          title: 'Correo registrado',
          text: 'Este correo ya fue registrado con correo y contraseña. Inicia sesión con tu contraseña.'
        });

        return;
      }

      // Obtener el ID Token
      const idToken = await result.user.getIdToken();

      console.log("TOKEN:", idToken);
      console.log("LONGITUD:", idToken.length);
      console.log("SEGMENTOS:", idToken.split(".").length);

      this.apiService.googleLogin(idToken)
        .subscribe({

          next: (response: any) => {

            Swal.fire({
              icon: 'success',
              title: 'Bienvenido',
              text: 'Inicio de sesión exitoso',
              timer: 1500,
              showConfirmButton: false
            });

            console.log("DJANGO:", response);

            this.router.navigate(
              ['/dashboard/super-admin'],
              { replaceUrl: true }
            );

          },

          error: async (error) => {

            console.error("STATUS:", error.status);
            console.error("BODY:", error.error);
            console.error("HEADERS:", error.headers);

            await this.auth.logout();

            Swal.fire({
              icon: 'error',
              title: 'Error Google Login',
              text: error?.error?.message || 'Error al autenticar con Google'
            });

          }

        });

    } catch (error: any) {

      console.error(error);

      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error?.message || 'No fue posible iniciar sesión con Google'
      });

    }

  }

  handleError(error: any) {

    let message = "Error al iniciar sesión";

    switch (error.code) {
      case 'auth/user-not-found':
        message = "Usuario no registrado";
        break;
      case 'auth/wrong-password':
        message = "Contraseña incorrecta";
        break;
      case 'auth/invalid-email':
        message = "Correo inválido";
        break;
    }

    Swal.fire({
      icon: 'error',
      title: 'Error',
      text: message
    });
  }

}