import { Component } from '@angular/core';
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
  tempAccess: boolean;
  expirationDate?: string;

  // 🔥 opcionales para dashboard
  type?: string;
  date?: string;
}

@Component({
  selector: 'app-vigilante',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './vigilante.html',
  styleUrls: ['./vigilante.css']
})
export class VigilanteComponent {

  // =========================
  // VARIABLES
  // =========================

  menuOpen = true;
  showForm = false;
  editMode = false;

  // 🔥 DASHBOARD (FIX ERROR)
  totalIngresos = 0;
  totalSalidas = 0;
  accesosHoy: Access[] = [];

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

  accesses: Access[] = [
    {
      id: '1',
      name: 'Admin Principal',
      role: 'Admin',
      tempAccess: false
    },
    {
      id: '2',
      name: 'Usuario Temporal',
      role: 'User',
      tempAccess: true,
      expirationDate: '2026-06-30'
    }
  ];

  form: Access = {
    id: '',
    name: '',
    role: '',
    email: '',
    document: '',
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
  // CICLO DE VIDA
  // =========================

  ngOnInit(): void {

    this.loadProfile();

    this.firestoreService.getUsers().subscribe((data: any[]) => {

      this.accesses = data;

      this.totalIngresos = data.length;
      this.totalSalidas = 0;
      this.accesosHoy = data;

    });

  }

  // =========================
  // SIDEBAR
  // =========================

  toggleMenu() {
    this.menuOpen = !this.menuOpen;
  }

  // =========================
  // MODAL
  // =========================

  openForm() {
    this.resetForm();
    this.showForm = true;
  }

  closeForm() {
    this.resetForm();
    this.showForm = false;
  }

  // =========================
  // FORMULARIO
  // =========================

  resetForm() {
    this.form = {
      id: '',
      name: '',
      role: '',
      email: '',
      document: '',
      tempAccess: false,
      expirationDate: ''
    };
    this.editMode = false;
  }

  saveAccess() {

    const data = {
      name: this.form.name,
      email: this.form.email,
      document: this.form.document,
      role: this.form.role,
      tempAccess: this.form.tempAccess,
      expirationDate: this.form.expirationDate || null
    };

    if (this.editMode) {

      this.firestoreService.updateUser(this.form.id, data).then(() => {

        Swal.fire({
          icon: 'success',
          title: 'Usuario actualizado',
          timer: 1500,
          showConfirmButton: false
        });

        this.showForm = false;
        this.resetForm();

      });

    } else {

      this.firestoreService.createUser(data).then(() => {

        Swal.fire({
          icon: 'success',
          title: 'Usuario registrado',
          timer: 1500,
          showConfirmButton: false
        });

        this.showForm = false;
        this.resetForm();

      });

    }

  }

  // =========================
  // EDITAR
  // =========================

  editAccess(access: Access) {
    this.form = { ...access };
    this.editMode = true;
    this.showForm = true;
  }

  // =========================
  // ELIMINAR
  // =========================

  deleteAccess(id: string) {

    Swal.fire({
      title: 'Eliminar usuario',
      text: '¿Desea eliminar este usuario?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Eliminar',
      cancelButtonText: 'Cancelar'
    }).then(result => {

      if (result.isConfirmed) {

        this.firestoreService.deleteUser(id);

        Swal.fire({
          icon: 'success',
          title: 'Usuario eliminado',
          timer: 1500,
          showConfirmButton: false
        });

      }

    });

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

      error: err => console.error(err)

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

  // � BUSCADOR (SOLUCIÓN ERROR)
  search: string = '';

  // 🔎 FILTRO (SOLUCIÓN ERROR)
  filteredAccesses(): Access[] {

    if (!this.search || this.search.trim() === '') {
      return this.accesses;
    }

    const term = this.search.toLowerCase();

    return this.accesses.filter(a =>
      (a.name && a.name.toLowerCase().includes(term)) ||
      (a.document && a.document.toLowerCase().includes(term))
    );
  }

  async updateProfile() {

    if (!this.currentUser) return;

    try {

      if (this.selectedPhoto) {

        const response: any = await this.dashboardService
          .uploadProfilePhoto(
            this.currentUser.uid,
            this.selectedPhoto
          )
          .toPromise();

        this.profile.photo =
          "http://127.0.0.1:8000" + response.photo;

      }

      const data = {

        name: this.profile.name,
        email: this.profile.email,
        phone: this.profile.phone,
        address: this.profile.address,
        document: this.profile.document,
        photo: this.profile.photo

      };

      this.dashboardService.updateUser(
        this.currentUser.uid,
        data
      ).subscribe({

        next: () => {

          Swal.fire(
            "Correcto",
            "Perfil actualizado",
            "success"
          );

          this.loadProfile();

        },

        error: (err) => {

          Swal.fire(
            "Error",
            err.error?.message || "No fue posible actualizar el perfil",
            "error"
          );

        }

      });

    } catch (e) {

      console.error(e);

      Swal.fire(
        "Error",
        "No fue posible subir la foto",
        "error"
      );

    }

  }

}