import { Component, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import Swal from 'sweetalert2';

import { ApiService } from '../../../../core/services/api.service';

@Component({
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule
  ],
  templateUrl: './register.html',
  styleUrls: ['./register.css']
})
export class RegisterComponent implements OnInit {

  email = '';
  password = '';
  confirmPassword = '';
  invitationCode = '';

  showPassword = false;
  showConfirmPassword = false;

  constructor(
    private router: Router,
    private apiService: ApiService
  ) { }

  ngOnInit(): void {

    const theme = localStorage.getItem('theme');

    if (theme === 'dark') {
      document.body.classList.add('dark');
    }

  }

  // =========================
  // MODO OSCURO
  // =========================

  toggleDarkMode(): void {

    document.body.classList.toggle('dark');

    localStorage.setItem(
      'theme',
      document.body.classList.contains('dark')
        ? 'dark'
        : 'light'
    );

  }

  // =========================
  // VALIDAR CORREO
  // =========================

  isValidEmail(email: string): boolean {

    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    return regex.test(email);

  }

  // =========================
  // REGISTRO
  // =========================

  async register(): Promise<void> {

    // =========================
    // CORREO
    // =========================

    const email = this.email.trim().toLowerCase();

    if (!email) {

      Swal.fire(
        'Error',
        'Ingrese un correo electrónico',
        'warning'
      );

      return;
    }

    if (!this.isValidEmail(email)) {

      Swal.fire(
        'Error',
        'Ingrese un correo válido',
        'error'
      );

      return;
    }

    // =========================
    // CÓDIGO
    // =========================

    const code = this.invitationCode.trim().toUpperCase();

    if (!code) {

      Swal.fire(
        'Error',
        'Ingrese el código de invitación.',
        'warning'
      );

      return;
    }

    // =========================
    // CONTRASEÑA
    // =========================

    if (!this.password) {

      Swal.fire(
        'Error',
        'Ingrese una contraseña',
        'warning'
      );

      return;
    }

    if (this.password.length < 6) {

      Swal.fire(
        'Error',
        'La contraseña debe tener mínimo 6 caracteres',
        'warning'
      );

      return;
    }

    if (this.password !== this.confirmPassword) {

      Swal.fire(
        'Error',
        'Las contraseñas no coinciden',
        'error'
      );

      return;
    }

    try {

      // =========================
      // VALIDAR INVITACIÓN
      // =========================

      const invitation: any = await this.apiService
        .validateInvitation({
          email: email,
          code: code
        })
        .toPromise();

      console.log('INVITACIÓN:', invitation);

      if (!invitation?.success) {

        Swal.fire({
          icon: 'error',
          title: 'Invitación inválida',
          text:
            invitation?.message ||
            'El código de invitación no es válido.'
        });

        return;
      }

      // =========================
      // CREAR CUENTA
      // =========================

      const response: any = await this.apiService
        .completeRegistration({
          email: this.email,
          password: this.password,
          invitation_code: this.invitationCode
        })
        .toPromise();

      console.log('REGISTRO:', response);

      if (!response?.success) {

        Swal.fire({
          icon: 'error',
          title: 'Error',
          text:
            response?.message ||
            'No fue posible crear la cuenta.'
        });

        return;
      }

      // =========================
      // ÉXITO
      // =========================

      await Swal.fire({
        icon: 'success',
        title: 'Cuenta creada',
        text: 'Tu cuenta fue creada correctamente. Ahora puedes iniciar sesión.',
        confirmButtonText: 'Ir al login'
      });

      this.router.navigate(['/login']);

    } catch (err: any) {

      console.error('ERROR REGISTRO:', err);

      Swal.fire({
        icon: 'error',
        title: 'Error',
        text:
          err?.error?.message ||
          'No fue posible crear la cuenta.'
      });

    }

  }

}