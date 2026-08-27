import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';

import { ApiService } from '../../../core/services/api.service';
import { DashboardService } from '../../../core/services/dashboard.service';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';

interface Access {
  uid?: string;
  id?: string;

  name: string;
  role: string;
  email?: string;

  documentType?: 'CC' | 'TI' | '';
  document_type?: 'CC' | 'TI' | '';
  document?: string;

  phone?: string;
  address?: string;
  photo?: string;
  status?: string;

  active?: boolean;

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

  // =========================================================
  // BIOMETRÍA — SOLO VISTA POR AHORA
  // =========================================================

  biometricSearch = '';
  showBiometricModal = false;
  selectedBiometricUser: Access | null = null;

  notifications: any[] = [];
  unreadNotifications = 0;

  currentUser: any = null;

  selectedPhoto: File | null = null;

  profile = {
    uid: '',
    name: '',
    email: '',
    phone: '',
    address: '',

    documentType: '' as 'CC' | 'TI' | '',
    document_type: '' as 'CC' | 'TI' | '',
    document: '',

    role: '',
    status: '',
    photo: ''
  };

  form: Access = {
    uid: '',
    name: '',
    role: '',
    email: '',
    documentType: '',
    document_type: '',
    document: '',
    phone: '',
    address: '',
    active: true,
    tempAccess: false,
    expirationDate: ''
  };

  constructor(
    private router: Router,
    private apiService: ApiService,
    private dashboardService: DashboardService,
    private authService: AuthService,
    private notificationService: NotificationService
  ) { }

  get totalTemporales(): number {
    return this.accesses.filter(
      access => access.tempAccess
    ).length;
  }

  // =========================================================
  // PERMISOS DEL ADMINISTRADOR
  // =========================================================

  private readonly manageableRoles = [
    'aprendiz',
    'instructor',
    'vigilante',
    'usuario'
  ];

  private normalizeRole(role: any): string {
    return String(role || '')
      .trim()
      .toLowerCase();
  }

  isProtectedRole(role: any): boolean {
    const normalizedRole = this.normalizeRole(role);

    return [
      'administrador',
      'admin',
      'administrator',
      'super-admin',
      'superadmin',
      'super_admin',
      'super administrador'
    ].includes(normalizedRole);
  }

  canManageUser(user: Access | null | undefined): boolean {
    if (!user) {
      return false;
    }

    return !this.isProtectedRole(user.role);
  }

  private canAssignRole(role: any): boolean {
    return this.manageableRoles.includes(
      this.normalizeRole(role)
    );
  }

  ngOnInit(): void {
    this.loadUsers();
    this.loadProfile();
    this.loadNotifications();
  }

  // =========================================================
  // USUARIOS
  // =========================================================

  loadUsers(): void {

    this.apiService
      .listUsers()
      .subscribe({

        next: (resp: any) => {

          const users =
            resp?.users ||
            resp?.data?.users ||
            resp?.results ||
            (Array.isArray(resp) ? resp : []);

          this.accesses =
            Array.isArray(users)
              ? users.map((user: any): Access => ({

                  uid:
                    user?.uid ||
                    user?.id ||
                    '',

                  id:
                    user?.id ||
                    user?.uid ||
                    '',

                  name:
                    user?.name ||
                    '',

                  email:
                    user?.email ||
                    '',

                  role:
                    user?.role ||
                    'usuario',

                  documentType:
                    user?.document_type ||
                    user?.documentType ||
                    '',

                  document_type:
                    user?.document_type ||
                    user?.documentType ||
                    '',

                  document:
                    String(
                      user?.document ||
                      ''
                    ),

                  phone:
                    user?.phone ||
                    '',

                  address:
                    user?.address ||
                    '',

                  photo:
                    user?.photo ||
                    '',

                  active:
                    user?.active !== false,

                  status:
                    user?.status ||
                    (user?.active === false
                      ? 'Inactivo'
                      : 'Activo'),

                  tempAccess:
                    user?.tempAccess === true ||
                    user?.temp_access === true,

                  expirationDate:
                    user?.expirationDate ||
                    user?.expiration_date ||
                    ''

                }))
              : [];

        },

        error: (err: any) => {
          console.error(
            'Error cargando usuarios:',
            err
          );
        }

      });

  }

  // =========================================================
  // MENÚ
  // =========================================================

  toggleMenu(): void {
    this.menuOpen = !this.menuOpen;
  }

  goTo(route: string): void {

    this.activeRoute = route;

    if (route === 'notificaciones') {
      this.loadNotifications();
    }

  }

  // =========================================================
  // NOTIFICACIONES
  // =========================================================

  loadNotifications(): void {

    this.notificationService
      .getNotifications()
      .subscribe({

        next: (notifications: any[]) => {

          console.log(
            '🔔 NOTIFICACIONES ADMIN:',
            notifications
          );

          this.notifications =
            notifications || [];

          this.unreadNotifications =
            this.notifications.filter(
              notification =>
                notification.read === false ||
                notification.read === undefined
            ).length;

        },

        error: (error: any) => {

          console.error(
            'ERROR CARGANDO NOTIFICACIONES DEL ADMIN:',
            error
          );

        }

      });

    this.notificationService
      .getUnreadCount()
      .subscribe({

        next: (count: number) => {
          this.unreadNotifications = count;
        },

        error: (err: any) => {
          console.error(
            'Error cargando contador de notificaciones:',
            err
          );
        }

      });

    this.notificationService
      .loadNotifications();

  }

  markNotificationAsRead(
    notification: any
  ): void {

    if (!notification?.id) {
      return;
    }

    if (notification.read) {
      return;
    }

    this.notificationService
      .markAsRead(notification.id);

  }

  markAllNotificationsAsRead(): void {

    this.notificationService
      .markAllAsRead();

  }

  getNotificationIcon(
    notification: any
  ): string {

    switch (notification?.type) {

      case 'invitation_accepted':
        return 'fa-envelope-open-text';

      case 'invitation_created':
        return 'fa-envelope';

      case 'user_created':
        return 'fa-user-plus';

      case 'user_deleted':
        return 'fa-user-minus';

      case 'user_updated':
        return 'fa-user-pen';

      case 'access_denied':
        return 'fa-triangle-exclamation';

      case 'access_granted':
        return 'fa-door-open';

      case 'role_changed':
        return 'fa-user-shield';

      case 'temporary_request':
        return 'fa-user-clock';

      case 'temporary_request_approved':
        return 'fa-user-check';

      case 'temporary_request_rejected':
        return 'fa-user-xmark';

      default:
        return 'fa-bell';

    }

  }

  formatNotificationDate(
    notification: any
  ): string {

    const date =
      notification?.created_at ||
      notification?.createdAt ||
      notification?.time;

    if (!date) {
      return '';
    }

    try {

      return new Date(date)
        .toLocaleString(
          'es-CO',
          {
            dateStyle: 'short',
            timeStyle: 'short'
          }
        );

    } catch {

      return String(date);

    }

  }

  // =========================================================
  // ESTADO DE SOLICITUD TEMPORAL
  // =========================================================

  canProcessTemporaryRequest(
    notification: any
  ): boolean {

    if (
      notification?.type !== 'temporary_request'
    ) {
      return false;
    }

    if (
      !notification?.data?.request_id
    ) {
      return false;
    }

    const data =
      notification?.data || {};

    if (
      data.processed === true ||
      data.approved === true ||
      data.rejected === true
    ) {
      return false;
    }

    const status = String(
      data.status ??
      data.request_status ??
      notification?.status ??
      ''
    )
      .trim()
      .toLowerCase();

    if (!status) {
      return true;
    }

    return (
      status === 'pendiente' ||
      status === 'pending'
    );

  }

  getTemporaryRequestStatus(
    notification: any
  ): string {

    if (
      notification?.type ===
      'temporary_request_approved'
    ) {
      return 'Aprobada';
    }

    if (
      notification?.type ===
      'temporary_request_rejected'
    ) {
      return 'Rechazada';
    }

    const status = String(
      notification?.data?.status ??
      notification?.data?.request_status ??
      notification?.status ??
      ''
    )
      .trim()
      .toLowerCase();

    if (
      status === 'approved' ||
      status === 'aprobada' ||
      status === 'aprobado'
    ) {
      return 'Aprobada';
    }

    if (
      status === 'rejected' ||
      status === 'rechazada' ||
      status === 'rechazado'
    ) {
      return 'Rechazada';
    }

    return 'Pendiente';

  }

  // =========================================================
  // APROBAR SOLICITUD TEMPORAL
  // =========================================================

  approveTemporaryRequest(
    notification: any
  ): void {

    if (
      !this.canProcessTemporaryRequest(
        notification
      )
    ) {

      Swal.fire({
        icon: 'info',
        title: 'Solicitud procesada',
        text:
          'Esta solicitud ya fue aprobada o rechazada.'
      });

      this.loadNotifications();

      return;
    }

    const requestId =
      notification?.data?.request_id;

    if (!requestId) {

      Swal.fire(
        'Error',
        'No se encontró la solicitud temporal.',
        'error'
      );

      return;
    }

    const firebaseUser =
      this.authService.getUser();

    if (!firebaseUser?.uid) {

      Swal.fire(
        'Error',
        'No se pudo identificar al administrador.',
        'error'
      );

      return;
    }

    Swal.fire({

      title: 'Aprobar solicitud',

      text:
        '¿Deseas crear este usuario temporal?',

      icon: 'question',

      showCancelButton: true,

      confirmButtonText:
        'Sí, aprobar',

      cancelButtonText:
        'Cancelar'

    }).then(result => {

      if (!result.isConfirmed) {
        return;
      }

      this.dashboardService
        .approveTemporaryRequest(
          requestId,
          firebaseUser.uid
        )
        .subscribe({

          next: () => {

            Swal.fire({

              icon: 'success',

              title:
                'Solicitud aprobada',

              text:
                'El usuario temporal fue creado correctamente.',

              timer: 1800,

              showConfirmButton: false

            });

            this.markNotificationAsRead(
              notification
            );

            this.loadNotifications();
            this.loadUsers();

          },

          error: (err: any) => {

            console.error(
              'ERROR APROBANDO SOLICITUD:',
              err
            );

            if (
              err?.status === 409 ||
              err?.status === 400
            ) {

              Swal.fire({
                icon: 'info',
                title:
                  'Solicitud ya procesada',
                text:
                  err?.error?.message ||
                  err?.error?.detail ||
                  'Otro administrador ya tomó una decisión sobre esta solicitud.'
              });

              this.loadNotifications();

              return;
            }

            Swal.fire(
              'Error',
              err?.error?.message ||
              err?.error?.detail ||
              'No fue posible aprobar la solicitud.',
              'error'
            );

          }

        });

    });

  }

  // =========================================================
  // RECHAZAR SOLICITUD TEMPORAL
  // =========================================================

  rejectTemporaryRequest(
    notification: any
  ): void {

    if (
      !this.canProcessTemporaryRequest(
        notification
      )
    ) {

      Swal.fire({
        icon: 'info',
        title: 'Solicitud procesada',
        text:
          'Esta solicitud ya fue aprobada o rechazada.'
      });

      this.loadNotifications();

      return;
    }

    const requestId =
      notification?.data?.request_id;

    if (!requestId) {

      Swal.fire(
        'Error',
        'No se encontró la solicitud temporal.',
        'error'
      );

      return;
    }

    const firebaseUser =
      this.authService.getUser();

    if (!firebaseUser?.uid) {

      Swal.fire(
        'Error',
        'No se pudo identificar al administrador.',
        'error'
      );

      return;
    }

    Swal.fire({

      title: 'Rechazar solicitud',

      input: 'textarea',

      inputLabel:
        'Motivo del rechazo',

      inputPlaceholder:
        'Escribe el motivo del rechazo...',

      inputAttributes: {
        'aria-label':
          'Motivo del rechazo'
      },

      showCancelButton: true,

      confirmButtonText:
        'Rechazar',

      cancelButtonText:
        'Cancelar',

      confirmButtonColor:
        '#dc2626',

      inputValidator: (value) => {

        if (!value?.trim()) {
          return 'Debes indicar un motivo.';
        }

        return null;

      }

    }).then(result => {

      if (!result.isConfirmed) {
        return;
      }

      this.dashboardService
        .rejectTemporaryRequest(
          requestId,
          firebaseUser.uid,
          result.value.trim()
        )
        .subscribe({

          next: () => {

            Swal.fire({

              icon: 'success',

              title:
                'Solicitud rechazada',

              text:
                'La solicitud fue rechazada correctamente.',

              timer: 1800,

              showConfirmButton: false

            });

            this.markNotificationAsRead(
              notification
            );

            this.loadNotifications();

          },

          error: (err: any) => {

            console.error(
              'ERROR RECHAZANDO SOLICITUD:',
              err
            );

            if (
              err?.status === 409 ||
              err?.status === 400
            ) {

              Swal.fire({
                icon: 'info',
                title:
                  'Solicitud ya procesada',
                text:
                  err?.error?.message ||
                  err?.error?.detail ||
                  'Otro administrador ya tomó una decisión sobre esta solicitud.'
              });

              this.loadNotifications();

              return;
            }

            Swal.fire(
              'Error',
              err?.error?.message ||
              err?.error?.detail ||
              'No fue posible rechazar la solicitud.',
              'error'
            );

          }

        });

    });

  }

  // =========================================================
  // CREAR USUARIO
  // =========================================================

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
      uid: '',
      name: '',
      role: '',
      email: '',
      documentType: '',
      document_type: '',
      document: '',
      phone: '',
      address: '',
      active: true,
      tempAccess: false,
      expirationDate: ''
    };

    this.editMode = false;
  }

  saveAccess(): void {

    const name = this.form.name?.trim() || '';
    const email = this.form.email?.trim().toLowerCase() || '';
    const documentType = String(
      this.form.documentType ||
      this.form.document_type ||
      ''
    ).trim().toUpperCase();
    const document = String(this.form.document || '').trim();
    const role = this.normalizeRole(this.form.role);

    if (!name) {
      Swal.fire({ icon: 'warning', title: 'Nombre requerido', text: 'Ingresa el nombre completo del usuario.' });
      return;
    }

    if (!email) {
      Swal.fire({ icon: 'warning', title: 'Correo requerido', text: 'Ingresa el correo electrónico del usuario.' });
      return;
    }

    if (documentType !== 'CC' && documentType !== 'TI') {
      Swal.fire({ icon: 'warning', title: 'Tipo de documento requerido', text: 'Selecciona CC o TI.' });
      return;
    }

    if (!document) {
      Swal.fire({ icon: 'warning', title: 'Documento requerido', text: 'Ingresa el número de documento.' });
      return;
    }

    if (!/^\d{6,15}$/.test(document)) {
      Swal.fire({ icon: 'warning', title: 'Documento no válido', text: 'El documento debe contener entre 6 y 15 dígitos.' });
      return;
    }

    if (!role) {
      Swal.fire({ icon: 'warning', title: 'Rol requerido', text: 'Selecciona un rol para el usuario.' });
      return;
    }

    if (!this.canAssignRole(role)) {
      Swal.fire({
        icon: 'error',
        title: 'Rol protegido',
        text: 'Un Administrador no puede crear ni asignar cuentas de Administrador o Super Administrador.'
      });
      return;
    }

    const firebaseUser = this.authService.getUser();

    if (!firebaseUser?.uid) {
      Swal.fire({
        icon: 'error',
        title: 'Sesión no válida',
        text: 'No fue posible identificar al administrador actual.'
      });
      return;
    }

    const data = {
      name,
      email,
      document_type: documentType,
      document,
      role,
      phone: this.form.phone?.trim() || '',
      address: this.form.address?.trim() || '',
      active: this.form.active !== false,
      tempAccess: this.form.tempAccess === true,
      expirationDate: this.form.expirationDate || null,
      actor_uid: firebaseUser.uid,
      created_by: firebaseUser.uid
    };

    if (this.editMode) {

      if (!this.form.uid) {
        Swal.fire({
          icon: 'error',
          title: 'Usuario no identificado',
          text: 'No se encontró el UID del usuario que deseas editar.'
        });
        return;
      }

      const originalUser = this.accesses.find(
        user => user.uid === this.form.uid
      );

      if (!originalUser || !this.canManageUser(originalUser)) {
        Swal.fire({
          icon: 'error',
          title: 'Cuenta protegida',
          text: 'No puedes editar cuentas de Administrador o Super Administrador.'
        });
        this.closeForm();
        return;
      }

      this.dashboardService
        .updateUser(this.form.uid, data)
        .subscribe({

          next: () => {
            Swal.fire({
              icon: 'success',
              title: 'Usuario actualizado',
              text: 'Los cambios se guardaron correctamente.',
              timer: 1700,
              showConfirmButton: false
            });
            this.closeForm();
            this.loadUsers();
          },

          error: (err: any) => {
            Swal.fire({
              icon: 'error',
              title: 'No se pudo actualizar',
              text:
                err?.error?.message ||
                err?.error?.detail ||
                'El servidor rechazó la actualización.'
            });
          }

        });

      return;
    }

    this.apiService
      .createUser(data)
      .subscribe({

        next: (resp: any) => {
          Swal.fire({
            icon: 'success',
            title: 'Usuario creado',
            text: resp?.message || 'Usuario creado correctamente.',
            timer: 1700,
            showConfirmButton: false
          });
          this.closeForm();
          this.loadUsers();
        },

        error: (err: any) => {
          Swal.fire({
            icon: 'error',
            title: 'No se pudo crear',
            text:
              err?.error?.message ||
              err?.error?.detail ||
              'No fue posible crear el usuario.'
          });
        }

      });

  }

  // =========================================================
  // EDITAR USUARIO
  // =========================================================

  editAccess(access: Access): void {

    if (!this.canManageUser(access)) {
      Swal.fire({
        icon: 'warning',
        title: 'Cuenta protegida',
        text: 'El Administrador no puede editar cuentas de Administrador ni Super Administrador.'
      });
      return;
    }

    this.form = {
      uid: access.uid || '',
      id: access.id || '',
      name: access.name || '',
      email: access.email || '',
      role: this.normalizeRole(access.role),
      documentType: access.document_type || access.documentType || '',
      document_type: access.document_type || access.documentType || '',
      document: access.document || '',
      phone: access.phone || '',
      address: access.address || '',
      photo: access.photo || '',
      status: access.status || '',
      active: access.active !== false,
      tempAccess: access.tempAccess === true,
      expirationDate: access.expirationDate || ''
    };

    this.editMode = true;
    this.showForm = true;
  }

  // =========================================================
  // ELIMINAR USUARIO
  // =========================================================

  deleteAccess(uid: string): void {

    const targetUser = this.accesses.find(
      user => user.uid === uid
    );

    if (!targetUser) {
      Swal.fire({
        icon: 'error',
        title: 'Usuario no encontrado',
        text: 'No se pudo identificar la cuenta que deseas eliminar.'
      });
      return;
    }

    if (!this.canManageUser(targetUser)) {
      Swal.fire({
        icon: 'warning',
        title: 'Cuenta protegida',
        text: 'El Administrador no puede eliminar cuentas de Administrador ni Super Administrador.'
      });
      return;
    }

    Swal.fire({
      title: 'Eliminar usuario',
      text: `¿Deseas eliminar a ${targetUser.name || 'este usuario'}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#dc2626'
    }).then(result => {

      if (!result.isConfirmed) {
        return;
      }

      this.apiService
        .deleteUser(uid)
        .subscribe({

          next: () => {
            Swal.fire({
              icon: 'success',
              title: 'Usuario eliminado',
              timer: 1500,
              showConfirmButton: false
            });
            this.loadUsers();
          },

          error: (err: any) => {
            Swal.fire({
              icon: 'error',
              title: 'No se pudo eliminar',
              text:
                err?.error?.message ||
                err?.error?.detail ||
                'No fue posible eliminar el usuario.'
            });
          }

        });

    });

  }

  // =========================================================
  // PERFIL
  // =========================================================

  loadProfile(): void {

    this.dashboardService
      .getUsers()
      .subscribe({

        next: (res: any) => {

          const users =
            res.users || res || [];

          const firebaseUser =
            this.authService.getUser();

          if (!firebaseUser) {
            return;
          }

          const me =
            users.find(
              (user: any) =>
                user.uid === firebaseUser.uid ||
                user.email === firebaseUser.email
            );

          if (!me) {

            console.warn(
              'No se encontró el usuario administrador actual.'
            );

            return;
          }

          this.currentUser = me;

          this.profile = {

            uid:
              me.uid || '',

            name:
              me.name || '',

            email:
              me.email || '',

            phone:
              me.phone || '',

            address:
              me.address || '',

            documentType:
              me.document_type ||
              me.documentType ||
              '',

            document_type:
              me.document_type ||
              me.documentType ||
              '',

            document:
              me.document || '',

            role:
              me.role || 'administrador',

            status:
              me.status ||
              (
                me.active === false
                  ? 'Inactivo'
                  : 'Activo'
              ),

            photo:
              me.photo ||
              'assets/avatar.png'

          };

        },

        error: (err: any) => {

          console.error(
            'Error cargando perfil:',
            err
          );

        }

      });

  }

  getProfileName(): string {

    if (this.profile.name) {
      return this.profile.name;
    }

    return 'Administrador';

  }

  getProfileRole(): string {

    const role = this.normalizeRole(
      this.profile.role
    );

    if (
      role === 'administrador' ||
      role === 'admin' ||
      role === 'administrator'
    ) {
      return 'Administrador';
    }

    return this.profile.role || 'Administrador';

  }

  isProfileActive(): boolean {

    const status =
      String(
        this.profile.status || ''
      )
        .trim()
        .toLowerCase();

    return (
      status === 'activo' ||
      status === 'active' ||
      status === 'true' ||
      status === '1'
    );

  }

  // =========================================================
  // FOTO
  // =========================================================

  uploadPhoto(
    event: any
  ): void {

    const file =
      event.target?.files?.[0];

    if (!file) {
      return;
    }

    if (
      !file.type.startsWith(
        'image/'
      )
    ) {

      Swal.fire({
        icon: 'warning',
        title:
          'Archivo no válido',
        text:
          'Seleccione una imagen válida.'
      });

      event.target.value = '';

      return;
    }

    const maxSize =
      5 * 1024 * 1024;

    if (
      file.size > maxSize
    ) {

      Swal.fire({
        icon: 'warning',
        title:
          'Imagen demasiado grande',
        text:
          'La imagen no puede superar los 5 MB.'
      });

      event.target.value = '';

      return;
    }

    this.selectedPhoto = file;

    const reader =
      new FileReader();

    reader.onload = () => {

      this.profile.photo =
        reader.result as string;

    };

    reader.readAsDataURL(
      file
    );

  }

  // =========================================================
  // ACTUALIZAR PERFIL
  // =========================================================

  async updateProfile(): Promise<void> {

    if (!this.currentUser?.uid) {
      Swal.fire({
        icon: 'error',
        title: 'Sesión no válida',
        text: 'No se encontró el usuario actual.'
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

    const firebaseUser = this.authService.getUser();

    try {

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
              : `http://127.0.0.1:8000${response.photo}`;
        }
      }

      const data = {
        email: this.profile.email.trim(),
        phone: this.profile.phone.trim(),
        address: this.profile.address.trim(),
        photo: this.profile.photo,
        actor_uid:
          firebaseUser?.uid ||
          this.currentUser.uid
      };

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
              text: 'Los datos permitidos se actualizaron correctamente.',
              timer: 1800,
              showConfirmButton: false
            });
            this.selectedPhoto = null;
            this.loadUsers();
            this.loadProfile();
          },

          error: (err: any) => {
            console.error('Error actualizando perfil:', err);
            Swal.fire({
              icon: 'error',
              title: 'Error',
              text:
                err?.error?.message ||
                err?.error?.detail ||
                'No fue posible actualizar el perfil.'
            });
          }

        });

    } catch (error) {
      console.error('Error subiendo foto:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No fue posible subir la foto.'
      });
    }

  }

  // =========================================================
  // CERRAR SESIÓN
  // =========================================================

  logout(): void {

    Swal.fire({

      title:
        'Cerrar sesión',

      text:
        '¿Seguro que deseas salir?',

      icon:
        'question',

      showCancelButton:
        true,

      confirmButtonText:
        'Salir',

      cancelButtonText:
        'Cancelar'

    }).then(result => {

      if (
        result.isConfirmed
      ) {

        this.router.navigate([
          '/login'
        ]);

      }

    });

  }


  // =========================================================
  // BIOMETRÍA — VISTA PREPARADA PARA ESP32 + AS608
  // =========================================================

  filteredBiometricUsers(): Access[] {

    const term =
      this.biometricSearch
        .trim()
        .toLowerCase();

    if (!term) {
      return this.accesses;
    }

    return this.accesses.filter(user => {

      const name =
        user.name?.toLowerCase() || '';

      const email =
        user.email?.toLowerCase() || '';

      const document =
        user.document?.toLowerCase() || '';

      const role =
        user.role?.toLowerCase() || '';

      return (
        name.includes(term) ||
        email.includes(term) ||
        document.includes(term) ||
        role.includes(term)
      );

    });

  }

  openFingerprintEnrollment(
    user: Access
  ): void {

    if (!this.canManageUser(user)) {
      Swal.fire({
        icon: 'warning',
        title: 'Cuenta protegida',
        text: 'El Administrador no puede gestionar la biometría de Administradores ni Super Administradores.'
      });
      return;
    }

    this.selectedBiometricUser = user;
    this.showBiometricModal = true;

  }

  closeFingerprintEnrollment(): void {

    this.showBiometricModal = false;
    this.selectedBiometricUser = null;

  }

}