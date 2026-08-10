import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';
import { ApiService } from '../../../core/services/api.service';
import { DashboardService } from '../../../core/services/dashboard.service';
import { AuthService } from '../../../core/services/auth.service';

interface Access {
  uid?: string;
  id?: string;
  name: string;
  role: string;
  email?: string;
  document?: string;
  tempAccess: boolean;
  expirationDate?: string;
}

@Component({
  selector: 'app-administrator',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl: './administrador.html',
  styleUrls: ['./administrador.css']
})
export class AdminComponent implements OnInit {

  menuOpen = true;
  showForm = false;
  editMode = false;

  activeRoute = 'dashboard';

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

  form: Access = {
    name: '',
    role: '',
    email: '',
    document: '',
    tempAccess: false,
    expirationDate: ''
  };

  constructor(
    private router: Router,
    private apiService: ApiService,
    private dashboardService: DashboardService,
    private authService: AuthService
  ) { }

  get totalTemporales(): number {
    return this.accesses.filter(a => a.tempAccess).length;
  }

  ngOnInit(): void {
    this.loadUsers();
    this.loadProfile();
  }

  loadUsers(): void {
    this.apiService.listUsers().subscribe({
      next: (resp: any) => {
        if (resp.success) {
          this.accesses = resp.users;
        }
      },
      error: (err) => {
        console.error(err);
      }
    });
  }

  toggleMenu(): void {
    this.menuOpen = !this.menuOpen;
  }

  goTo(route: string): void {
    this.activeRoute = route;
  }

  openForm(): void {
    this.resetForm();
    this.showForm = true;
  }

  closeForm(): void {
    this.resetForm();
    this.showForm = false;
  }

  resetForm(): void {

    this.form = {
      name: '',
      role: '',
      email: '',
      document: '',
      tempAccess: false,
      expirationDate: ''
    };

    this.editMode = false;
  }

  saveAccess(): void {

    if (this.editMode) {

      Swal.fire({
        icon: 'warning',
        title: 'Acción no permitida',
        text: 'El administrador no tiene permisos para editar usuarios'
      });

      return;
    }

    const data = {
      name: this.form.name,
      email: this.form.email,
      document: this.form.document,
      role: this.form.role,
      tempAccess: this.form.tempAccess,
      expirationDate: this.form.expirationDate || null
    };

    this.apiService.createUser(data).subscribe({

      next: (resp: any) => {

        Swal.fire({
          icon: 'success',
          title: 'Usuario creado',
          text: resp.message
        });

        this.closeForm();

        this.loadUsers();

      },

      error: (err) => {

        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: err.error?.message || 'No fue posible crear el usuario.'
        });

      }

    });

  }

  editAccess(access: Access): void {

    Swal.fire({
      icon: 'warning',
      title: 'Acción no permitida',
      text: 'El administrador no puede editar usuarios'
    });

  }

  deleteAccess(uid: string): void {

    Swal.fire({
      title: 'Eliminar usuario',
      text: '¿Desea eliminar este usuario?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Eliminar'
    }).then(result => {

      if (!result.isConfirmed) return;

      this.apiService.deleteUser(uid).subscribe({

        next: () => {

          Swal.fire({
            icon: 'success',
            title: 'Usuario eliminado',
            timer: 1500,
            showConfirmButton: false
          });

          this.loadUsers();

        },

        error: (err) => {

          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: err.error?.message || 'No fue posible eliminar el usuario.'
          });

        }

      });

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

      error: (err) => {
        console.error(err);
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

          this.loadUsers();
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

    }

    catch (e) {

      console.error(e);

      Swal.fire(
        "Error",
        "No fue posible subir la foto",
        "error"
      );

    }

  }

  logout(): void {

    Swal.fire({
      title: 'Cerrar sesión',
      text: '¿Seguro que deseas salir?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Salir'
    }).then(result => {

      if (result.isConfirmed) {
        this.router.navigate(['/login']);
      }

    });

  }

}