import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [

  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full'
  },

  {
    path: 'home',
    loadComponent: () =>
      import('./pages/home/home')
        .then(m => m.Home)
  },

  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/pages/login/login.component')
        .then(m => m.LoginComponent)
  },

  {
    path: 'register',
    loadComponent: () =>
      import('./features/auth/pages/register/register.component')
        .then(m => m.RegisterComponent)
  },

  {
    path: 'forgot-password',
    loadComponent: () =>
      import('./features/auth/pages/forgot-password/forgot-password.component')
        .then(m => m.ForgotPasswordComponent)
  },

  // 🔥 DASHBOARD DIRECTO
  {
    path: 'dashboard/super-admin',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/dashboard/super-admin/super-admin.component')
        .then(m => m.SuperAdminComponent)
  },


  {
    path: 'dashboard/administrador',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/dashboard/administrador/administrador')
        .then(m => m.AdminComponent)
  },

  {
    path: 'dashboard/instructor',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/dashboard/instructor/instructor')
        .then(m => m.InstructorComponent)
  },

  {
    path: 'dashboard/vigilante',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/dashboard/vigilante/vigilante')
        .then(m => m.VigilanteComponent)
  },

  {
    path: 'dashboard/aprendiz',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/dashboard/aprendiz/aprendiz')
        .then(m => m.Aprendiz)
  },

  {
    path: 'dashboard/user',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/dashboard/userx/userx')
        .then(m => m.UserxComponent)
  },
];