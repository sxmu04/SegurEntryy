import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';
import { FirestoreService } from '../../../core/services/firestore.service';

import { DashboardService } from '../../../core/services/dashboard.service';
import { AuthService } from '../../../core/services/auth.service';

interface Access {
  id: string;
  name: string;
  role: string;
  email?: string;
  document?: string;
  phone?: string;
  address?: string;
  tempAccess: boolean;
  expirationDate?: string;
}

@Component({
  selector: 'app-aprendiz',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './aprendiz.html',
  styleUrls: ['./aprendiz.css']
})
export class Aprendiz {

  menuOpen = true;
  showForm = false;
  editMode = false;
  activeSection: string = 'dashboard';

  accesses: Access[] = [];

  currentUser: any = null;

  selectedPhoto: File | null = null;

  profile = {
    name: '',
    email: '',
    phone: '',
    address: '',
    document: '',
    photo: 'assets/avatar.png'
  };

  menuItems = [
    { key: 'dashboard', label: 'Dashboard', icon: 'fa-home' },
    { key: 'access', label: 'Mis Accesos', icon: 'fa-history' },
    { key: 'notifications', label: 'Notificaciones', icon: 'fa-bell' },
    { key: 'profile', label: 'Mi Perfil', icon: 'fa-user-circle' }
  ];

  form: Access = {
    id: '',
    name: '',
    role: '',
    email: '',
    document: '',
    phone: '',
    address: '',
    tempAccess: false,
    expirationDate: ''
  };

  constructor(
    private router: Router,
    private firestoreService: FirestoreService,
    private dashboardService: DashboardService,
    private authService: AuthService
  ) { }

  // =========================
  // INIT
  // =========================
  ngOnInit(): void {

    this.loadProfile();

    this.firestoreService.getUsers().subscribe(data => {

      this.accesses = data;

    });

  }

  // =========================
  // SIDEBAR
  // =========================
  toggleMenu() {
    this.menuOpen = !this.menuOpen;
  }

  setSection(section: string) {
    this.activeSection = section;
  }

  isActive(section: string): boolean {
    return this.activeSection === section;
  }

  // =========================
  // 🔥 GUARDAR EN FIRESTORE
  // =========================
  loadProfile(): void {

    this.dashboardService.getUsers().subscribe({

      next: (res: any) => {

        const users = res.users || [];

        const firebaseUser = this.authService.getUser();

        if (!firebaseUser) return;

        const me = users.find(
          (u: any) => u.email === firebaseUser.email
        );

        if (!me) return;

        console.log('👤 MI PERFIL:', me);

        this.currentUser = me;

        this.profile = {

          name: me.name || '',

          email: me.email || '',

          phone: me.phone || '',

          address: me.address || '',

          document: me.document || '',

          photo: me.photo || 'assets/avatar.png'

        };

      },

      error: (err) => {

        console.error(
          '❌ ERROR CARGANDO PERFIL:',
          err
        );

      }

    });

  }



  uploadPhoto(event: any): void {

    const file = event.target.files[0];

    if (!file) return;

    this.selectedPhoto = file;

    const reader = new FileReader();

    reader.onload = () => {

      this.profile.photo = reader.result as string;

    };

    reader.readAsDataURL(file);

  }

  async updateProfile() {

    if (!this.currentUser) {

      Swal.fire(
        'Error',
        'No se encontró el usuario actual.',
        'error'
      );

      return;
    }

    try {

      // =========================
      // SUBIR FOTO SI SE CAMBIÓ
      // =========================

      if (this.selectedPhoto) {

        const response: any = await this.dashboardService
          .uploadProfilePhoto(
            this.currentUser.uid,
            this.selectedPhoto
          )
          .toPromise();

        this.profile.photo =
          'http://127.0.0.1:8000' + response.photo;
      }


      // =========================
      // DATOS EDITABLES
      // =========================

      const data = {

        name: this.profile.name,

        email: this.profile.email,

        phone: this.profile.phone,

        address: this.profile.address,

        document: this.profile.document,

        photo: this.profile.photo

        // ❌ NO enviamos role
      };


      console.log('📤 ACTUALIZANDO PERFIL:', data);

      console.log(
        '🆔 UID:',
        this.currentUser.uid
      );


      // =========================
      // ACTUALIZAR USUARIO
      // =========================

      this.dashboardService
        .updateUser(
          this.currentUser.uid,
          data
        )
        .subscribe({

          next: (response: any) => {

            console.log(
              '✅ PERFIL ACTUALIZADO:',
              response
            );

            Swal.fire({
              icon: 'success',
              title: 'Perfil actualizado',
              text: 'Tus datos fueron actualizados correctamente.',
              timer: 1800,
              showConfirmButton: false
            });

            this.selectedPhoto = null;

            this.loadProfile();

          },

          error: (err: any) => {

            console.error(
              '❌ ERROR ACTUALIZANDO PERFIL:',
              err
            );

            Swal.fire({
              icon: 'error',
              title: 'No se pudo actualizar',
              text:
                err?.error?.message ||
                err?.error?.detail ||
                'No fue posible actualizar tus datos.'
            });

          }

        });

    }

    catch (error) {

      console.error(
        '❌ ERROR SUBIENDO FOTO:',
        error
      );

      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No fue posible subir la foto.'
      });

    }

  }




  // =========================
  // LOGOUT
  // =========================
  logout() {
    Swal.fire({
      title: 'Cerrar sesión',
      text: '¿Seguro que deseas salir?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Salir',
      cancelButtonText: 'Cancelar'
    }).then(result => {
      if (result.isConfirmed) {
        this.router.navigate(['/login']);
      }
    });
  }

}