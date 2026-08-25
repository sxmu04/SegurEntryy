import { Routes } from '@angular/router';

import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [

  // =========================================================
  // INICIO
  // =========================================================
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full'
  },

  // =========================================================
  // HOME
  // =========================================================
  {
    path: 'home',
    loadComponent: () =>
      import('./pages/home/home')
        .then(m => m.Home)
  },

  // =========================================================
  // LOGIN
  // =========================================================
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/pages/login/login.component')
        .then(m => m.LoginComponent)
  },

  // =========================================================
  // CONFIGURACIÓN INICIAL
  // CREACIÓN DEL SUPERADMIN
  // =========================================================
  {
    path: 'setup-superadmin',
    loadComponent: () =>
      import('./pages/setup-superadmin/setup-superadmin')
        .then(m => m.SetupSuperadmin)
  },

  // =========================================================
  // REGISTRO NORMAL
  // =========================================================
  {
    path: 'register',
    loadComponent: () =>
      import('./features/auth/pages/register/register.component')
        .then(m => m.RegisterComponent)
  },

  // =========================================================
  // RECUPERAR CONTRASEÑA
  // =========================================================
  {
    path: 'forgot-password',
    loadComponent: () =>
      import('./features/auth/pages/forgot-password/forgot-password.component')
        .then(m => m.ForgotPasswordComponent)
  },

  // =========================================================
  // DASHBOARD SUPERADMIN
  // =========================================================
  {
    path: 'dashboard/super-admin',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/dashboard/super-admin/super-admin.component')
        .then(m => m.SuperAdminComponent)
  },

  // =========================================================
  // DASHBOARD ADMINISTRADOR
  // =========================================================
  {
    path: 'dashboard/administrador',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/dashboard/administrador/administrador')
        .then(m => m.AdminComponent)
  },

  // =========================================================
  // DASHBOARD INSTRUCTOR
  // =========================================================
  {
    path: 'dashboard/instructor',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/dashboard/instructor/instructor')
        .then(m => m.InstructorComponent)
  },

  // =========================================================
  // DASHBOARD VIGILANTE
  // =========================================================
  {
    path: 'dashboard/vigilante',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/dashboard/vigilante/vigilante')
        .then(m => m.VigilanteComponent)
  },

  // =========================================================
  // DASHBOARD APRENDIZ
  // =========================================================
  {
    path: 'dashboard/aprendiz',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/dashboard/aprendiz/aprendiz')
        .then(m => m.Aprendiz)
  },

  // =========================================================
  // DASHBOARD USUARIO
  // =========================================================
  {
    path: 'dashboard/user',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/dashboard/userx/userx')
        .then(m => m.UserxComponent)
  }

];