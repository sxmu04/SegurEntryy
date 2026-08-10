import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../../../core/services/auth.service';
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

  name = '';
  email = '';
  password = '';
  confirmPassword = '';
  invitationCode = '';

  showPassword = false;
  showConfirmPassword = false;

  constructor(
    private auth: AuthService,
    private router: Router,
    private apiService: ApiService
  ) { }

  ngOnInit(): void {

    const theme = localStorage.getItem('theme');

    if (theme === 'dark') {
      document.body.classList.add('dark');
    }

  }

  toggleDarkMode(): void {

    document.body.classList.toggle('dark');

    localStorage.setItem(
      'theme',
      document.body.classList.contains('dark')
        ? 'dark'
        : 'light'
    );

  }

  isValidEmail(email: string): boolean {

    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    return regex.test(email);

  }

  async register() {

  if (!this.name.trim()) {
    Swal.fire('Error', 'Ingrese su nombre', 'warning');
    return;
  }

  if (!this.email.trim()) {
    Swal.fire('Error', 'Ingrese un correo electrónico', 'warning');
    return;
  }

  if (!this.isValidEmail(this.email)) {
    Swal.fire('Error', 'Ingrese un correo válido', 'error');
    return;
  }

  if (!this.invitationCode.trim()) {
    Swal.fire('Error', 'Ingrese el código de invitación.', 'warning');
    return;
  }

  if (!this.password) {
    Swal.fire('Error', 'Ingrese una contraseña', 'warning');
    return;
  }

  if (this.password.length < 6) {
    Swal.fire('Error', 'La contraseña debe tener mínimo 6 caracteres', 'warning');
    return;
  }

  if (this.password !== this.confirmPassword) {
    Swal.fire('Error', 'Las contraseñas no coinciden', 'error');
    return;
  }

  try {

    // 🔍 VALIDAR SI YA EXISTE
    const provider: any = await this.apiService
      .checkProvider(this.email)
      .toPromise();

    if (provider.exists) {
      Swal.fire({
        icon: 'warning',
        title: 'Correo registrado',
        text: 'Este correo ya tiene una cuenta.'
      });
      return;
    }

    // 🔥 VALIDAR INVITACIÓN
    const invitation: any = await this.apiService
      .validateInvitation({
        email: this.email,
        code: this.invitationCode
      })
      .toPromise();

    if (!invitation.success) {
      Swal.fire({
        icon: 'error',
        title: 'Invitación inválida',
        text: invitation.message
      });
      return;
    }

    // ✅ OBTENER EL ROLE DESDE LA INVITACIÓN
    const role = invitation.role;

    // 🧪 DEBUG (opcional)
    console.log('INVITATION:', invitation);
    console.log('ROLE:', role);

    // 🚀 CREAR USUARIO CON ROLE
    const response: any = await this.apiService
      .createUser({
        name: this.name,
        email: this.email,
        password: this.password,
        invitation_code: this.invitationCode,
        provider: 'password',
        role: role // ✅ AQUÍ ESTÁ LA CLAVE
      })
      .toPromise();

    if (!response.success) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: response.message
      });
      return;
    }

    Swal.fire({
      icon: 'success',
      title: 'Cuenta creada',
      text: 'Ahora puedes iniciar sesión.'
    });

    this.router.navigate(['/login']);

  } catch (err: any) {

    Swal.fire({
      icon: 'error',
      title: 'Error',
      text: err?.error?.message || 'No fue posible crear la cuenta.'
    });

  }

}

  registerWithGoogle() {

    Swal.fire({

      icon: 'info',

      title: 'Próximamente',

      text: 'El registro con Google será habilitado después de validar la invitación.'

    });

  }

}