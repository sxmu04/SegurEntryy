import { Component, OnInit } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { AuthService } from './core/services/auth.service';
import { ReportBrandingService } from './core/services/report-branding.service';
import { UiStandardsService } from './core/services/ui-standards.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: `<router-outlet></router-outlet>`
})
export class App implements OnInit {

  constructor(
    private auth: AuthService,
    private router: Router,
    private reportBranding: ReportBrandingService,
    private uiStandards: UiStandardsService
  ) {}

  ngOnInit(): void {

    // Branding específico de Reportes.
    this.reportBranding.start();

    // Estándares visuales SegurEntry:
    // - validación pasiva (NO modifica valores mientras se escribe)
    // - horas visibles en formato de 12 horas con AM/PM
    this.uiStandards.start();

    this.auth.getAuthState().subscribe(user => {

      if (!user) {
        return;
      }

      const savedUser = localStorage.getItem('user');

      if (!savedUser) {
        return;
      }

      const currentUser = JSON.parse(savedUser);

      // Solo redirige si está en login o en la raíz
      if (
        this.router.url === '/login' ||
        this.router.url === '/'
      ) {

        switch (currentUser.role) {

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

          case 'userx':
            this.router.navigate(['/dashboard/user']);
            break;

        }

      }

    });

  }

}