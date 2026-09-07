import {
  AfterViewInit,
  Component,
  HostListener,
  OnInit
} from '@angular/core';

import {
  CommonModule
} from '@angular/common';

import {
  Router
} from '@angular/router';

import {
  AuthService
} from '../../core/services/auth.service';


@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule
  ],
  templateUrl: './home.html',
  styleUrls: [
    './home.css'
  ]
})
export class Home
  implements OnInit, AfterViewInit {

  isDarkMode =
    false;

  navbarScrolled =
    false;

  activeSection:
    string =
      'inicio';

  currentYear =
    new Date()
      .getFullYear();


  private readonly landingSections:
    string[] = [
      'inicio',
      'features',
      'workflow',
      'benefits',
      'contacto'
    ];


  constructor(
    private router:
      Router,

    private authService:
      AuthService
  ) {}


  // =========================================================
  // INICIO
  // =========================================================

  async ngOnInit():
    Promise<void> {

    const theme =
      localStorage.getItem(
        'theme'
      );

    if (
      theme ===
      'dark'
    ) {

      this.isDarkMode =
        true;

      document.body
        .classList
        .add(
          'dark-mode'
        );

    }

    // =======================================================
    // COMPROBAR CONFIGURACIÓN INICIAL DE SEGURENTRY
    // =======================================================

    try {

      const initialized =
        await this.authService
          .isSystemInitialized();

      if (
        !initialized
      ) {

        await this.router
          .navigate([
            '/setup-superadmin'
          ]);

      }

    } catch (
      error
    ) {

      console.error(
        'Error verificando la configuración inicial de SegurEntry:',
        error
      );

      // Si Firestore presenta un error temporal,
      // no bloqueamos el Home.

    }

  }


  // =========================================================
  // AFTER VIEW INIT
  // =========================================================

  ngAfterViewInit():
    void {

    this.initializeAnimations();

    // Si la página se abre con una URL como:
    // /#features
    // nos desplazamos a esa sección.
    const hash =
      window.location.hash
        .replace(
          '#',
          ''
        )
        .trim();

    if (
      hash &&
      this.landingSections.includes(
        hash
      )
    ) {

      setTimeout(
        () => {

          this.scrollTo(
            hash,
            undefined,
            false
          );

        },
        120
      );

    } else {

      this.updateActiveSection();

    }

  }


  // =========================================================
  // NAVBAR / SCROLL
  // =========================================================

  @HostListener(
    'window:scroll'
  )
  onWindowScroll():
    void {

    this.navbarScrolled =
      window.scrollY >
      24;

    this.updateActiveSection();

  }


  // =========================================================
  // NAVEGACIÓN DE CUENTA
  // =========================================================

  login():
    void {

    this.router
      .navigate([
        '/login'
      ]);

  }


  register():
    void {

    this.router
      .navigate([
        '/register'
      ]);

  }


  // =========================================================
  // NAVEGACIÓN INTERNA DEL LANDING
  // =========================================================

  scrollTo(
    section:
      string,

    event?:
      Event,

    updateUrl:
      boolean =
        true
  ):
    void {

    event?.preventDefault();

    const element =
      document
        .getElementById(
          section
        );

    if (
      !element
    ) {
      return;
    }

    // La navbar es sticky/fija visualmente.
    // Restamos su altura para que el título no quede oculto.
    const navbarOffset =
      window.innerWidth <=
        850
        ? 118
        : 88;

    const elementTop =
      element
        .getBoundingClientRect()
        .top
      +
      window.scrollY;

    const targetTop =
      Math.max(
        elementTop -
        navbarOffset,
        0
      );

    window.scrollTo({
      top:
        targetTop,
      behavior:
        'smooth'
    });

    this.activeSection =
      section;

    if (
      updateUrl
    ) {

      window.history
        .replaceState(
          null,
          '',
          `#${section}`
        );

    }

  }


  private updateActiveSection():
    void {

    const offset =
      window.innerWidth <=
        850
        ? 150
        : 130;

    let current =
      'inicio';

    for (
      const sectionId
      of this.landingSections
    ) {

      const section =
        document
          .getElementById(
            sectionId
          );

      if (
        !section
      ) {
        continue;
      }

      const top =
        section
          .getBoundingClientRect()
          .top;

      if (
        top <=
        offset
      ) {

        current =
          sectionId;

      }

    }

    this.activeSection =
      current;

  }


  // =========================================================
  // MODO OSCURO
  // =========================================================

  toggleTheme():
    void {

    this.isDarkMode =
      !this.isDarkMode;

    if (
      this.isDarkMode
    ) {

      document.body
        .classList
        .add(
          'dark-mode'
        );

      localStorage
        .setItem(
          'theme',
          'dark'
        );

    } else {

      document.body
        .classList
        .remove(
          'dark-mode'
        );

      localStorage
        .setItem(
          'theme',
          'light'
        );

    }

  }


  // =========================================================
  // ANIMACIONES
  // =========================================================

  private initializeAnimations():
    void {

    if (
      !(
        'IntersectionObserver'
        in
        window
      )
    ) {

      document
        .querySelectorAll(
          '.fade-up, .fade-left, .fade-right, .zoom'
        )
        .forEach(
          element =>
            element
              .classList
              .add(
                'show'
              )
        );

      return;

    }

    const observer =
      new IntersectionObserver(

        (
          entries
        ) => {

          entries
            .forEach(
              entry => {

                if (
                  entry.isIntersecting
                ) {

                  entry.target
                    .classList
                    .add(
                      'show'
                    );

                  observer
                    .unobserve(
                      entry.target
                    );

                }

              }
            );

        },

        {
          threshold:
            0.12,
          rootMargin:
            '0px 0px -45px 0px'
        }

      );

    const elements =
      document
        .querySelectorAll(
          '.fade-up, .fade-left, .fade-right, .zoom'
        );

    elements
      .forEach(
        element => {

          observer
            .observe(
              element
            );

        }
      );

  }

}
