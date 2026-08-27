import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-setup-superadmin',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl: './setup-superadmin.html',
  styleUrls: ['./setup-superadmin.css']
})
export class SetupSuperadmin implements OnInit {

  // =========================================================
  // DATOS DEL FORMULARIO
  // =========================================================

  name = '';

  document = '';

  email = '';

  password = '';

  confirmPassword = '';

  // =========================================================
  // ESTADO
  // =========================================================

  loading = false;

  checkingSystem = true;

  systemAlreadyInitialized = false;

  showPassword = false;

  showConfirmPassword = false;

  // =========================================================
  // MENSAJES
  // =========================================================

  errorMessage = '';

  successMessage = '';

  // =========================================================
  // CONSTRUCTOR
  // =========================================================

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  // =========================================================
  // INICIO
  // =========================================================

  async ngOnInit(): Promise<void> {

    await this.checkSystemStatus();

  }

  // =========================================================
  // COMPROBAR ESTADO DEL SISTEMA
  // =========================================================

  private async checkSystemStatus(): Promise<void> {

    this.checkingSystem = true;

    this.errorMessage = '';

    try {

      const initialized =
        await this.authService.isSystemInitialized();

      this.systemAlreadyInitialized = initialized;

      // -----------------------------------------------------
      // SI YA EXISTE SUPERADMIN
      // -----------------------------------------------------

      if (initialized) {

        this.successMessage =
          'SegurEntry ya se encuentra configurado.';

        // Dejamos la pantalla visible unos instantes
        // y posteriormente enviamos al login.

        setTimeout(() => {

          this.router.navigate(['/login']);

        }, 2000);

      }

    } catch (error) {

      console.error(
        'Error comprobando el estado inicial de SegurEntry:',
        error
      );

      this.errorMessage =
        'No fue posible verificar la configuración inicial del sistema. Inténtalo nuevamente.';

    } finally {

      this.checkingSystem = false;

    }

  }

  // =========================================================
  // CREAR SUPERADMIN
  // =========================================================

  async createSuperAdmin(): Promise<void> {

    this.errorMessage = '';

    this.successMessage = '';

    // -------------------------------------------------------
    // VALIDAR FORMULARIO
    // -------------------------------------------------------

    const validationError =
      this.validateForm();

    if (validationError) {

      this.errorMessage =
        validationError;

      return;

    }

    this.loading = true;

    try {

      // -----------------------------------------------------
      // COMPROBAR NUEVAMENTE
      // -----------------------------------------------------
      // Esto evita depender únicamente de la comprobación
      // realizada al cargar la página.

      const initialized =
        await this.authService.isSystemInitialized();

      if (initialized) {

        this.systemAlreadyInitialized = true;

        this.errorMessage =
          'SegurEntry ya tiene un SuperAdministrador configurado.';

        return;

      }

      // -----------------------------------------------------
      // CREAR SUPERADMIN
      // -----------------------------------------------------

      await this.authService.createInitialSuperAdmin(
        this.name.trim(),
        this.document.trim(),
        this.email.trim().toLowerCase(),
        this.password
      );

      // -----------------------------------------------------
      // ÉXITO
      // -----------------------------------------------------

      this.successMessage =
        'SuperAdministrador creado correctamente. Bienvenido a SegurEntry.';

      this.systemAlreadyInitialized = true;

      // -----------------------------------------------------
      // IR AL DASHBOARD
      // -----------------------------------------------------

      setTimeout(() => {

        this.router.navigate([
          '/dashboard/super-admin'
        ]);

      }, 1200);

    } catch (error: any) {

      console.error(
        'Error creando el SuperAdministrador:',
        error
      );

      this.errorMessage =
        this.getFirebaseErrorMessage(error);

    } finally {

      this.loading = false;

    }

  }

  // =========================================================
  // VALIDACIÓN
  // =========================================================

  private validateForm(): string | null {

    // -------------------------------------------------------
    // NOMBRE
    // -------------------------------------------------------

    const cleanName =
      this.name.trim();

    if (!cleanName) {

      return 'El nombre completo es obligatorio.';

    }

    if (cleanName.length < 3) {

      return 'El nombre debe tener al menos 3 caracteres.';

    }

    // -------------------------------------------------------
    // DOCUMENTO
    // -------------------------------------------------------

    const cleanDocument =
      this.document.trim();

    if (!cleanDocument) {

      return 'El documento es obligatorio.';

    }

    if (!/^[0-9]{6,15}$/.test(cleanDocument)) {

      return 'El documento debe contener únicamente números y tener entre 6 y 15 dígitos.';

    }

    // -------------------------------------------------------
    // CORREO
    // -------------------------------------------------------

    const cleanEmail =
      this.email.trim();

    if (!cleanEmail) {

      return 'El correo electrónico es obligatorio.';

    }

    const emailRegex =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(cleanEmail)) {

      return 'Ingresa un correo electrónico válido.';

    }

    // -------------------------------------------------------
    // CONTRASEÑA
    // -------------------------------------------------------

    if (!this.password) {

      return 'La contraseña es obligatoria.';

    }

    if (this.password.length < 8) {

      return 'La contraseña debe tener al menos 8 caracteres.';

    }

    // -------------------------------------------------------
    // CONFIRMAR CONTRASEÑA
    // -------------------------------------------------------

    if (!this.confirmPassword) {

      return 'Debes confirmar la contraseña.';

    }

    if (this.password !== this.confirmPassword) {

      return 'Las contraseñas no coinciden.';

    }

    return null;

  }

  // =========================================================
  // MOSTRAR / OCULTAR CONTRASEÑA
  // =========================================================

  togglePassword(): void {

    this.showPassword =
      !this.showPassword;

  }

  toggleConfirmPassword(): void {

    this.showConfirmPassword =
      !this.showConfirmPassword;

  }

  // =========================================================
  // VOLVER AL LOGIN
  // =========================================================

  goToLogin(): void {

    this.router.navigate([
      '/login'
    ]);

  }

  // =========================================================
  // MENSAJES DE FIREBASE
  // =========================================================

  private getFirebaseErrorMessage(
    error: any
  ): string {

    const code =
      error?.code || '';

    switch (code) {

      case 'auth/email-already-in-use':

        return 'El correo electrónico ya está registrado en SegurEntry.';

      case 'auth/invalid-email':

        return 'El correo electrónico no es válido.';

      case 'auth/weak-password':

        return 'La contraseña es demasiado débil. Utiliza una contraseña más segura.';

      case 'auth/network-request-failed':

        return 'No fue posible conectarse con Firebase. Verifica tu conexión a Internet.';

      case 'auth/operation-not-allowed':

        return 'El registro mediante correo y contraseña no está habilitado en Firebase Authentication.';

      case 'permission-denied':

        return 'Firebase no permite realizar esta operación. Revisa las reglas de Firestore.';

      default:

        if (
          error?.message ===
          'SegurEntry ya ha sido inicializado.'
        ) {

          return 'SegurEntry ya tiene un SuperAdministrador configurado.';

        }

        return 'No fue posible crear el SuperAdministrador. Inténtalo nuevamente.';

    }

  }

}