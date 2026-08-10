import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

import Swal from 'sweetalert2';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule
  ],
  templateUrl: './forgot-password.html',
  styleUrl: './forgot-password.css'
})
export class ForgotPasswordComponent {

  email = '';
  loading = false;
  showPassword = false;
  constructor(private auth: AuthService) {}

  validateEmail(): boolean {

    if (!this.email) {
      Swal.fire({
        icon: 'warning',
        title: 'Campo vacío',
        text: 'Debes ingresar tu correo'
      });
      return false;
    }

    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!regex.test(this.email)) {
      Swal.fire({
        icon: 'error',
        title: 'Correo inválido',
        text: 'Ingresa un correo válido'
      });
      return false;
    }

    return true;
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
  async resetPassword() {

    if (!this.validateEmail()) return;

    this.loading = true;

    Swal.fire({
      title: 'Enviando...',
      text: 'Verificando correo',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    try {

      await (this.auth as any).resetPassword(this.email);

      Swal.fire({
        icon: 'success',
        title: 'Correo enviado',
        text: 'Revisa tu bandeja o spam para restablecer tu contraseña'
      });

      this.email = '';

    } catch (error: any) {

      let message = 'Error al enviar el correo';

      if (error.code === 'auth/user-not-found') {
        message = 'El correo no está registrado';
      }

      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: message
      });

    } finally {
      this.loading = false;
    }
  }

}