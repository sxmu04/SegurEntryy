import {
  Component,
  HostListener,
  OnInit,
  AfterViewInit
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './home.html',
  styleUrls: ['./home.css']
})
export class Home implements OnInit, AfterViewInit {

  isDarkMode = false;

  navbarScrolled = false;

  currentYear = new Date().getFullYear();

  constructor(
    private router: Router
  ) {}

  ngOnInit(): void {

    const theme = localStorage.getItem('theme');

    if (theme === 'dark') {

      this.isDarkMode = true;

      document.body.classList.add('dark-mode');

    }

  }

  ngAfterViewInit(): void {

    this.initializeAnimations();

  }

  /*====================================================
      NAVBAR
  ====================================================*/

  @HostListener('window:scroll')

  onWindowScroll(): void {

    this.navbarScrolled = window.scrollY > 40;

  }

  /*====================================================
      NAVEGACIÓN
  ====================================================*/

  login(): void {

    this.router.navigate(['/login']);

  }

  register(): void {

    this.router.navigate(['/register']);

  }

  /*====================================================
      SCROLL SUAVE
  ====================================================*/

  scrollTo(section: string): void {

    const element = document.getElementById(section);

    if (!element) return;

    element.scrollIntoView({

      behavior: 'smooth',

      block: 'start'

    });

  }

  /*====================================================
      MODO OSCURO
  ====================================================*/

  toggleTheme(): void {

    this.isDarkMode = !this.isDarkMode;

    if (this.isDarkMode) {

      document.body.classList.add('dark-mode');

      localStorage.setItem('theme', 'dark');

    } else {

      document.body.classList.remove('dark-mode');

      localStorage.setItem('theme', 'light');

    }

  }

  /*====================================================
      ANIMACIONES
  ====================================================*/

  private initializeAnimations(): void {

    const observer = new IntersectionObserver(

      (entries) => {

        entries.forEach(entry => {

          if (entry.isIntersecting) {

            entry.target.classList.add('show');

          }

        });

      },

      {

        threshold: 0.15

      }

    );

    const elements = document.querySelectorAll(

      '.fade-up, .fade-left, .fade-right, .zoom'

    );

    elements.forEach(element => {

      observer.observe(element);

    });

  }

}