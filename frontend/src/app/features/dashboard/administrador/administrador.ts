import { Component, OnInit, OnDestroy } from '@angular/core';
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


interface ReportAccessLog {

  id: string;
  uid: string;

  user: string;
  email: string;
  document: string;
  role: string;

  type:
    'entrada' |
    'salida';

  date: string;

  method: string;
  device: string;

  allowed: boolean;
  status: string;

}


interface BiometricJob {
  id: string;
  status: string;
  action: string;
  message?: string;
  error?: string;
  fingerprint_id?: number | null;
}

interface BiometricUser {
  uid: string;
  name: string;
  email: string;
  document: string;
  document_type: string;
  role: string;
  active: boolean;
  fingerprint_id: number | null;
  biometric_registered: boolean;
  biometric_job: BiometricJob | null;
}

interface BiometricDeviceStatus {
  device: string;
  online: boolean;
  last_seen: string | null;
  wifi_connected: boolean;
  sensor_available: boolean;
  template_count: number | null;
  ip: string;
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
export class AdminComponent implements OnInit, OnDestroy {

  menuOpen = true;
  showForm = false;
  editMode = false;

  activeRoute = 'dashboard';

  accesses: Access[] = [];

  // =========================================================
  // BIOMETRÍA — SOLO VISTA POR AHORA
  // =========================================================

  biometricUsers: BiometricUser[] = [];
  biometricSearch = '';
  biometricLoading = false;
  biometricActionInProgress = false;

  biometricDevice: BiometricDeviceStatus = {
    device: 'SEGURENTRY-ESP32',
    online: false,
    last_seen: null,
    wifi_connected: false,
    sensor_available: false,
    template_count: null,
    ip: ''
  };

  private biometricRefreshTimer:
    ReturnType<typeof setInterval> | null = null;

  private biometricJobTimer:
    ReturnType<typeof setInterval> | null = null;

  private biometricJobRequestInProgress = false;
  private activeBiometricJobId: string | null = null;

  notifications: any[] = [];
  unreadNotifications = 0;

  // =========================================================
  // NOTIFICACIONES — CENTRO MEJORADO
  // =========================================================

  notificationSearch = '';

  notificationFilter:
    'todas' |
    'no-leidas' |
    'accion' |
    'biometria' |
    'accesos' |
    'reportes' |
    'leidas' =
      'todas';



  // =========================================================
  // REPORTES
  // =========================================================

  reportAccessLogs:
    ReportAccessLog[] = [];

  reportLoading = false;

  reportSearch = '';

  reportFrom = '';

  reportTo = '';

  reportStatus:
    'todos' |
    'permitido' |
    'denegado' =
      'todos';

  reportType:
    'todos' |
    'entrada' |
    'salida' =
      'todos';

  reportRole =
    'todos';

  private reportRequestInProgress =
    false;

  // =========================================================
  // ACCESOS — FILTROS DE LA VISTA
  // =========================================================

  adminAccessSearch = '';

  adminAccessMovement:
    'todos' |
    'entrada' |
    'salida' =
      'todos';

  adminAccessStatus:
    'todos' |
    'permitido' |
    'denegado' =
      'todos';

  adminAccessDate = '';

  // =========================================================
  // ACCESOS — ACTUALIZACIÓN AUTOMÁTICA
  // =========================================================

  private accessAutoRefreshTimer:
    ReturnType<typeof setInterval> | null =
      null;

  private readonly accessAutoRefreshMs =
    1000;


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

    // Alimenta el Dashboard con los accesos reales del sistema.
    this.loadReportAccessLogs(true);

    this.startBiometricAutoRefresh();
    this.startAccessAutoRefresh();
  }

  ngOnDestroy(): void {
    this.stopBiometricAutoRefresh();
    this.stopBiometricJobWatch();
    this.stopAccessAutoRefresh();
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

    if (route === 'dashboard') {
      this.loadUsers();
      this.loadReportAccessLogs(true);
    }

    if (route === 'biometria') {
      this.loadBiometricUsers();
      this.loadBiometricDeviceStatus();
    }

    if (route === 'accesos') {
      // Primera carga inmediata al abrir la vista.
      this.loadReportAccessLogs();
    }

    if (route === 'notificaciones') {
      this.loadNotifications();
    }

    if (route === 'reportes') {
      this.loadReportAccessLogs();
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

      case 'fingerprint_enrolled':
        return 'fa-fingerprint';

      case 'fingerprint_deleted':
        return 'fa-trash-can';

      case 'fingerprint_failed':
        return 'fa-triangle-exclamation';

      case 'report_generated':
        return 'fa-file-pdf';

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
  // NOTIFICACIONES — FILTROS Y MÉTRICAS
  // =========================================================

  get filteredAdminNotifications(): any[] {

    const search =
      this.notificationSearch
        .trim()
        .toLowerCase();

    return this.notifications
      .filter(
        (
          notification:
            any
        ) => {

          const category =
            this.getAdminNotificationCategory(
              notification
            );

          if (
            this.notificationFilter ===
              'no-leidas' &&
            notification?.read ===
              true
          ) {
            return false;
          }

          if (
            this.notificationFilter ===
              'leidas' &&
            notification?.read !==
              true
          ) {
            return false;
          }

          if (
            this.notificationFilter ===
              'accion' &&
            !this.adminNotificationRequiresAction(
              notification
            )
          ) {
            return false;
          }

          if (
            this.notificationFilter ===
              'biometria' &&
            category !==
              'biometria'
          ) {
            return false;
          }

          if (
            this.notificationFilter ===
              'accesos' &&
            category !==
              'accesos'
          ) {
            return false;
          }

          if (
            this.notificationFilter ===
              'reportes' &&
            category !==
              'reportes'
          ) {
            return false;
          }

          if (search) {

            const searchable =
              [
                notification?.title,
                notification?.message,
                notification?.type,
                notification?.status,
                notification?.data?.name,
                notification?.data?.user_name,
                notification?.data?.email,
                notification?.data?.document,
                notification?.data?.role,
                notification?.data?.request_id,
                notification?.data?.report_type
              ]
                .join(' ')
                .toLowerCase();

            if (
              !searchable.includes(
                search
              )
            ) {
              return false;
            }

          }

          return true;

        }
      )
      .sort(
        (
          a: any,
          b: any
        ) =>
          this.getAdminNotificationTimestamp(
            b
          )
          -
          this.getAdminNotificationTimestamp(
            a
          )
      );

  }


  get adminNotificationTotal(): number {

    return this.notifications.length;

  }


  get adminNotificationUnread(): number {

    return this.notifications
      .filter(
        notification =>
          notification?.read !==
          true
      )
      .length;

  }


  get adminNotificationRead(): number {

    return this.notifications
      .filter(
        notification =>
          notification?.read ===
          true
      )
      .length;

  }


  get adminNotificationActionRequired(): number {

    return this.notifications
      .filter(
        notification =>
          this.adminNotificationRequiresAction(
            notification
          )
      )
      .length;

  }


  get adminNotificationToday(): number {

    return this.notifications
      .filter(
        notification =>
          this.isAdminNotificationToday(
            notification
          )
      )
      .length;

  }


  resetAdminNotificationFilters(): void {

    this.notificationSearch =
      '';

    this.notificationFilter =
      'todas';

  }


  // =========================================================
  // NOTIFICACIONES — CATEGORÍAS
  // =========================================================

  getAdminNotificationCategory(
    notification: any
  ):
    'biometria' |
    'accesos' |
    'reportes' |
    'solicitudes' |
    'usuarios' |
    'sistema' {

    const type =
      String(
        notification?.type ||
        ''
      )
        .trim()
        .toLowerCase();

    if (
      type.includes('fingerprint') ||
      type.includes('biometric')
    ) {
      return 'biometria';
    }

    if (
      type.includes('access') ||
      type.includes('entry') ||
      type.includes('exit')
    ) {
      return 'accesos';
    }

    if (
      type.includes('report')
    ) {
      return 'reportes';
    }

    if (
      type.includes('temporary') ||
      type.includes('request')
    ) {
      return 'solicitudes';
    }

    if (
      type.includes('user') ||
      type.includes('role') ||
      type.includes('invitation')
    ) {
      return 'usuarios';
    }

    return 'sistema';

  }


  getAdminNotificationCategoryLabel(
    notification: any
  ): string {

    switch (
      this.getAdminNotificationCategory(
        notification
      )
    ) {

      case 'biometria':
        return 'Biometría';

      case 'accesos':
        return 'Accesos';

      case 'reportes':
        return 'Reportes';

      case 'solicitudes':
        return 'Solicitud';

      case 'usuarios':
        return 'Usuarios';

      default:
        return 'Sistema';

    }

  }


  getAdminNotificationTone(
    notification: any
  ): string {

    const type =
      String(
        notification?.type ||
        ''
      )
        .trim()
        .toLowerCase();

    if (
      type.includes('failed') ||
      type.includes('denied') ||
      type.includes('rejected') ||
      type.includes('deleted')
    ) {
      return 'danger';
    }

    if (
      type.includes('approved') ||
      type.includes('granted') ||
      type.includes('enrolled') ||
      type.includes('created')
    ) {
      return 'success';
    }

    if (
      type.includes('fingerprint') ||
      type.includes('biometric')
    ) {
      return 'biometric';
    }

    if (
      type.includes('report')
    ) {
      return 'report';
    }

    if (
      type.includes('temporary') ||
      type.includes('request')
    ) {
      return 'action';
    }

    return 'info';

  }


  // =========================================================
  // NOTIFICACIONES — FECHAS
  // =========================================================

  private getAdminNotificationTimestamp(
    notification: any
  ): number {

    const raw =
      notification?.created_at ||
      notification?.createdAt ||
      notification?.timestamp ||
      notification?.time ||
      '';

    if (!raw) {
      return 0;
    }

    if (
      typeof raw?.toDate ===
      'function'
    ) {

      const date =
        raw.toDate();

      return isNaN(
        date.getTime()
      )
        ? 0
        : date.getTime();

    }

    if (
      typeof raw?.seconds ===
      'number'
    ) {

      return (
        raw.seconds *
        1000
      );

    }

    const date =
      new Date(
        raw
      );

    return isNaN(
      date.getTime()
    )
      ? 0
      : date.getTime();

  }


  private isAdminNotificationToday(
    notification: any
  ): boolean {

    const timestamp =
      this.getAdminNotificationTimestamp(
        notification
      );

    if (!timestamp) {
      return false;
    }

    const date =
      new Date(
        timestamp
      );

    const today =
      new Date();

    return (
      date.getFullYear() ===
        today.getFullYear() &&
      date.getMonth() ===
        today.getMonth() &&
      date.getDate() ===
        today.getDate()
    );

  }


  // =========================================================
  // NOTIFICACIONES — ACCIÓN
  // =========================================================

  adminNotificationRequiresAction(
    notification: any
  ): boolean {

    return this.canProcessTemporaryRequest(
      notification
    );

  }


  // =========================================================
  // NOTIFICACIONES — ELIMINAR
  // =========================================================

  deleteAdminNotification(
    notification: any,
    event?: Event
  ): void {

    event?.stopPropagation();

    if (!notification?.id) {
      return;
    }

    Swal.fire({

      icon: 'warning',

      title:
        'Eliminar notificación',

      text:
        'Esta notificación desaparecerá de tu centro de actividad.',

      showCancelButton:
        true,

      confirmButtonText:
        'Eliminar',

      cancelButtonText:
        'Cancelar',

      confirmButtonColor:
        '#ef4444'

    }).then(result => {

      if (!result.isConfirmed) {
        return;
      }

      const method =
        (this.notificationService as any)
          .deleteNotification;

      if (
        typeof method !==
        'function'
      ) {

        Swal.fire({
          icon: 'error',
          title:
            'Función no disponible',
          text:
            'NotificationService debe tener deleteNotification().'
        });

        return;

      }

      method
        .call(
          this.notificationService,
          notification.id
        )
        .subscribe({

          next: () => {

            Swal.fire({
              icon: 'success',
              title:
                'Notificación eliminada',
              timer: 1200,
              showConfirmButton:
                false
            });

          },

          error: (error: any) => {

            console.error(
              'ERROR ELIMINANDO NOTIFICACIÓN:',
              error
            );

            Swal.fire({
              icon: 'error',
              title:
                'No se pudo eliminar',
              text:
                error?.error?.message ||
                'Intenta nuevamente.'
            });

          }

        });

    });

  }


  deleteReadAdminNotifications(): void {

    if (
      this.adminNotificationRead ===
      0
    ) {

      Swal.fire({
        icon: 'info',
        title:
          'Sin notificaciones leídas',
        text:
          'No hay notificaciones leídas para eliminar.'
      });

      return;

    }

    Swal.fire({

      icon: 'warning',

      title:
        'Eliminar notificaciones leídas',

      text:
        'Se eliminarán todas las notificaciones que ya fueron leídas.',

      showCancelButton:
        true,

      confirmButtonText:
        'Eliminar leídas',

      cancelButtonText:
        'Cancelar',

      confirmButtonColor:
        '#ef4444'

    }).then(result => {

      if (!result.isConfirmed) {
        return;
      }

      const method =
        (this.notificationService as any)
          .deleteReadNotifications;

      if (
        typeof method !==
        'function'
      ) {

        Swal.fire({
          icon: 'error',
          title:
            'Función no disponible',
          text:
            'NotificationService debe tener deleteReadNotifications().'
        });

        return;

      }

      method
        .call(
          this.notificationService
        )
        .subscribe({

          next: () => {

            Swal.fire({
              icon: 'success',
              title:
                'Notificaciones eliminadas',
              timer: 1300,
              showConfirmButton:
                false
            });

          },

          error: (error: any) => {

            console.error(
              'ERROR ELIMINANDO LEÍDAS:',
              error
            );

            Swal.fire({
              icon: 'error',
              title:
                'No se pudieron eliminar',
              text:
                error?.error?.message ||
                'Intenta nuevamente.'
            });

          }

        });

    });

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
  // DASHBOARD — ADMINISTRADOR
  // =========================================================

  get dashboardManagedUsers(): Access[] {

    return this.accesses.filter(
      user => this.canManageUser(user)
    );

  }


  get dashboardTotalUsers(): number {

    return this.dashboardManagedUsers.length;

  }


  get dashboardTemporaryUsers(): number {

    return this.dashboardManagedUsers
      .filter(
        user =>
          user.tempAccess === true
      )
      .length;

  }


  get dashboardActiveUsers(): number {

    return this.dashboardManagedUsers
      .filter(
        user =>
          user.active !== false
      )
      .length;

  }


  get dashboardInactiveUsers(): number {

    return this.dashboardManagedUsers
      .filter(
        user =>
          user.active === false
      )
      .length;

  }


  private isTodayDashboardDate(
    value: any
  ): boolean {

    const date =
      this.parseReportAccessDate(
        value
      );

    if (!date) {
      return false;
    }

    const today =
      new Date();

    return (
      date.getFullYear() ===
        today.getFullYear() &&
      date.getMonth() ===
        today.getMonth() &&
      date.getDate() ===
        today.getDate()
    );

  }


  get dashboardTodayLogs():
    ReportAccessLog[] {

    return this.reportAccessLogs
      .filter(
        log =>
          this.isTodayDashboardDate(
            log.date
          )
      );

  }


  get dashboardTodayAccesses(): number {

    return this.dashboardTodayLogs.length;

  }


  get dashboardTodayAllowed(): number {

    return this.dashboardTodayLogs
      .filter(
        log =>
          log.allowed
      )
      .length;

  }


  get dashboardTodayDenied(): number {

    return this.dashboardTodayLogs
      .filter(
        log =>
          !log.allowed
      )
      .length;

  }


  get dashboardTodayEntries(): number {

    return this.dashboardTodayLogs
      .filter(
        log =>
          log.type ===
          'entrada'
      )
      .length;

  }


  get dashboardTodayExits(): number {

    return this.dashboardTodayLogs
      .filter(
        log =>
          log.type ===
          'salida'
      )
      .length;

  }


  dashboardRoleCount(
    role: string
  ): number {

    const normalizedRole =
      this.normalizeRole(
        role
      );

    return this.dashboardManagedUsers
      .filter(
        user =>
          this.normalizeRole(
            user.role
          ) ===
          normalizedRole
      )
      .length;

  }


  get dashboardAccessSuccessRate(): number {

    const total =
      this.dashboardTodayAccesses;

    if (!total) {
      return 0;
    }

    return Math.round(
      (
        this.dashboardTodayAllowed /
        total
      ) *
      100
    );

  }





  // =========================================================
  // ACCESOS — ACTUALIZACIÓN AUTOMÁTICA
  // =========================================================

  private startAccessAutoRefresh(): void {

    if (
      this.accessAutoRefreshTimer
    ) {
      return;
    }

    this.accessAutoRefreshTimer =
      setInterval(
        () => {

          // Solo consulta el backend cuando el Administrador
          // está viendo el apartado de Accesos.
          //
          // loadReportAccessLogs(true) es silencioso:
          // no muestra spinner, no lanza SweetAlert y
          // reportRequestInProgress evita solicitudes solapadas.
          if (
            this.activeRoute ===
            'accesos'
          ) {

            this.loadReportAccessLogs(
              true
            );

          }

        },
        this.accessAutoRefreshMs
      );

  }


  private stopAccessAutoRefresh(): void {

    if (
      !this.accessAutoRefreshTimer
    ) {
      return;
    }

    clearInterval(
      this.accessAutoRefreshTimer
    );

    this.accessAutoRefreshTimer =
      null;

  }


  // =========================================================
  // ACCESOS — FILTRO Y MÉTRICAS
  // =========================================================

  get filteredAdminAccessLogs():
    ReportAccessLog[] {

    const search =
      this.adminAccessSearch
        .trim()
        .toLowerCase();

    return this.reportAccessLogs
      .filter(
        (
          access:
            ReportAccessLog
        ) => {

          if (
            this.adminAccessMovement !==
              'todos' &&
            access.type !==
              this.adminAccessMovement
          ) {

            return false;

          }


          if (
            this.adminAccessStatus ===
              'permitido' &&
            !access.allowed
          ) {

            return false;

          }


          if (
            this.adminAccessStatus ===
              'denegado' &&
            access.allowed
          ) {

            return false;

          }


          if (
            this.adminAccessDate
          ) {

            const date =
              this.parseReportAccessDate(
                access.date
              );

            if (!date) {
              return false;
            }

            const year =
              date.getFullYear();

            const month =
              String(
                date.getMonth() + 1
              )
                .padStart(
                  2,
                  '0'
                );

            const day =
              String(
                date.getDate()
              )
                .padStart(
                  2,
                  '0'
                );

            const localDate =
              `${year}-${month}-${day}`;

            if (
              localDate !==
              this.adminAccessDate
            ) {

              return false;

            }

          }


          if (search) {

            const searchable =
              [
                access.user,
                access.email,
                access.document,
                access.role,
                access.type,
                access.method,
                access.device,
                access.status
              ]
                .join(' ')
                .toLowerCase();

            if (
              !searchable.includes(
                search
              )
            ) {

              return false;

            }

          }


          return true;

        }
      )
      .sort(
        (
          a:
            ReportAccessLog,
          b:
            ReportAccessLog
        ) => {

          const dateA =
            this.parseReportAccessDate(
              a.date
            )
              ?.getTime() ||
            0;

          const dateB =
            this.parseReportAccessDate(
              b.date
            )
              ?.getTime() ||
            0;

          return (
            dateB -
            dateA
          );

        }
      );

  }


  get adminAccessEntries():
    number {

    return this.filteredAdminAccessLogs
      .filter(
        access =>
          access.type ===
          'entrada'
      )
      .length;

  }


  get adminAccessExits():
    number {

    return this.filteredAdminAccessLogs
      .filter(
        access =>
          access.type ===
          'salida'
      )
      .length;

  }


  get adminAccessAllowed():
    number {

    return this.filteredAdminAccessLogs
      .filter(
        access =>
          access.allowed
      )
      .length;

  }


  get adminAccessDenied():
    number {

    return this.filteredAdminAccessLogs
      .filter(
        access =>
          !access.allowed
      )
      .length;

  }


  resetAdminAccessFilters():
    void {

    this.adminAccessSearch =
      '';

    this.adminAccessMovement =
      'todos';

    this.adminAccessStatus =
      'todos';

    this.adminAccessDate =
      '';

  }


  loadReportAccessLogs(
    silent: boolean = false
  ): void {

    if (
      this.reportRequestInProgress
    ) {
      return;
    }

    this.reportRequestInProgress =
      true;

    if (!silent) {

      this.reportLoading =
        true;

    }

    this.dashboardService
      .getAccesses()
      .subscribe({

        next: (res: any) => {

          const logs =
            res?.accesses ||
            res?.access ||
            res?.logs ||
            res?.results ||
            res ||
            [];

          this.reportAccessLogs =
            Array.isArray(logs)
              ? logs.map(
                  (
                    access: any
                  ): ReportAccessLog => {

                    const status =
                      String(
                        access.status ||
                        access.result ||
                        ''
                      )
                        .trim()
                        .toLowerCase();

                    let allowed =
                      true;

                    if (
                      typeof
                        access.allowed ===
                      'boolean'
                    ) {

                      allowed =
                        access.allowed;

                    } else if (
                      typeof
                        access.granted ===
                      'boolean'
                    ) {

                      allowed =
                        access.granted;

                    } else if (
                      [
                        'denegado',
                        'denied',
                        'rechazado',
                        'rejected',
                        'fallido',
                        'failed'
                      ].includes(
                        status
                      )
                    ) {

                      allowed =
                        false;

                    } else if (
                      [
                        'permitido',
                        'allowed',
                        'aprobado',
                        'approved',
                        'granted',
                        'exitoso',
                        'success'
                      ].includes(
                        status
                      )
                    ) {

                      allowed =
                        true;

                    }


                    const rawType =
                      String(
                        access.type ||
                        access.entry ||
                        access.access_type ||
                        access.movement ||
                        ''
                      )
                        .trim()
                        .toLowerCase();


                    const type:
                      'entrada' |
                      'salida' =
                        (
                          rawType ===
                            'salida' ||
                          rawType ===
                            'exit' ||
                          rawType.includes(
                            'sal'
                          )
                        )
                          ? 'salida'
                          : 'entrada';


                    return {

                      id:
                        access.id ||
                        access.log_id ||
                        '',

                      uid:
                        access.uid ||
                        access.user_id ||
                        '',

                      user:
                        access.user ||
                        access.name ||
                        access.user_name ||
                        'Usuario desconocido',

                      email:
                        access.email ||
                        access.user_email ||
                        '',

                      document:
                        access.document ||
                        access.user_document ||
                        '',

                      role:
                        access.role ||
                        access.user_role ||
                        '',

                      type,

                      date:
                        this.normalizeReportAccessDate(
                          access.date ||
                          access.created_at ||
                          access.createdAt ||
                          access.timestamp ||
                          access.time
                        ),

                      method:
                        access.method ||
                        access.access_method ||
                        access.method_name ||
                        '',

                      device:
                        access.device ||
                        access.device_name ||
                        access.sensor ||
                        '',

                      allowed,

                      status:
                        status ||
                        (
                          allowed
                            ? 'permitido'
                            : 'denegado'
                        )

                    };

                  }
                )
              : [];


          this.reportAccessLogs
            .sort(
              (
                a:
                  ReportAccessLog,
                b:
                  ReportAccessLog
              ) => {

                const dateA =
                  this.parseReportAccessDate(
                    a.date
                  )
                    ?.getTime() ||
                  0;

                const dateB =
                  this.parseReportAccessDate(
                    b.date
                  )
                    ?.getTime() ||
                  0;

                return (
                  dateB -
                  dateA
                );

              }
            );


          this.reportRequestInProgress =
            false;

          if (!silent) {

            this.reportLoading =
              false;

          }

        },


        error: (err: any) => {

          console.error(
            'ERROR CARGANDO REPORTES:',
            err
          );

          this.reportRequestInProgress =
            false;

          if (!silent) {

            this.reportLoading =
              false;

          }

          if (!silent) {

            Swal.fire({
              icon: 'error',
              title:
                'No se pudieron cargar los reportes',
              text:
                err?.error?.message ||
                'No fue posible consultar el historial de accesos.'
            });

          }

        }

      });

  }


// ==========================================================
// 7) FECHAS
// ==========================================================

  private parseReportAccessDate(
    value: any
  ): Date | null {

    if (!value) {
      return null;
    }

    if (
      typeof
        value?.toDate ===
      'function'
    ) {

      const date =
        value.toDate();

      return isNaN(
        date.getTime()
      )
        ? null
        : date;

    }

    if (
      typeof
        value?.seconds ===
      'number'
    ) {

      const date =
        new Date(
          value.seconds *
          1000
        );

      return isNaN(
        date.getTime()
      )
        ? null
        : date;

    }

    const date =
      new Date(
        value
      );

    return isNaN(
      date.getTime()
    )
      ? null
      : date;

  }


  private normalizeReportAccessDate(
    value: any
  ): string {

    const date =
      this.parseReportAccessDate(
        value
      );

    return date
      ? date.toISOString()
      : '';

  }


// ==========================================================
// 8) FILTROS
// ==========================================================

  get filteredReportLogs():
    ReportAccessLog[] {

    const search =
      this.reportSearch
        .trim()
        .toLowerCase();


    let fromDate:
      Date | null =
        null;

    let toDate:
      Date | null =
        null;


    if (
      this.reportFrom
    ) {

      fromDate =
        new Date(
          `${this.reportFrom}T00:00:00`
        );

    }


    if (
      this.reportTo
    ) {

      toDate =
        new Date(
          `${this.reportTo}T23:59:59.999`
        );

    }


    return this.reportAccessLogs
      .filter(
        (
          log:
            ReportAccessLog
        ) => {

          const date =
            this.parseReportAccessDate(
              log.date
            );


          if (
            fromDate &&
            (
              !date ||
              date <
                fromDate
            )
          ) {

            return false;

          }


          if (
            toDate &&
            (
              !date ||
              date >
                toDate
            )
          ) {

            return false;

          }


          if (
            this.reportStatus ===
              'permitido' &&
            !log.allowed
          ) {

            return false;

          }


          if (
            this.reportStatus ===
              'denegado' &&
            log.allowed
          ) {

            return false;

          }


          if (
            this.reportType !==
              'todos' &&
            log.type !==
              this.reportType
          ) {

            return false;

          }


          if (
            this.reportRole !==
              'todos' &&
            (
              log.role ||
              ''
            )
              .toLowerCase() !==
            this.reportRole
              .toLowerCase()
          ) {

            return false;

          }


          if (search) {

            const searchable =
              [
                log.user,
                log.email,
                log.document,
                log.role,
                log.type,
                log.method,
                log.device,
                log.status
              ]
                .join(' ')
                .toLowerCase();


            if (
              !searchable
                .includes(
                  search
                )
            ) {

              return false;

            }

          }


          return true;

        }
      )
      .sort(
        (
          a:
            ReportAccessLog,
          b:
            ReportAccessLog
        ) => {

          const dateA =
            this.parseReportAccessDate(
              a.date
            )
              ?.getTime() ||
            0;

          const dateB =
            this.parseReportAccessDate(
              b.date
            )
              ?.getTime() ||
            0;

          return (
            dateB -
            dateA
          );

        }
      );

  }


// ==========================================================
// 9) MÉTRICAS
// ==========================================================

  get reportAllowed():
    number {

    return (
      this.filteredReportLogs
        .filter(
          log =>
            log.allowed
        )
        .length
    );

  }


  get reportDenied():
    number {

    return (
      this.filteredReportLogs
        .filter(
          log =>
            !log.allowed
        )
        .length
    );

  }


  get reportEntries():
    number {

    return (
      this.filteredReportLogs
        .filter(
          log =>
            log.type ===
              'entrada'
        )
        .length
    );

  }


  get reportExits():
    number {

    return (
      this.filteredReportLogs
        .filter(
          log =>
            log.type ===
              'salida'
        )
        .length
    );

  }


  get reportSuccessRate():
    number {

    const total =
      this.filteredReportLogs
        .length;

    if (!total) {
      return 0;
    }

    return Math.round(
      (
        this.reportAllowed /
        total
      ) *
      100
    );

  }


// ==========================================================
// 10) ROLES
// ==========================================================

  get reportRoles():
    string[] {

    const values =
      this.reportAccessLogs
        .map(
          log =>
            String(
              log.role ||
              ''
            )
              .trim()
              .toLowerCase()
        )
        .filter(
          role =>
            !!role
        );


    this.accesses.forEach(
      user => {

        const role =
          String(
            user.role ||
            ''
          )
            .trim()
            .toLowerCase();

        if (role) {

          values.push(
            role
          );

        }

      }
    );


    return [
      ...new Set(
        values
      )
    ]
      .sort();

  }


  formatRoleName(
    role: string
  ): string {

    const value =
      String(
        role ||
        ''
      )
        .trim()
        .toLowerCase();


    switch (value) {

      case 'super-admin':
      case 'superadmin':
      case 'super_admin':

        return (
          'Super Administrador'
        );


      case 'administrador':

        return (
          'Administrador'
        );


      case 'vigilante':

        return (
          'Vigilante'
        );


      case 'aprendiz':

        return (
          'Aprendiz'
        );


      case 'instructor':

        return (
          'Instructor'
        );


      case 'visitante':

        return (
          'Visitante'
        );


      case 'usuario':

        return (
          'Usuario'
        );


      default:

        return (
          role ||
          'Sin rol'
        );

    }

  }


// ==========================================================
// 11) ICONOS
// ==========================================================

  getAccessMethodIcon(
    method: string
  ): string {

    const value =
      String(
        method ||
        ''
      )
        .trim()
        .toLowerCase();


    if (
      value.includes(
        'huella'
      ) ||
      value.includes(
        'finger'
      ) ||
      value.includes(
        'biometr'
      )
    ) {

      return (
        'fa-fingerprint'
      );

    }


    if (
      value.includes(
        'rfid'
      ) ||
      value.includes(
        'tarjeta'
      ) ||
      value.includes(
        'card'
      )
    ) {

      return (
        'fa-id-card'
      );

    }


    if (
      value.includes(
        'qr'
      )
    ) {

      return (
        'fa-qrcode'
      );

    }


    return (
      'fa-key'
    );

  }


// ==========================================================
// 12) LIMPIAR FILTROS
// ==========================================================

  resetReportFilters():
    void {

    this.reportSearch =
      '';

    this.reportFrom =
      '';

    this.reportTo =
      '';

    this.reportStatus =
      'todos';

    this.reportType =
      'todos';

    this.reportRole =
      'todos';

  }


// ==========================================================
// 13) FECHA PARA PANTALLA / EXPORTACIÓN
// ==========================================================

  formatReportDate(
    value: any
  ): string {

    const date =
      this.parseReportAccessDate(
        value
      );

    if (!date) {

      return (
        'Sin fecha'
      );

    }

    return date
      .toLocaleString(
        'es-CO',
        {
          dateStyle:
            'short',

          timeStyle:
            'medium'
        }
      );

  }


// ==========================================================
// 14) CSV
// ==========================================================

  private csvReportValue(
    value: any
  ): string {

    return `"${String(
      value ??
      ''
    )
      .replace(
        /"/g,
        '""'
      )}"`;

  }


  exportReportCsv():
    void {

    const logs =
      this.filteredReportLogs;


    if (!logs.length) {

      Swal.fire({
        icon: 'info',
        title: 'Sin registros',
        text:
          'No existen datos para exportar con los filtros actuales.'
      });

      return;

    }


    const headers = [
      'Fecha',
      'Usuario',
      'Correo',
      'Documento',
      'Rol',
      'Movimiento',
      'Método',
      'Dispositivo',
      'Estado'
    ];


    const rows =
      logs.map(
        log => [

          this.formatReportDate(
            log.date
          ),

          log.user,

          log.email,

          log.document,

          this.formatRoleName(
            log.role
          ),

          log.type ===
            'salida'
            ? 'Salida'
            : 'Entrada',

          log.method,

          log.device,

          log.allowed
            ? 'Permitido'
            : 'Denegado'

        ]
      );


    const csv =
      [
        headers,
        ...rows
      ]
        .map(
          row =>
            row
              .map(
                value =>
                  this.csvReportValue(
                    value
                  )
              )
              .join(';')
        )
        .join('\n');


    const blob =
      new Blob(
        [
          '\uFEFF',
          csv
        ],
        {
          type:
            'text/csv;charset=utf-8;'
        }
      );


    const url =
      URL.createObjectURL(
        blob
      );


    const link =
      document.createElement(
        'a'
      );


    const today =
      new Date()
        .toISOString()
        .slice(
          0,
          10
        );


    link.href =
      url;

    link.download =
      `segurentry-admin-reporte-${today}.csv`;


    document.body.appendChild(
      link
    );

    link.click();

    document.body.removeChild(
      link
    );

    URL.revokeObjectURL(
      url
    );

  }


// ==========================================================
// 15) SEGURIDAD HTML
// ==========================================================

  private escapeReportHtml(
    value: any
  ): string {

    return String(
      value ??
      ''
    )
      .replace(
        /&/g,
        '&amp;'
      )
      .replace(
        /</g,
        '&lt;'
      )
      .replace(
        />/g,
        '&gt;'
      )
      .replace(
        /"/g,
        '&quot;'
      )
      .replace(
        /'/g,
        '&#039;'
      );

  }


// ==========================================================
// 16) PDF / IMPRIMIR
// ==========================================================

  printReport():
    void {

    const logs =
      this.filteredReportLogs;


    const printWindow =
      window.open(
        '',
        '_blank',
        'width=1200,height=800'
      );


    if (!printWindow) {

      Swal.fire({
        icon: 'warning',
        title:
          'Ventana bloqueada',
        text:
          'Permite ventanas emergentes para generar el reporte.'
      });

      return;

    }


    const rows =
      logs
        .map(
          log => `

            <tr>

              <td>
                ${this.escapeReportHtml(
                  this.formatReportDate(
                    log.date
                  )
                )}
              </td>

              <td>
                ${this.escapeReportHtml(
                  log.user
                )}
              </td>

              <td>
                ${this.escapeReportHtml(
                  log.document
                )}
              </td>

              <td>
                ${this.escapeReportHtml(
                  this.formatRoleName(
                    log.role
                  )
                )}
              </td>

              <td>
                ${
                  log.type ===
                    'salida'
                    ? 'Salida'
                    : 'Entrada'
                }
              </td>

              <td>
                ${this.escapeReportHtml(
                  log.method ||
                  'No especificado'
                )}
              </td>

              <td>
                ${
                  log.allowed
                    ? 'Permitido'
                    : 'Denegado'
                }
              </td>

            </tr>

          `
        )
        .join('');


    printWindow.document
      .write(`

        <!DOCTYPE html>

        <html lang="es">

        <head>

          <meta charset="UTF-8">

          <title>
            Reporte SegurEntry
          </title>

          <style>

            body {
              font-family:
                Arial,
                sans-serif;

              padding:
                32px;

              color:
                #111827;
            }

            .header {
              border-bottom:
                3px solid
                #f97316;

              padding-bottom:
                16px;

              margin-bottom:
                24px;
            }

            h1 {
              margin:
                0 0 6px;

              font-size:
                24px;
            }

            p {
              color:
                #64748b;
            }

            .summary {
              display:
                grid;

              grid-template-columns:
                repeat(
                  4,
                  1fr
                );

              gap:
                12px;

              margin-bottom:
                24px;
            }

            .summary div {
              border:
                1px solid
                #e2e8f0;

              border-radius:
                8px;

              padding:
                14px;
            }

            .summary strong {
              display:
                block;

              font-size:
                22px;
            }

            .summary span {
              font-size:
                11px;

              color:
                #64748b;
            }

            table {
              width:
                100%;

              border-collapse:
                collapse;

              font-size:
                11px;
            }

            th,
            td {
              border:
                1px solid
                #e2e8f0;

              padding:
                8px;

              text-align:
                left;
            }

            th {
              background:
                #fff7ed;
            }

            .footer {
              margin-top:
                24px;

              font-size:
                10px;

              color:
                #64748b;
            }

          </style>

        </head>


        <body>

          <div class="header">

            <h1>
              SegurEntry
            </h1>

            <strong>
              Reporte de accesos
              · Administrador
            </strong>

            <p>
              Generado:
              ${this.escapeReportHtml(
                new Date()
                  .toLocaleString(
                    'es-CO'
                  )
              )}
            </p>

          </div>


          <div class="summary">

            <div>
              <strong>
                ${this.accesses.length}
              </strong>

              <span>
                Usuarios
              </span>
            </div>


            <div>
              <strong>
                ${logs.length}
              </strong>

              <span>
                Accesos
              </span>
            </div>


            <div>
              <strong>
                ${this.reportAllowed}
              </strong>

              <span>
                Permitidos
              </span>
            </div>


            <div>
              <strong>
                ${this.reportDenied}
              </strong>

              <span>
                Denegados
              </span>
            </div>

          </div>


          <table>

            <thead>

              <tr>
                <th>Fecha</th>
                <th>Usuario</th>
                <th>Documento</th>
                <th>Rol</th>
                <th>Movimiento</th>
                <th>Método</th>
                <th>Estado</th>
              </tr>

            </thead>


            <tbody>

              ${
                rows ||
                `
                  <tr>

                    <td
                      colspan="7"
                      style="text-align:center">

                      No existen registros.

                    </td>

                  </tr>
                `
              }

            </tbody>

          </table>


          <div class="footer">

            SegurEntry ·
            Reporte generado desde
            el panel Administrador

          </div>

        </body>

        </html>

      `);


    printWindow.document
      .close();

    printWindow.focus();


    // La versión mejorada de NotificationService
    // registra este evento para el SuperAdmin.
    this.notificationService
      .notifyReportGenerated({

        report_type:
          'Reporte de accesos - Administrador',

        records:
          logs.length,

        allowed:
          this.reportAllowed,

        denied:
          this.reportDenied,

        filters: {

          search:
            this.reportSearch,

          from:
            this.reportFrom,

          to:
            this.reportTo,

          status:
            this.reportStatus,

          movement:
            this.reportType,

          role:
            this.reportRole

        }

      })
      .subscribe({

        next: () => {

          console.log(
            'Reporte del Administrador notificado.'
          );

        },

        error:
          (error: any) => {

            // El PDF sigue funcionando aunque
            // falle solamente la notificación.
            console.error(
              'No se pudo registrar la notificación del reporte:',
              error
            );

          }

      });


    setTimeout(
      () => {

        printWindow.print();

      },
      300
    );

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


  // =========================================================
  // BIOMETRÍA — AUTO REFRESH
  // =========================================================

  private startBiometricAutoRefresh(): void {
    if (this.biometricRefreshTimer) {
      return;
    }

    this.biometricRefreshTimer = setInterval(() => {
      if (this.activeRoute === 'biometria') {
        this.loadBiometricUsers(true);
        this.loadBiometricDeviceStatus(true);
      }
    }, 5000);
  }

  private stopBiometricAutoRefresh(): void {
    if (!this.biometricRefreshTimer) {
      return;
    }

    clearInterval(this.biometricRefreshTimer);
    this.biometricRefreshTimer = null;
  }

  // =========================================================
  // BIOMETRÍA — CARGAR USUARIOS
  // =========================================================

  loadBiometricUsers(silent: boolean = false): void {
    if (!silent) {
      this.biometricLoading = true;
    }

    this.dashboardService.getBiometricUsers().subscribe({
      next: (res: any) => {
        const users = res?.users || [];

        this.biometricUsers = Array.isArray(users)
          ? users.map((user: any): BiometricUser => ({
              uid: user?.uid || user?.id || '',
              name: user?.name || 'Usuario',
              email: user?.email || '',
              document: String(user?.document || ''),
              document_type:
                user?.document_type ||
                user?.documentType ||
                '',
              role: user?.role || 'usuario',
              active: user?.active !== false,
              fingerprint_id:
                user?.fingerprint_id === null ||
                user?.fingerprint_id === undefined ||
                user?.fingerprint_id === ''
                  ? null
                  : Number(user.fingerprint_id),
              biometric_registered:
                user?.biometric_registered === true ||
                (
                  user?.fingerprint_id !== null &&
                  user?.fingerprint_id !== undefined &&
                  user?.fingerprint_id !== ''
                ),
              biometric_job: user?.biometric_job
                ? {
                    id: user.biometric_job.id || '',
                    status: user.biometric_job.status || '',
                    action: user.biometric_job.action || '',
                    message: user.biometric_job.message || '',
                    error: user.biometric_job.error || '',
                    fingerprint_id:
                      user.biometric_job.fingerprint_id ?? null
                  }
                : null
            }))
          : [];

        if (!silent) {
          this.biometricLoading = false;
        }
      },

      error: (err: any) => {
        console.error('ERROR CARGANDO BIOMETRÍA:', err);

        if (!silent) {
          this.biometricLoading = false;

          Swal.fire({
            icon: 'error',
            title: 'No se pudo cargar',
            text:
              err?.error?.message ||
              'No fue posible obtener los usuarios biométricos.'
          });
        }
      }
    });
  }

  // =========================================================
  // BIOMETRÍA — ESTADO DEL ESP32
  // =========================================================

  loadBiometricDeviceStatus(silent: boolean = false): void {
    this.dashboardService
      .getBiometricDeviceStatus('SEGURENTRY-ESP32')
      .subscribe({
        next: (res: any) => {
          const device = res?.device || {};

          this.biometricDevice = {
            device: device?.device || 'SEGURENTRY-ESP32',
            online: device?.online === true,
            last_seen: device?.last_seen || null,
            wifi_connected: device?.wifi_connected === true,
            sensor_available: device?.sensor_available === true,
            template_count:
              device?.template_count === null ||
              device?.template_count === undefined
                ? null
                : Number(device.template_count),
            ip: device?.ip || ''
          };
        },

        error: (err: any) => {
          console.error('ERROR ESTADO BIOMÉTRICO:', err);

          this.biometricDevice = {
            ...this.biometricDevice,
            online: false
          };

          if (!silent) {
            Swal.fire({
              icon: 'warning',
              title: 'ESP32 no disponible',
              text:
                'No fue posible consultar el estado del dispositivo biométrico.'
            });
          }
        }
      });
  }

  // =========================================================
  // BIOMETRÍA — FILTRO / MÉTRICAS
  // =========================================================

  get filteredBiometricUsers(): BiometricUser[] {
    const term = this.biometricSearch.trim().toLowerCase();

    if (!term) {
      return this.biometricUsers;
    }

    return this.biometricUsers.filter((user: BiometricUser) => {
      const searchable = [
        user.name,
        user.email,
        user.document,
        user.document_type,
        user.role,
        user.uid,
        user.fingerprint_id
      ]
        .join(' ')
        .toLowerCase();

      return searchable.includes(term);
    });
  }

  get biometricRegisteredCount(): number {
    return this.biometricUsers.filter(
      user => user.biometric_registered
    ).length;
  }

  get biometricPendingCount(): number {
    return this.biometricUsers.filter(
      user => !!user.biometric_job
    ).length;
  }

  get biometricProtectedCount(): number {
    return this.biometricUsers.filter(
      user =>
        this.isBiometricProtectedUser(user) &&
        user.biometric_registered
    ).length;
  }

  // =========================================================
  // BIOMETRÍA — PERMISOS
  // =========================================================

  isBiometricProtectedUser(user: BiometricUser): boolean {
    return this.isProtectedRole(user.role);
  }

  canRegisterFingerprint(user: BiometricUser): boolean {
    return (
      this.biometricDevice.online === true &&
      this.biometricDevice.sensor_available === true &&
      user.active === true &&
      user.biometric_registered === false &&
      !user.biometric_job &&
      this.biometricActionInProgress === false
    );
  }

  canModifyFingerprint(user: BiometricUser): boolean {
    return (
      !this.isBiometricProtectedUser(user) &&
      user.active === true &&
      user.biometric_registered === true &&
      user.fingerprint_id !== null &&
      !user.biometric_job &&
      this.biometricDevice.online === true &&
      this.biometricDevice.sensor_available === true &&
      this.biometricActionInProgress === false
    );
  }

  canDeleteFingerprint(user: BiometricUser): boolean {
    return (
      !this.isBiometricProtectedUser(user) &&
      user.biometric_registered === true &&
      user.fingerprint_id !== null &&
      !user.biometric_job &&
      this.biometricDevice.online === true &&
      this.biometricDevice.sensor_available === true &&
      this.biometricActionInProgress === false
    );
  }

  // =========================================================
  // BIOMETRÍA — LABELS
  // =========================================================

  getBiometricStatusLabel(user: BiometricUser): string {
    if (user.biometric_job) {
      const action = String(
        user.biometric_job.action || ''
      )
        .trim()
        .toLowerCase();

      const status = String(
        user.biometric_job.status || ''
      )
        .trim()
        .toLowerCase();

      if (action === 'delete') {
        return status === 'processing'
          ? 'Eliminando...'
          : 'Eliminación pendiente';
      }

      return status === 'processing'
        ? 'Registrando...'
        : 'Registro pendiente';
    }

    if (
      user.biometric_registered &&
      user.fingerprint_id !== null
    ) {
      return 'Huella ID ' + String(user.fingerprint_id);
    }

    return 'Sin registrar';
  }

  getBiometricJobLabel(job: BiometricJob | null): string {
    if (!job) {
      return '';
    }

    const action = String(job.action || '')
      .trim()
      .toLowerCase();

    const status = String(job.status || '')
      .trim()
      .toLowerCase();

    if (action === 'delete') {
      switch (status) {
        case 'pending':
          return 'Esperando eliminación';
        case 'processing':
          return 'Liberando huella';
        case 'completed':
          return 'Huella eliminada';
        case 'failed':
          return 'Falló la eliminación';
      }
    }

    switch (status) {
      case 'pending':
        return 'Esperando al ESP32';
      case 'processing':
        return 'Capturando huella';
      case 'completed':
        return 'Registro completado';
      case 'failed':
        return 'Falló el registro';
      default:
        return status || '';
    }
  }

  // =========================================================
  // BIOMETRÍA — CREAR
  // =========================================================

  startBiometricEnrollment(user: BiometricUser): void {
    if (user.biometric_registered) {
      Swal.fire({
        icon: 'info',
        title: 'Huella registrada',
        text: 'Este usuario ya tiene una huella asociada.'
      });
      return;
    }

    if (!user.active) {
      Swal.fire({
        icon: 'warning',
        title: 'Usuario inactivo',
        text:
          'Activa la cuenta antes de registrar una huella.'
      });
      return;
    }

    if (
      !this.biometricDevice.online ||
      !this.biometricDevice.sensor_available
    ) {
      Swal.fire({
        icon: 'warning',
        title: 'ESP32 no disponible',
        text:
          'Verifica que el ESP32 esté conectado y que el AS608 esté disponible.'
      });

      this.loadBiometricDeviceStatus();
      return;
    }

    if (this.biometricActionInProgress) {
      return;
    }

    Swal.fire({
      icon: 'question',
      title: 'Registrar huella',
      text:
        'Se iniciará el registro biométrico de ' +
        user.name +
        '. Sigue las instrucciones de la OLED.',
      showCancelButton: true,
      confirmButtonText: 'Registrar huella',
      cancelButtonText: 'Cancelar'
    }).then(result => {
      if (!result.isConfirmed) {
        return;
      }

      this.biometricActionInProgress = true;

      const actorUid =
        this.currentUser?.uid ||
        this.profile.uid ||
        '';

      this.dashboardService
        .createBiometricEnrollment(
          user.uid,
          actorUid,
          'SEGURENTRY-ESP32'
        )
        .subscribe({
          next: (res: any) => {
            const jobId = res?.job?.id || '';

            if (!jobId) {
              this.biometricActionInProgress = false;

              Swal.fire({
                icon: 'error',
                title: 'Error',
                text:
                  'Django no devolvió el ID del proceso biométrico.'
              });

              return;
            }

            Swal.fire({
              title: 'Registro en curso',
              text:
                'Ve al lector AS608 y sigue las instrucciones mostradas en la OLED.',
              allowOutsideClick: false,
              allowEscapeKey: false,
              showConfirmButton: false,
              didOpen: () => {
                Swal.showLoading();
              }
            });

            this.watchBiometricJob(
              jobId,
              user,
              'enroll'
            );

            this.loadBiometricUsers(true);
          },

          error: (err: any) => {
            this.biometricActionInProgress = false;

            Swal.fire({
              icon: 'error',
              title: 'No se pudo iniciar',
              text:
                err?.error?.message ||
                'No fue posible crear el proceso biométrico.'
            });

            this.loadBiometricUsers(true);
          }
        });
    });
  }

  // =========================================================
  // BIOMETRÍA — MODIFICAR
  // =========================================================

  replaceBiometricFingerprint(user: BiometricUser): void {
    if (this.isBiometricProtectedUser(user)) {
      Swal.fire({
        icon: 'warning',
        title: 'Huella protegida',
        text:
          'El Administrador no puede modificar huellas de Administradores ni Super Administradores.'
      });
      return;
    }

    if (
      !user.biometric_registered ||
      user.fingerprint_id === null
    ) {
      this.startBiometricEnrollment(user);
      return;
    }

    if (
      !this.biometricDevice.online ||
      !this.biometricDevice.sensor_available
    ) {
      Swal.fire({
        icon: 'warning',
        title: 'ESP32 no disponible',
        text:
          'Para cambiar la huella, el ESP32 y el AS608 deben estar disponibles.'
      });
      return;
    }

    if (this.biometricActionInProgress) {
      return;
    }

    Swal.fire({
      icon: 'question',
      title: 'Cambiar huella',
      text:
        'Primero se eliminará la huella ID ' +
        String(user.fingerprint_id) +
        ' y después se registrará la nueva huella de ' +
        user.name +
        '.',
      showCancelButton: true,
      confirmButtonText: 'Cambiar huella',
      cancelButtonText: 'Cancelar'
    }).then(result => {
      if (!result.isConfirmed) {
        return;
      }

      this.startFingerprintDeletionJob(
        user,
        true
      );
    });
  }

  // =========================================================
  // BIOMETRÍA — ELIMINAR
  // =========================================================

  deleteBiometricFingerprint(user: BiometricUser): void {
    if (this.isBiometricProtectedUser(user)) {
      Swal.fire({
        icon: 'warning',
        title: 'Huella protegida',
        text:
          'El Administrador no puede eliminar huellas de Administradores ni Super Administradores.'
      });
      return;
    }

    if (
      !user.biometric_registered ||
      user.fingerprint_id === null
    ) {
      Swal.fire({
        icon: 'info',
        title: 'Sin huella',
        text:
          'Este usuario no tiene una huella registrada.'
      });
      return;
    }

    if (
      !this.biometricDevice.online ||
      !this.biometricDevice.sensor_available
    ) {
      Swal.fire({
        icon: 'warning',
        title: 'ESP32 no disponible',
        text:
          'Para eliminar la huella física, el ESP32 y el AS608 deben estar disponibles.'
      });
      return;
    }

    if (this.biometricActionInProgress) {
      return;
    }

    Swal.fire({
      icon: 'warning',
      title: 'Eliminar huella',
      text:
        'Se eliminará la huella ID ' +
        String(user.fingerprint_id) +
        ' de ' +
        user.name +
        '. El usuario seguirá existiendo en SegurEntry.',
      showCancelButton: true,
      confirmButtonText: 'Eliminar huella',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#ef4444'
    }).then(result => {
      if (!result.isConfirmed) {
        return;
      }

      this.startFingerprintDeletionJob(
        user,
        false
      );
    });
  }

  private startFingerprintDeletionJob(
    user: BiometricUser,
    replaceAfterDelete: boolean
  ): void {
    if (this.isBiometricProtectedUser(user)) {
      Swal.fire({
        icon: 'warning',
        title: 'Acción bloqueada',
        text:
          'Esta huella está protegida para el rol Administrador.'
      });
      return;
    }

    this.biometricActionInProgress = true;

    const actorUid =
      this.currentUser?.uid ||
      this.profile.uid ||
      '';

    Swal.fire({
      title:
        replaceAfterDelete
          ? 'Preparando cambio'
          : 'Eliminando huella',
      text:
        'El ESP32 está liberando la huella del sensor AS608.',
      allowOutsideClick: false,
      allowEscapeKey: false,
      showConfirmButton: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    this.dashboardService
      .deleteBiometricFingerprint(
        user.uid,
        actorUid,
        'SEGURENTRY-ESP32'
      )
      .subscribe({
        next: (res: any) => {
          const jobId = res?.job?.id || '';

          if (!jobId) {
            this.biometricActionInProgress = false;

            Swal.fire({
              icon: 'info',
              title: 'Sin huella',
              text:
                'No existe una huella asociada que deba eliminarse.'
            });

            this.loadBiometricUsers(true);
            return;
          }

          this.watchBiometricJob(
            jobId,
            user,
            replaceAfterDelete
              ? 'replace-delete'
              : 'delete'
          );

          this.loadBiometricUsers(true);
        },

        error: (err: any) => {
          this.biometricActionInProgress = false;

          Swal.fire({
            icon: 'error',
            title: 'No se pudo eliminar',
            text:
              err?.error?.message ||
              'No fue posible iniciar la eliminación biométrica.'
          });

          this.loadBiometricUsers(true);
        }
      });
  }

  private startReplacementEnrollment(
    user: BiometricUser
  ): void {
    const actorUid =
      this.currentUser?.uid ||
      this.profile.uid ||
      '';

    Swal.fire({
      title: 'Registra la nueva huella',
      text:
        'La huella anterior ya fue liberada. Sigue las instrucciones de la OLED para registrar la nueva huella de ' +
        user.name +
        '.',
      allowOutsideClick: false,
      allowEscapeKey: false,
      showConfirmButton: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    this.dashboardService
      .createBiometricEnrollment(
        user.uid,
        actorUid,
        'SEGURENTRY-ESP32'
      )
      .subscribe({
        next: (res: any) => {
          const jobId = res?.job?.id || '';

          if (!jobId) {
            this.biometricActionInProgress = false;

            Swal.fire({
              icon: 'error',
              title: 'Error',
              text:
                'Django no devolvió el ID del nuevo proceso biométrico.'
            });

            return;
          }

          this.watchBiometricJob(
            jobId,
            user,
            'replace-enroll'
          );

          this.loadBiometricUsers(true);
        },

        error: (err: any) => {
          this.biometricActionInProgress = false;

          Swal.fire({
            icon: 'warning',
            title: 'Huella anterior eliminada',
            text:
              err?.error?.message ||
              'La huella anterior fue eliminada, pero no fue posible iniciar el nuevo registro.'
          });

          this.loadBiometricUsers(true);
        }
      });
  }

  // =========================================================
  // BIOMETRÍA — WATCHER DE JOBS
  // =========================================================

  private watchBiometricJob(
    jobId: string,
    user: BiometricUser,
    mode:
      'enroll' |
      'delete' |
      'replace-delete' |
      'replace-enroll'
  ): void {
    this.stopBiometricJobWatch();

    this.activeBiometricJobId = jobId;

    const checkJob = () => {
      if (this.biometricJobRequestInProgress) {
        return;
      }

      this.biometricJobRequestInProgress = true;

      this.dashboardService
        .getBiometricJob(jobId)
        .subscribe({
          next: (res: any) => {
            this.biometricJobRequestInProgress = false;

            const job = res?.job || {};

            const status = String(job?.status || '')
              .trim()
              .toLowerCase();

            if (status === 'completed') {
              this.stopBiometricJobWatch();

              this.loadBiometricUsers(true);
              this.loadBiometricDeviceStatus(true);

              if (mode === 'replace-delete') {
                this.startReplacementEnrollment(user);
                return;
              }

              this.biometricActionInProgress = false;

              if (mode === 'delete') {
                Swal.fire({
                  icon: 'success',
                  title: 'Huella eliminada',
                  text:
                    'La huella de ' +
                    user.name +
                    ' fue eliminada del AS608 y el ID quedó disponible.',
                  timer: 2200,
                  showConfirmButton: false
                });
                return;
              }

              if (mode === 'replace-enroll') {
                Swal.fire({
                  icon: 'success',
                  title: 'Huella modificada',
                  text:
                    'La nueva huella de ' +
                    user.name +
                    ' fue registrada correctamente.',
                  timer: 2300,
                  showConfirmButton: false
                });
                return;
              }

              Swal.fire({
                icon: 'success',
                title: 'Huella registrada',
                text:
                  'La huella de ' +
                  user.name +
                  ' fue registrada y sincronizada correctamente.',
                timer: 2200,
                showConfirmButton: false
              });

              return;
            }

            if (status === 'failed') {
              this.stopBiometricJobWatch();
              this.biometricActionInProgress = false;

              Swal.fire({
                icon: 'error',
                title: 'Proceso biométrico fallido',
                text:
                  job?.error ||
                  job?.message ||
                  'El ESP32 no pudo completar la operación biométrica.'
              });

              this.loadBiometricUsers(true);
              this.loadBiometricDeviceStatus(true);
              return;
            }

            this.loadBiometricUsers(true);
          },

          error: (err: any) => {
            this.biometricJobRequestInProgress = false;

            console.error(
              'ERROR CONSULTANDO JOB BIOMÉTRICO:',
              err
            );
          }
        });
    };

    checkJob();

    this.biometricJobTimer = setInterval(
      checkJob,
      1500
    );
  }

  private stopBiometricJobWatch(): void {
    if (this.biometricJobTimer) {
      clearInterval(this.biometricJobTimer);
      this.biometricJobTimer = null;
    }

    this.activeBiometricJobId = null;
    this.biometricJobRequestInProgress = false;
  }

  // =========================================================
  // BIOMETRÍA — UTILIDADES
  // =========================================================

  formatBiometricLastSeen(): string {
    if (!this.biometricDevice.last_seen) {
      return 'Sin conexión registrada';
    }

    const date = new Date(
      this.biometricDevice.last_seen
    );

    if (isNaN(date.getTime())) {
      return String(
        this.biometricDevice.last_seen
      );
    }

    return date.toLocaleString(
      'es-CO',
      {
        dateStyle: 'short',
        timeStyle: 'medium'
      }
    );
  }

  trackByBiometricUser(
    index: number,
    user: BiometricUser
  ): string {
    return user.uid || String(index);
  }


}