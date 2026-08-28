import { Component } from '@angular/core';
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
export class RegisterComponent {

  email = '';
  password = '';
  confirmPassword = '';
  invitationCode = '';

  showPassword = false;
  showConfirmPassword = false;
  loading = false;


  constructor(
    private router: Router,
    private apiService: ApiService
  ) {}


  isValidEmail(
    email: string
  ): boolean {

    const regex =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    return regex.test(
      email
    );

  }


  async register(): Promise<void> {

    if (this.loading) {
      return;
    }

    const email =
      this.email
        .trim()
        .toLowerCase();

    if (!email) {

      Swal.fire(
        'Error',
        'Ingrese un correo electrónico',
        'warning'
      );

      return;

    }

    if (
      !this.isValidEmail(
        email
      )
    ) {

      Swal.fire(
        'Error',
        'Ingrese un correo válido',
        'error'
      );

      return;

    }

    const code =
      this.invitationCode
        .trim()
        .toUpperCase();

    if (!code) {

      Swal.fire(
        'Error',
        'Ingrese el código de invitación.',
        'warning'
      );

      return;

    }

    if (!this.password) {

      Swal.fire(
        'Error',
        'Ingrese una contraseña',
        'warning'
      );

      return;

    }

    if (
      this.password.length < 6
    ) {

      Swal.fire(
        'Error',
        'La contraseña debe tener mínimo 6 caracteres',
        'warning'
      );

      return;

    }

    if (
      this.password !==
      this.confirmPassword
    ) {

      Swal.fire(
        'Error',
        'Las contraseñas no coinciden',
        'error'
      );

      return;

    }

    this.loading = true;

    try {

      const invitation: any =
        await this.apiService
          .validateInvitation({
            email,
            code
          })
          .toPromise();

      if (
        !invitation?.success
      ) {

        this.loading = false;

        Swal.fire({
          icon: 'error',
          title: 'Invitación inválida',
          text:
            invitation?.message ||
            'El código de invitación no es válido.'
        });

        return;

      }

      const response: any =
        await this.apiService
          .completeRegistration({
            email,
            password:
              this.password,
            invitation_code:
              code
          })
          .toPromise();

      if (
        !response?.success
      ) {

        this.loading = false;

        Swal.fire({
          icon: 'error',
          title: 'Error',
          text:
            response?.message ||
            'No fue posible crear la cuenta.'
        });

        return;

      }

      await Swal.fire({
        icon: 'success',
        title: 'Cuenta creada',
        text:
          'Tu cuenta fue creada correctamente. Ahora puedes iniciar sesión.',
        confirmButtonText:
          'Ir al login'
      });

      this.router.navigate([
        '/login'
      ]);

    } catch (err: any) {

      this.loading = false;

      Swal.fire({
        icon: 'error',
        title: 'Error',
        text:
          err?.error?.message ||
          'No fue posible crear la cuenta.'
      });

    } finally {

      this.loading = false;

    }

  }

}
