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
    uid: '',
    name: '',
    email: '',
    phone: '',
    address: '',
    document: '',
    role: '',
    status: '',
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

  /*
  =========================================================
  INICIO
  =========================================================
  */

  ngOnInit(): void {
    this.loadUsers();
    this.loadProfile();
  }

  /*
  =========================================================
  USUARIOS
  =========================================================
  */

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

  /*
  =========================================================
  MENU
  =========================================================
  */

  toggleMenu(): void {
    this.menuOpen = !this.menuOpen;
  }

  goTo(route: string): void {
    this.activeRoute = route;
  }

  /*
  =========================================================
  CREAR USUARIO
  =========================================================
  */

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

    const currentUser = this.authService.getUser();

    if (!currentUser?.uid) {

      Swal.fire({
        icon: 'error',
        title: 'Sesión no válida',
        text: 'No fue posible identificar al administrador actual.'
      });

      return;
    }

    const data = {

      name: this.form.name,

      email: this.form.email,

      document: this.form.document,

      role: this.form.role,

      tempAccess: this.form.tempAccess,

      expirationDate:
        this.form.expirationDate || null,

      created_by: currentUser.uid

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
          text:
            err.error?.message ||
            'No fue posible crear el usuario.'
        });

      }

    });

  }

  /*
  =========================================================
  EDITAR USUARIO
  =========================================================
  */

  editAccess(access: Access): void {

    Swal.fire({
      icon: 'warning',
      title: 'Acción no permitida',
      text: 'El administrador no puede editar usuarios'
    });

  }

  /*
  =========================================================
  ELIMINAR USUARIO
  =========================================================
  */

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
            text:
              err.error?.message ||
              'No fue posible eliminar el usuario.'
          });

        }

      });

    });

  }

  /*
  =========================================================
  PERFIL DEL ADMINISTRADOR
  =========================================================
  */

  loadProfile(): void {

    this.dashboardService.getUsers().subscribe({

      next: (res: any) => {

        const users = res.users || [];

        const firebaseUser = this.authService.getUser();

        if (!firebaseUser) {
          return;
        }

        /*
        -----------------------------------------------------
        BUSCAR USUARIO ACTUAL
        -----------------------------------------------------
        */

        const me = users.find(
          (u: any) =>
            u.uid === firebaseUser.uid ||
            u.email === firebaseUser.email
        );

        if (!me) {

          console.warn(
            'No se encontró el usuario administrador actual.'
          );

          return;
        }

        /*
        -----------------------------------------------------
        GUARDAR USUARIO ACTUAL
        -----------------------------------------------------
        */

        this.currentUser = me;

        /*
        -----------------------------------------------------
        CARGAR DATOS DEL PERFIL
        -----------------------------------------------------
        */

        this.profile = {

          uid:
            me.uid ||
            me.id ||
            firebaseUser.uid ||
            '',

          name:
            me.name ||
            '',

          email:
            me.email ||
            firebaseUser.email ||
            '',

          phone:
            me.phone ||
            '',

          address:
            me.address ||
            '',

          document:
            me.document ||
            '',

          role:
            me.role ||
            'Administrador',

          status:
            me.status ??
            (me.active === false ? 'Inactivo' : 'Activo'),

          photo:
            me.photo ||
            'assets/avatar.png'

        };

      },

      error: (err) => {

        console.error(
          'Error cargando perfil:',
          err
        );

      }

    });

  }

  /*
  =========================================================
  NOMBRE PARA EL SIDEBAR
  =========================================================
  */

  getProfileName(): string {

    if (this.profile.name) {
      return this.profile.name;
    }

    return 'Administrador';

  }

  /*
  =========================================================
  CARGO PARA EL SIDEBAR
  =========================================================
  */

  getProfileRole(): string {

    if (this.profile.role) {
      return this.profile.role;
    }

    return 'Administrador';

  }

  /*
  =========================================================
  ESTADO
  =========================================================
  */

  isProfileActive(): boolean {

    const status =
      String(this.profile.status || '')
        .trim()
        .toLowerCase();

    return (
      status === 'activo' ||
      status === 'active' ||
      status === 'true' ||
      status === '1'
    );

  }

  /*
  =========================================================
  FOTO
  =========================================================
  */

  uploadPhoto(event: any): void {

    const file =
      event.target?.files?.[0];

    if (!file) {
      return;
    }

    /*
    -----------------------------------------------------
    VALIDAR TIPO
    -----------------------------------------------------
    */

    if (!file.type.startsWith('image/')) {

      Swal.fire({
        icon: 'warning',
        title: 'Archivo no válido',
        text: 'Seleccione una imagen válida.'
      });

      event.target.value = '';

      return;
    }

    /*
    -----------------------------------------------------
    VALIDAR TAMAÑO
    -----------------------------------------------------
    */

    const maxSize =
      5 * 1024 * 1024;

    if (file.size > maxSize) {

      Swal.fire({
        icon: 'warning',
        title: 'Imagen demasiado grande',
        text: 'La imagen no puede superar los 5 MB.'
      });

      event.target.value = '';

      return;
    }

    this.selectedPhoto = file;

    /*
    -----------------------------------------------------
    PREVISUALIZACIÓN
    -----------------------------------------------------
    */

    const reader =
      new FileReader();

    reader.onload = () => {

      this.profile.photo =
        reader.result as string;

    };

    reader.readAsDataURL(file);

  }

  /*
  =========================================================
  ACTUALIZAR PERFIL
  =========================================================
  */

  async updateProfile(): Promise<void> {

    if (!this.currentUser) {

      Swal.fire({
        icon: 'error',
        title: 'Sesión no válida',
        text: 'No se encontró el usuario actual.'
      });

      return;
    }

    if (!this.profile.name.trim()) {

      Swal.fire({
        icon: 'warning',
        title: 'Nombre requerido',
        text: 'El nombre no puede estar vacío.'
      });

      return;
    }

    if (!this.profile.email.trim()) {

      Swal.fire({
        icon: 'warning',
        title: 'Correo requerido',
        text: 'El correo no puede estar vacío.'
      });

      return;
    }

    try {

      /*
      =====================================================
      SUBIR FOTO
      =====================================================
      */

      if (this.selectedPhoto) {

        const response: any =
          await this.dashboardService
            .uploadProfilePhoto(
              this.currentUser.uid,
              this.selectedPhoto
            )
            .toPromise();

        if (response?.photo) {

          this.profile.photo =
            response.photo.startsWith('http')
              ? response.photo
              : 'http://127.0.0.1:8000' +
                response.photo;

        }

      }

      /*
      =====================================================
      DATOS EDITABLES
      =====================================================
      */

      const data = {

        name:
          this.profile.name.trim(),

        email:
          this.profile.email.trim(),

        phone:
          this.profile.phone.trim(),

        address:
          this.profile.address.trim(),

        /*
        El documento puede permanecer en la petición,
        pero NO se modifica desde la interfaz.
        */

        document:
          this.profile.document,

        photo:
          this.profile.photo

      };

      /*
      =====================================================
      ACTUALIZAR EN BACKEND
      =====================================================
      */

      this.dashboardService
        .updateUser(
          this.currentUser.uid,
          data
        )
        .subscribe({

          next: () => {

            Swal.fire({
              icon: 'success',
              title: 'Perfil actualizado',
              text: 'Los datos se actualizaron correctamente.',
              timer: 1800,
              showConfirmButton: false
            });

            /*
            -------------------------------------------------
            LIMPIAR FOTO SELECCIONADA
            -------------------------------------------------
            */

            this.selectedPhoto = null;

            /*
            -------------------------------------------------
            RECARGAR DATOS
            -------------------------------------------------
            */

            this.loadUsers();

            this.loadProfile();

          },

          error: (err) => {

            console.error(
              'Error actualizando perfil:',
              err
            );

            Swal.fire({
              icon: 'error',
              title: 'Error',
              text:
                err.error?.message ||
                'No fue posible actualizar el perfil.'
            });

          }

        });

    }

    catch (error) {

      console.error(
        'Error subiendo foto:',
        error
      );

      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No fue posible subir la foto.'
      });

    }

  }

  /*
  =========================================================
  CERRAR SESIÓN
  =========================================================
  */

  logout(): void {

    Swal.fire({
      title: 'Cerrar sesión',
      text: '¿Seguro que deseas salir?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Salir'
    }).then(result => {

      if (result.isConfirmed) {

        this.router.navigate([
          '/login'
        ]);

      }

    });

  }

}