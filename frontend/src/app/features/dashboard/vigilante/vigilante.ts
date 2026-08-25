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
  uid?: string;
  name: string;
  email: string;
  document: string;
  role: string;
  status?: string;
  type?: 'entrada' | 'salida';
  date?: string;
  method?: string;
  device?: string;
  tempAccess?: boolean;
  expirationDate?: string | null;
  reason?: string;
}

interface TemporaryRequest {
  id?: string;
  name: string;
  email: string;
  document: string;
  reason: string;
  requestedBy?: string;
  requestedByEmail?: string;
  status: 'pendiente' | 'aprobada' | 'rechazada';
  created_at?: string;
  expires_at?: string;
  durationHours?: number;
  rejection_reason?: string;
  reviewed_by?: string;
  reviewed_at?: string;
}

@Component({
  selector: 'app-vigilante',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './vigilante.html',
  styleUrls: ['./vigilante.css']
})
export class VigilanteComponent {
  menuOpen = true;
  activeSection = 'accesses';
  showForm = false;
  editMode = false;

  totalIngresos = 0;
  totalSalidas = 0;
  accesosHoy: Access[] = [];

  currentUser: any = null;
  selectedPhoto: File | null = null;

  temporaryRequests: TemporaryRequest[] = [];
  loadingRequests = false;
  requestFilter: 'todas' | 'pendiente' | 'aprobada' | 'rechazada' = 'todas';

  profile = {
    name: '',
    email: '',
    phone: '',
    address: '',
    document: '',
    photo: 'assets/avatar.png'
  };

  accesses: Access[] = [];

  form: Access = {
    id: '',
    name: '',
    email: '',
    document: '',
    role: '',
    status: '',
    tempAccess: false,
    expirationDate: null
  };

  search = '';

  constructor(
    private router: Router,
    private firestoreService: FirestoreService,
    private dashboardService: DashboardService,
    private authService: AuthService
  ) { }

  ngOnInit(): void {
    this.loadProfile();
    this.loadAccessLogs();
    this.loadTemporaryRequests();
  }

  setSection(section: string): void {
    this.activeSection = section;
    this.showForm = false;
    this.resetForm();
  }

  toggleMenu(): void {
    this.menuOpen = !this.menuOpen;
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
      id: '',
      name: '',
      email: '',
      document: '',
      role: '',
      status: '',
      tempAccess: this.activeSection === 'temporary',
      expirationDate: null,
      reason: ''
    };

    this.editMode = false;
  }

  loadAccessLogs(): void {
    this.dashboardService.getAccesses().subscribe({
      next: (res: any) => {
        const logs = res?.accesses || res?.logs || res || [];

        this.accesses = Array.isArray(logs)
          ? logs.map((access: any): Access => ({
            id: access.id || access.uid || '',
            uid: access.uid || access.user_id || '',
            name: access.name || access.user_name || 'Usuario desconocido',
            role: access.role || '',
            email: access.email || '',
            document: access.document || '',
            status: access.status || '',
            type: access.type === 'salida' ? 'salida' : 'entrada',
            date: access.date || access.created_at || access.timestamp || '',
            method: access.method || access.access_method || '',
            device: access.device || '',
            tempAccess: access.tempAccess === true,
            expirationDate: access.expirationDate || access.expires_at || null
          }))
          : [];

        this.calculateAccessStats();
      },
      error: (err: any) => {
        console.error('ERROR CARGANDO ACCESOS:', err);
      }
    });
  }

  calculateAccessStats(): void {
    const today = new Date();

    const todayLogs = this.accesses.filter(access => {
      if (!access.date) return false;

      const date = new Date(access.date);

      if (isNaN(date.getTime())) return false;

      return (
        date.getDate() === today.getDate() &&
        date.getMonth() === today.getMonth() &&
        date.getFullYear() === today.getFullYear()
      );
    });

    this.accesosHoy = todayLogs;

    this.totalIngresos = todayLogs.filter(
      access => access.type === 'entrada'
    ).length;

    this.totalSalidas = todayLogs.filter(
      access => access.type === 'salida'
    ).length;
  }

  saveAccess(): void {
    if (this.activeSection === 'temporary') {
      this.createTemporaryRequest();
      return;
    }

    if (!this.form.name?.trim()) {
      Swal.fire(
        'Campo obligatorio',
        'El nombre del usuario es obligatorio.',
        'warning'
      );
      return;
    }

    if (!this.form.email?.trim()) {
      Swal.fire(
        'Campo obligatorio',
        'El correo electrónico es obligatorio.',
        'warning'
      );
      return;
    }

    if (!this.form.document?.trim()) {
      Swal.fire(
        'Campo obligatorio',
        'El documento es obligatorio.',
        'warning'
      );
      return;
    }

    if (!this.form.role?.trim()) {
      Swal.fire(
        'Campo obligatorio',
        'El rol del usuario es obligatorio.',
        'warning'
      );
      return;
    }

    const data = {
      name: this.form.name.trim(),
      email: this.form.email.trim(),
      document: this.form.document.trim(),
      role: this.form.role.trim(),
      tempAccess: false,
      expirationDate: null
    };

    if (this.editMode) {
      this.firestoreService
        .updateUser(this.form.id, data)
        .then(() => {
          Swal.fire({
            icon: 'success',
            title: 'Usuario actualizado',
            text: 'Los datos fueron actualizados correctamente.',
            timer: 1500,
            showConfirmButton: false
          });

          this.closeForm();
          this.loadAccessLogs();
        })
        .catch(error => {
          console.error('ERROR ACTUALIZANDO USUARIO:', error);

          Swal.fire(
            'Error',
            'No fue posible actualizar el usuario.',
            'error'
          );
        });

      return;
    }

    this.firestoreService
      .createUser(data)
      .then(() => {
        Swal.fire({
          icon: 'success',
          title: 'Usuario registrado',
          text: 'El usuario fue registrado correctamente.',
          timer: 1500,
          showConfirmButton: false
        });

        this.closeForm();
        this.loadAccessLogs();
      })
      .catch(error => {
        console.error('ERROR CREANDO USUARIO:', error);

        Swal.fire(
          'Error',
          'No fue posible registrar el usuario.',
          'error'
        );
      });
  }

  createTemporaryRequest(): void {
    if (!this.form.name?.trim()) {
      Swal.fire(
        'Campo obligatorio',
        'El nombre del visitante es obligatorio.',
        'warning'
      );
      return;
    }

    if (!this.form.email?.trim()) {
      Swal.fire(
        'Campo obligatorio',
        'El correo electrónico es obligatorio.',
        'warning'
      );
      return;
    }

    if (!this.form.document?.trim()) {
      Swal.fire(
        'Campo obligatorio',
        'El documento es obligatorio.',
        'warning'
      );
      return;
    }

    if (!this.form.reason?.trim()) {
      Swal.fire(
        'Motivo requerido',
        'Debes indicar el motivo por el cual se solicita el acceso temporal.',
        'warning'
      );
      return;
    }

    if (!this.form.expirationDate) {
      Swal.fire(
        'Duración requerida',
        'Debes seleccionar la duración del acceso temporal.',
        'warning'
      );
      return;
    }

    const firebaseUser = this.authService.getUser();

    if (!firebaseUser) {
      Swal.fire(
        'Sesión no válida',
        'No se pudo identificar al vigilante que realiza la solicitud.',
        'error'
      );
      return;
    }

    const durationHours = Number(this.form.expirationDate);

    const data = {
      name: this.form.name.trim(),
      email: this.form.email.trim(),
      document: this.form.document.trim(),
      reason: this.form.reason.trim(),

      requestedBy: firebaseUser.uid || '',
      requestedByEmail: firebaseUser.email || '',

      status: 'pendiente',

      durationHours
    };

    this.dashboardService
      .createTemporaryRequest(data)
      .subscribe({
        next: () => {

          Swal.fire({
            icon: 'success',
            title: 'Solicitud enviada',
            text: 'La solicitud fue enviada al administrador para su aprobación.',
            timer: 2200,
            showConfirmButton: false
          });

          this.closeForm();

          this.loadTemporaryRequests();
        },

        error: err => {

          console.error(
            'ERROR SOLICITUD TEMPORAL:',
            err
          );

          Swal.fire(
            'No se pudo enviar',
            err?.error?.message ||
            'No fue posible enviar la solicitud al administrador.',
            'error'
          );
        }
      });
  }

  loadTemporaryRequests(): void {
    this.loadingRequests = true;

    this.dashboardService
      .getTemporaryRequests()
      .subscribe({
        next: (res: any) => {

          const requests = res?.requests || res || [];

          this.temporaryRequests = Array.isArray(requests)
            ? requests.map((request: any): TemporaryRequest => ({
              id: request.id || '',
              name: request.name || '',
              email: request.email || '',
              document: request.document || '',

              reason:
                request.reason ||
                request.motivo ||
                'Sin motivo registrado',

              requestedBy:
                request.requestedBy ||
                request.requested_by ||
                '',

              requestedByEmail:
                request.requestedByEmail ||
                request.requested_by_email ||
                '',

              status:
                request.status === 'aprobada'
                  ? 'aprobada'
                  : request.status === 'rechazada'
                    ? 'rechazada'
                    : 'pendiente',

              created_at:
                request.created_at ||
                request.createdAt ||
                request.created ||
                '',

              expires_at:
                request.expires_at ||
                request.expiresAt ||
                '',

              durationHours:
                Number(request.durationHours || request.duration_hours || 0),

              rejection_reason:
                request.rejection_reason ||
                request.rejectionReason ||
                '',

              reviewed_by:
                request.reviewed_by ||
                request.reviewedBy ||
                '',

              reviewed_at:
                request.reviewed_at ||
                request.reviewedAt ||
                ''
            }))
            : [];

          this.loadingRequests = false;
        },

        error: err => {

          console.error(
            'ERROR CARGANDO SOLICITUDES:',
            err
          );

          this.temporaryRequests = [];

          this.loadingRequests = false;

        }
      });
  }

  filteredTemporaryRequests(): TemporaryRequest[] {
    if (this.requestFilter === 'todas') {
      return this.temporaryRequests;
    }

    return this.temporaryRequests.filter(
      request => request.status === this.requestFilter
    );
  }

  getRequestCount(
    status: 'pendiente' | 'aprobada' | 'rechazada'
  ): number {
    return this.temporaryRequests.filter(
      request => request.status === status
    ).length;
  }

  editAccess(access: Access): void {
    this.form = {
      id: access.id || '',
      uid: access.uid || '',
      name: access.name || '',
      email: access.email || '',
      document: access.document || '',
      role: access.role || '',
      status: access.status || '',
      type: access.type,
      date: access.date,
      method: access.method,
      device: access.device,
      tempAccess: access.tempAccess === true,
      expirationDate: access.expirationDate || null
    };

    this.editMode = true;
    this.showForm = true;
  }

  async deleteAccess(id: string): Promise<void> {
    const result = await Swal.fire({
      title: 'Eliminar usuario',
      text: '¿Desea eliminar este usuario?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#dc2626'
    });

    if (!result.isConfirmed) return;

    try {
      await this.firestoreService.deleteUser(id);

      Swal.fire({
        icon: 'success',
        title: 'Usuario eliminado',
        text: 'El usuario fue eliminado correctamente.',
        timer: 1500,
        showConfirmButton: false
      });

      this.loadAccessLogs();
    } catch (error) {
      console.error('ERROR ELIMINANDO USUARIO:', error);

      Swal.fire(
        'Error',
        'No fue posible eliminar el usuario.',
        'error'
      );
    }
  }

  logout(): void {
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
        const users = res?.users || [];
        const firebaseUser = this.authService.getUser();

        if (!firebaseUser) return;

        const me = users.find(
          (user: any) => user.email === firebaseUser.email
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
      error: err => {
        console.error('ERROR CARGANDO PERFIL:', err);
      }
    });
  }

  uploadPhoto(event: any): void {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith('image/')) {
      Swal.fire(
        'Archivo no válido',
        'Selecciona una imagen válida.',
        'warning'
      );
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      Swal.fire(
        'Archivo demasiado grande',
        'La fotografía no puede superar los 5 MB.',
        'warning'
      );
      return;
    }

    this.selectedPhoto = file;

    const reader = new FileReader();

    reader.onload = () => {
      this.profile.photo = reader.result as string;
    };

    reader.readAsDataURL(file);
  }

  filteredAccesses(): Access[] {
    const term = this.search?.trim().toLowerCase();

    if (!term) {
      return this.accesses;
    }

    return this.accesses.filter(access => {
      const name = access.name?.toLowerCase() || '';
      const document = access.document?.toLowerCase() || '';
      const email = access.email?.toLowerCase() || '';
      const role = access.role?.toLowerCase() || '';

      return (
        name.includes(term) ||
        document.includes(term) ||
        email.includes(term) ||
        role.includes(term)
      );
    });
  }

  async updateProfile(): Promise<void> {
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
          'http://127.0.0.1:8000' + response.photo;
      }

      const data = {
        name: this.profile.name,
        email: this.profile.email,
        phone: this.profile.phone,
        address: this.profile.address,
        document: this.profile.document,
        photo: this.profile.photo
      };

      this.dashboardService
        .updateUser(this.currentUser.uid, data)
        .subscribe({
          next: () => {
            Swal.fire(
              'Correcto',
              'Perfil actualizado',
              'success'
            );

            this.selectedPhoto = null;
            this.loadProfile();
          },
          error: err => {
            Swal.fire(
              'Error',
              err.error?.message ||
              'No fue posible actualizar el perfil.',
              'error'
            );
          }
        });
    } catch (error) {
      console.error('ERROR ACTUALIZANDO PERFIL:', error);

      Swal.fire(
        'Error',
        'No fue posible subir la foto.',
        'error'
      );
    }
  }
}