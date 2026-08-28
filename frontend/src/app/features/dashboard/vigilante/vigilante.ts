import {
  Component,
  OnDestroy,
  OnInit
} from '@angular/core';

import {
  CommonModule
} from '@angular/common';

import {
  FormsModule
} from '@angular/forms';

import {
  Router
} from '@angular/router';

import {
  Subscription
} from 'rxjs';

import Swal from 'sweetalert2';

import {
  FirestoreService
} from '../../../core/services/firestore.service';

import {
  DashboardService
} from '../../../core/services/dashboard.service';

import {
  AuthService
} from '../../../core/services/auth.service';

import {
  NotificationService
} from '../../../core/services/notification.service';


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
  allowed?: boolean;
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


interface BiometricUser {
  uid?: string;
  id?: string;
  name: string;
  email?: string;
  document?: string;
  role?: string;
  active?: boolean;
}


interface VigilanteNotification {
  id: string;
  title: string;
  message: string;
  type: string;
  category: string;
  priority: string;
  read: boolean;
  created_at: string;
  source?: string;
  data?: any;
}


@Component({
  selector: 'app-vigilante',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl: './vigilante.html',
  styleUrls: [
    './vigilante.css'
  ]
})
export class VigilanteComponent
  implements OnInit, OnDestroy {

  menuOpen = true;

  // El Vigilante inicia en su Dashboard personal.
  activeSection = 'dashboard';

  showForm = false;
  editMode = false;


  // =========================================================
  // ACCESOS
  // =========================================================

  accesses:
    Access[] =
      [];

  search =
    '';

  totalIngresos = 0;
  totalSalidas = 0;
  accesosHoy:
    Access[] =
      [];


  // =========================================================
  // DASHBOARD PERSONAL DEL VIGILANTE
  // =========================================================

  myAccesses:
    Access[] =
      [];

  myIngresosToday = 0;
  mySalidasToday = 0;
  myMovementsToday = 0;
  myLastMovement:
    Access | null =
      null;


  // =========================================================
  // PERFIL
  // =========================================================

  currentUser:
    any =
      null;

  selectedPhoto:
    File | null =
      null;

  profile = {
    name: '',
    email: '',
    phone: '',
    address: '',
    documentType: '',
    document: '',
    photo: 'assets/avatar.png'
  };


  // =========================================================
  // USUARIOS TEMPORALES
  // =========================================================

  temporaryRequests:
    TemporaryRequest[] =
      [];

  loadingRequests =
    false;

  requestFilter:
    'todas' |
    'pendiente' |
    'aprobada' |
    'rechazada' =
      'todas';


  // =========================================================
  // NOTIFICACIONES
  // =========================================================

  notifications:
    VigilanteNotification[] =
      [];

  unreadNotifications =
    0;

  notificationsLoading =
    false;

  notificationFilter:
    'todas' |
    'no_leidas' |
    'leidas' =
      'todas';

  notificationSearch =
    '';

  private notificationSubscriptions:
    Subscription[] =
      [];


  // =========================================================
  // BIOMETRÍA
  // =========================================================

  biometricUsers:
    BiometricUser[] =
      [];

  biometricSearch =
    '';

  showBiometricModal =
    false;

  selectedBiometricUser:
    BiometricUser | null =
      null;


  // =========================================================
  // FORMULARIO TEMPORAL
  // =========================================================

  form:
    Access = {
      id: '',
      name: '',
      email: '',
      document: '',
      role: '',
      status: '',
      tempAccess: false,
      expirationDate: null
    };


  constructor(
    private router:
      Router,

    private firestoreService:
      FirestoreService,

    private dashboardService:
      DashboardService,

    private authService:
      AuthService,

    private notificationService:
      NotificationService
  ) {}


  // =========================================================
  // INIT
  // =========================================================

  ngOnInit():
    void {

    this.bindNotificationState();

    this.loadProfile();
    this.loadAccessLogs();
    this.loadTemporaryRequests();
    this.loadBiometricUsers();
    this.loadNotifications();

  }


  ngOnDestroy():
    void {

    this.notificationSubscriptions
      .forEach(
        subscription =>
          subscription.unsubscribe()
      );

  }


  // =========================================================
  // NAVEGACIÓN
  // =========================================================

  setSection(
    section:
      string
  ):
    void {

    this.activeSection =
      section;

    this.showForm =
      false;

    this.resetForm();

    if (
      section ===
      'dashboard'
    ) {

      this.calculatePersonalDashboard();

    }

    if (
      section ===
      'accesses'
    ) {

      // Se reutilizan los accesos ya cargados.
      // No hacemos polling automático para evitar
      // lecturas innecesarias de Firestore.
      this.calculateAccessStats();

    }

    if (
      section ===
      'notifications'
    ) {

      this.loadNotifications();

    }

  }


  toggleMenu():
    void {

    this.menuOpen =
      !this.menuOpen;

  }


  // =========================================================
  // ACCESOS — TODOS LOS USUARIOS
  // =========================================================

  loadAccessLogs():
    void {

    this.dashboardService
      .getAccesses()
      .subscribe({

        next: (
          res:
            any
        ) => {

          const logs =
            res?.accesses ||
            res?.access ||
            res?.logs ||
            res?.results ||
            res ||
            [];

          this.accesses =
            Array.isArray(
              logs
            )
              ? logs.map(
                  (
                    access:
                      any
                  ):
                    Access => {

                    const rawType =
                      String(
                        access?.type ||
                        access?.movement ||
                        access?.access_type ||
                        ''
                      )
                        .trim()
                        .toLowerCase();

                    const type:
                      'entrada' |
                      'salida' =
                        (
                          rawType ===
                            'salida'
                          ||
                          rawType ===
                            'exit'
                          ||
                          rawType.includes(
                            'sal'
                          )
                        )
                          ? 'salida'
                          : 'entrada';

                    const rawStatus =
                      String(
                        access?.status ||
                        ''
                      )
                        .trim()
                        .toLowerCase();

                    const allowed =
                      access?.allowed ===
                        true
                      ||
                      access?.granted ===
                        true
                      ||
                      rawStatus.includes(
                        'permit'
                      )
                      ||
                      rawStatus.includes(
                        'author'
                      );

                    return {

                      id:
                        String(
                          access?.id ||
                          ''
                        ),

                      uid:
                        String(
                          access?.uid ||
                          access?.user_id ||
                          access?.user_uid ||
                          ''
                        ),

                      name:
                        access?.user ||
                        access?.name ||
                        access?.user_name ||
                        'Usuario desconocido',

                      role:
                        access?.role ||
                        '',

                      email:
                        access?.email ||
                        access?.user_email ||
                        '',

                      document:
                        String(
                          access?.document ||
                          access?.user_document ||
                          ''
                        ),

                      status:
                        access?.status ||
                        '',

                      type:
                        type,

                      date:
                        access?.date ||
                        access?.created_at ||
                        access?.timestamp ||
                        '',

                      method:
                        access?.method ||
                        access?.access_method ||
                        '',

                      device:
                        access?.device ||
                        access?.device_name ||
                        '',

                      allowed:
                        allowed,

                      tempAccess:
                        access?.tempAccess ===
                        true,

                      expirationDate:
                        access?.expirationDate ||
                        access?.expires_at ||
                        null

                    };

                  }
                )
                .sort(
                  (
                    a:
                      Access,
                    b:
                      Access
                  ) => {

                    return (
                      this.parseDate(
                        b.date
                      )
                        ?.getTime() ||
                      0
                    )
                    -
                    (
                      this.parseDate(
                        a.date
                      )
                        ?.getTime() ||
                      0
                    );

                  }
                )
              : [];

          this.calculateAccessStats();
          this.calculatePersonalDashboard();

        },

        error: (
          err:
            any
        ) => {

          console.error(
            'ERROR CARGANDO ACCESOS:',
            err
          );

        }

      });

  }


  refreshAccesses():
    void {

    this.loadAccessLogs();

  }


  filteredAccesses():
    Access[] {

    const normalized =
      this.normalizeSearch(
        this.search
      );

    if (!normalized) {
      return this.accesses;
    }

    const terms =
      normalized
        .split(
          /\s+/
        )
        .filter(
          Boolean
        );

    return this.accesses
      .filter(
        (
          access:
            Access
        ) => {

          const searchable =
            this.normalizeSearch(
              [
                access.name,
                access.document,
                access.email,
                access.role,
                access.type,
                access.status,
                access.method,
                access.device
              ]
                .join(
                  ' '
                )
            );

          return terms.every(
            term =>
              searchable.includes(
                term
              )
          );

        }
      );

  }


  calculateAccessStats():
    void {

    const today =
      new Date();

    const todayLogs =
      this.accesses
        .filter(
          (
            access:
              Access
          ) => {

            const date =
              this.parseDate(
                access.date
              );

            if (!date) {
              return false;
            }

            return this.isSameDay(
              date,
              today
            );

          }
        );

    this.accesosHoy =
      todayLogs;

    this.totalIngresos =
      todayLogs
        .filter(
          access =>
            access.type ===
            'entrada'
        )
        .length;

    this.totalSalidas =
      todayLogs
        .filter(
          access =>
            access.type ===
            'salida'
        )
        .length;

  }


  // =========================================================
  // DASHBOARD — SOLO ACCESOS DEL VIGILANTE
  // =========================================================

  calculatePersonalDashboard():
    void {

    if (
      !this.currentUser
    ) {

      this.myAccesses =
        [];

      this.myIngresosToday =
        0;

      this.mySalidasToday =
        0;

      this.myMovementsToday =
        0;

      this.myLastMovement =
        null;

      return;

    }

    this.myAccesses =
      this.accesses
        .filter(
          (
            access:
              Access
          ) =>
            this.accessBelongsToCurrentUser(
              access
            )
        );

    const today =
      new Date();

    const todayPersonal =
      this.myAccesses
        .filter(
          (
            access:
              Access
          ) => {

            const date =
              this.parseDate(
                access.date
              );

            return (
              !!date &&
              this.isSameDay(
                date,
                today
              )
            );

          }
        );

    this.myIngresosToday =
      todayPersonal
        .filter(
          access =>
            access.type ===
            'entrada'
        )
        .length;

    this.mySalidasToday =
      todayPersonal
        .filter(
          access =>
            access.type ===
            'salida'
        )
        .length;

    this.myMovementsToday =
      todayPersonal.length;

    this.myLastMovement =
      this.myAccesses.length > 0
        ? this.myAccesses[0]
        : null;

  }


  private accessBelongsToCurrentUser(
    access:
      Access
  ):
    boolean {

    const myUid =
      String(
        this.currentUser?.uid ||
        this.currentUser?.id ||
        ''
      )
        .trim();

    const accessUid =
      String(
        access?.uid ||
        ''
      )
        .trim();

    // UID tiene prioridad siempre que ambos existan.
    if (
      myUid &&
      accessUid
    ) {

      return (
        myUid ===
        accessUid
      );

    }

    const myEmail =
      String(
        this.currentUser?.email ||
        this.profile.email ||
        ''
      )
        .trim()
        .toLowerCase();

    const accessEmail =
      String(
        access?.email ||
        ''
      )
        .trim()
        .toLowerCase();

    if (
      myEmail &&
      accessEmail &&
      myEmail ===
        accessEmail
    ) {
      return true;
    }

    const myDocument =
      String(
        this.currentUser?.document ||
        this.profile.document ||
        ''
      )
        .trim();

    const accessDocument =
      String(
        access?.document ||
        ''
      )
        .trim();

    return (
      !!myDocument &&
      !!accessDocument &&
      myDocument ===
        accessDocument
    );

  }


  get recentMyAccesses():
    Access[] {

    return this.myAccesses
      .slice(
        0,
        8
      );

  }


  // =========================================================
  // NOTIFICACIONES
  // =========================================================

  private bindNotificationState():
    void {

    this.notificationSubscriptions
      .push(

        this.notificationService
          .getNotifications()
          .subscribe(
            (
              notifications:
                any[]
            ) => {

              this.notifications =
                Array.isArray(
                  notifications
                )
                  ? notifications.map(
                      (
                        notification:
                          any
                      ):
                        VigilanteNotification => ({

                        id:
                          String(
                            notification?.id ||
                            ''
                          ),

                        title:
                          notification?.title ||
                          'Notificación',

                        message:
                          notification?.message ||
                          '',

                        type:
                          notification?.type ||
                          'general',

                        category:
                          notification?.category ||
                          'system',

                        priority:
                          notification?.priority ||
                          'normal',

                        read:
                          notification?.read ===
                          true,

                        created_at:
                          notification?.created_at ||
                          notification?.createdAt ||
                          '',

                        source:
                          notification?.source ||
                          '',

                        data:
                          notification?.data ||
                          null

                      })
                    )
                    .sort(
                      (
                        a:
                          VigilanteNotification,
                        b:
                          VigilanteNotification
                      ) => {

                        return (
                          this.parseDate(
                            b.created_at
                          )
                            ?.getTime() ||
                          0
                        )
                        -
                        (
                          this.parseDate(
                            a.created_at
                          )
                            ?.getTime() ||
                          0
                        );

                      }
                    )
                  : [];

            }
          )
      );


    this.notificationSubscriptions
      .push(

        this.notificationService
          .getUnreadCount()
          .subscribe(
            (
              count:
                number
            ) => {

              this.unreadNotifications =
                Number(
                  count ||
                  0
                );

            }
          )
      );


    this.notificationSubscriptions
      .push(

        this.notificationService
          .loading$
          .subscribe(
            (
              loading:
                boolean
            ) => {

              this.notificationsLoading =
                loading;

            }
          )
      );

  }


  loadNotifications():
    void {

    this.notificationService
      .loadNotifications();

  }


  markNotificationAsRead(
    notification:
      VigilanteNotification
  ):
    void {

    if (
      !notification?.id ||
      notification.read
    ) {
      return;
    }

    this.notificationService
      .markAsRead(
        notification.id
      );

  }


  markAllNotificationsAsRead():
    void {

    if (
      this.unreadNotifications <=
      0
    ) {
      return;
    }

    this.notificationService
      .markAllAsRead();

  }


  filteredNotifications():
    VigilanteNotification[] {

    const search =
      this.normalizeSearch(
        this.notificationSearch
      );

    return this.notifications
      .filter(
        (
          notification:
            VigilanteNotification
        ) => {

          if (
            this.notificationFilter ===
              'no_leidas'
            &&
            notification.read
          ) {
            return false;
          }

          if (
            this.notificationFilter ===
              'leidas'
            &&
            !notification.read
          ) {
            return false;
          }

          if (!search) {
            return true;
          }

          const searchable =
            this.normalizeSearch(
              [
                notification.title,
                notification.message,
                notification.type,
                notification.category,
                notification.source
              ]
                .join(
                  ' '
                )
            );

          const terms =
            search
              .split(
                /\s+/
              )
              .filter(
                Boolean
              );

          return terms.every(
            term =>
              searchable.includes(
                term
              )
          );

        }
      );

  }


  getReadNotificationsCount():
    number {

    return this.notifications
      .filter(
        notification =>
          notification.read
      )
      .length;

  }


  getNotificationIcon(
    notification:
      VigilanteNotification
  ):
    string {

    const type =
      String(
        notification?.type ||
        ''
      )
        .toLowerCase();

    const category =
      String(
        notification?.category ||
        ''
      )
        .toLowerCase();

    if (
      type.includes(
        'access_entry'
      )
      ||
      type.includes(
        'entry'
      )
    ) {
      return 'fa-right-to-bracket';
    }

    if (
      type.includes(
        'access_exit'
      )
      ||
      type.includes(
        'exit'
      )
    ) {
      return 'fa-right-from-bracket';
    }

    if (
      type.includes(
        'temporary'
      )
    ) {
      return 'fa-user-clock';
    }

    if (
      type.includes(
        'account'
      )
      ||
      category.includes(
        'account'
      )
    ) {
      return 'fa-user-shield';
    }

    if (
      type.includes(
        'fingerprint'
      )
      ||
      category.includes(
        'biometric'
      )
    ) {
      return 'fa-fingerprint';
    }

    return 'fa-bell';

  }


  getNotificationTone(
    notification:
      VigilanteNotification
  ):
    string {

    const type =
      String(
        notification?.type ||
        ''
      )
        .toLowerCase();

    const priority =
      String(
        notification?.priority ||
        ''
      )
        .toLowerCase();

    if (
      priority ===
        'high'
      ||
      type.includes(
        'failed'
      )
      ||
      type.includes(
        'denied'
      )
    ) {
      return 'danger';
    }

    if (
      type.includes(
        'exit'
      )
    ) {
      return 'orange';
    }

    if (
      type.includes(
        'temporary'
      )
    ) {
      return 'blue';
    }

    return 'green';

  }


  // =========================================================
  // USUARIOS TEMPORALES
  // =========================================================

  openForm():
    void {

    this.resetForm();

    this.showForm =
      true;

  }


  closeForm():
    void {

    this.resetForm();

    this.showForm =
      false;

  }


  resetForm():
    void {

    this.form = {
      id: '',
      name: '',
      email: '',
      document: '',
      role: '',
      status: '',
      tempAccess:
        this.activeSection ===
        'temporary',
      expirationDate: null,
      reason: ''
    };

    this.editMode =
      false;

  }


  saveAccess():
    void {

    if (
      this.activeSection ===
      'temporary'
    ) {

      this.createTemporaryRequest();

      return;

    }

  }


  createTemporaryRequest():
    void {

    if (
      !this.form.name?.trim()
    ) {

      Swal.fire(
        'Campo obligatorio',
        'El nombre del visitante es obligatorio.',
        'warning'
      );

      return;

    }

    if (
      !this.form.email?.trim()
    ) {

      Swal.fire(
        'Campo obligatorio',
        'El correo electrónico es obligatorio.',
        'warning'
      );

      return;

    }

    if (
      !this.form.document?.trim()
    ) {

      Swal.fire(
        'Campo obligatorio',
        'El documento es obligatorio.',
        'warning'
      );

      return;

    }

    if (
      !this.form.reason?.trim()
    ) {

      Swal.fire(
        'Motivo requerido',
        'Debes indicar el motivo por el cual se solicita el acceso temporal.',
        'warning'
      );

      return;

    }

    if (
      !this.form.expirationDate
    ) {

      Swal.fire(
        'Duración requerida',
        'Debes seleccionar la duración del acceso temporal.',
        'warning'
      );

      return;

    }

    const firebaseUser =
      this.authService
        .getUser();

    if (
      !firebaseUser
    ) {

      Swal.fire(
        'Sesión no válida',
        'No se pudo identificar al vigilante que realiza la solicitud.',
        'error'
      );

      return;

    }

    const durationHours =
      Number(
        this.form.expirationDate
      );

    const data = {

      name:
        this.form.name.trim(),

      email:
        this.form.email.trim(),

      document:
        this.form.document.trim(),

      reason:
        this.form.reason.trim(),

      requestedBy:
        firebaseUser.uid ||
        '',

      requestedByEmail:
        firebaseUser.email ||
        '',

      status:
        'pendiente',

      durationHours:
        durationHours

    };

    this.dashboardService
      .createTemporaryRequest(
        data
      )
      .subscribe({

        next:
          () => {

            Swal.fire({
              icon:
                'success',
              title:
                'Solicitud enviada',
              text:
                'La solicitud fue enviada al administrador para su aprobación.',
              timer:
                2200,
              showConfirmButton:
                false
            });

            this.closeForm();

            this.loadTemporaryRequests();

          },

        error:
          (
            err:
              any
          ) => {

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


  loadTemporaryRequests():
    void {

    this.loadingRequests =
      true;

    this.dashboardService
      .getTemporaryRequests()
      .subscribe({

        next:
          (
            res:
              any
          ) => {

            const requests =
              res?.requests ||
              res ||
              [];

            this.temporaryRequests =
              Array.isArray(
                requests
              )
                ? requests.map(
                    (
                      request:
                        any
                    ):
                      TemporaryRequest => ({

                      id:
                        request?.id ||
                        '',

                      name:
                        request?.name ||
                        '',

                      email:
                        request?.email ||
                        '',

                      document:
                        request?.document ||
                        '',

                      reason:
                        request?.reason ||
                        request?.motivo ||
                        'Sin motivo registrado',

                      requestedBy:
                        request?.requestedBy ||
                        request?.requested_by ||
                        '',

                      requestedByEmail:
                        request?.requestedByEmail ||
                        request?.requested_by_email ||
                        '',

                      status:
                        request?.status ===
                          'aprobada'
                          ? 'aprobada'
                          : request?.status ===
                              'rechazada'
                            ? 'rechazada'
                            : 'pendiente',

                      created_at:
                        request?.created_at ||
                        request?.createdAt ||
                        request?.created ||
                        '',

                      expires_at:
                        request?.expires_at ||
                        request?.expiresAt ||
                        '',

                      durationHours:
                        Number(
                          request?.durationHours ||
                          request?.duration_hours ||
                          0
                        ),

                      rejection_reason:
                        request?.rejection_reason ||
                        request?.rejectionReason ||
                        '',

                      reviewed_by:
                        request?.reviewed_by ||
                        request?.reviewedBy ||
                        '',

                      reviewed_at:
                        request?.reviewed_at ||
                        request?.reviewedAt ||
                        ''

                    })
                  )
                : [];

            this.loadingRequests =
              false;

          },

        error:
          (
            err:
              any
          ) => {

            console.error(
              'ERROR CARGANDO SOLICITUDES:',
              err
            );

            this.temporaryRequests =
              [];

            this.loadingRequests =
              false;

          }

      });

  }


  filteredTemporaryRequests():
    TemporaryRequest[] {

    if (
      this.requestFilter ===
      'todas'
    ) {

      return this.temporaryRequests;

    }

    return this.temporaryRequests
      .filter(
        request =>
          request.status ===
          this.requestFilter
      );

  }


  getRequestCount(
    status:
      'pendiente' |
      'aprobada' |
      'rechazada'
  ):
    number {

    return this.temporaryRequests
      .filter(
        request =>
          request.status ===
          status
      )
      .length;

  }


  // =========================================================
  // PERFIL
  // =========================================================

  loadProfile():
    void {

    this.dashboardService
      .getUsers()
      .subscribe({

        next:
          (
            res:
              any
          ) => {

            const users =
              res?.users ||
              res?.results ||
              [];

            const firebaseUser =
              this.authService
                .getUser();

            if (
              !firebaseUser
            ) {
              return;
            }

            const firebaseUid =
              String(
                firebaseUser?.uid ||
                ''
              );

            const firebaseEmail =
              String(
                firebaseUser?.email ||
                ''
              )
                .trim()
                .toLowerCase();

            const me =
              users.find(
                (
                  user:
                    any
                ) => {

                  const userUid =
                    String(
                      user?.uid ||
                      user?.id ||
                      ''
                    );

                  const userEmail =
                    String(
                      user?.email ||
                      ''
                    )
                      .trim()
                      .toLowerCase();

                  return (
                    (
                      firebaseUid &&
                      firebaseUid ===
                        userUid
                    )
                    ||
                    (
                      firebaseEmail &&
                      firebaseEmail ===
                        userEmail
                    )
                  );

                }
              );

            if (
              !me
            ) {
              return;
            }

            this.currentUser =
              me;

            this.profile = {

              name:
                me?.name ||
                '',

              email:
                me?.email ||
                '',

              phone:
                me?.phone ||
                '',

              address:
                me?.address ||
                '',

              documentType:
                me?.document_type ||
                me?.documentType ||
                '',

              document:
                me?.document ||
                '',

              photo:
                me?.photo ||
                'assets/avatar.png'

            };

            this.calculatePersonalDashboard();

          },

        error:
          (
            err:
              any
          ) => {

            console.error(
              'ERROR CARGANDO PERFIL:',
              err
            );

          }

      });

  }


  uploadPhoto(
    event:
      any
  ):
    void {

    const file =
      event?.target?.files?.[0];

    if (
      !file
    ) {
      return;
    }

    if (
      !file.type.startsWith(
        'image/'
      )
    ) {

      Swal.fire(
        'Archivo no válido',
        'Selecciona una imagen válida.',
        'warning'
      );

      return;

    }

    if (
      file.size >
      5 *
      1024 *
      1024
    ) {

      Swal.fire(
        'Archivo demasiado grande',
        'La fotografía no puede superar los 5 MB.',
        'warning'
      );

      return;

    }

    this.selectedPhoto =
      file;

    const reader =
      new FileReader();

    reader.onload =
      () => {

        this.profile.photo =
          reader.result as
            string;

      };

    reader.readAsDataURL(
      file
    );

  }


  async updateProfile():
    Promise<void> {

    if (
      !this.currentUser
    ) {
      return;
    }

    try {

      if (
        this.selectedPhoto
      ) {

        const response:
          any =
            await this.dashboardService
              .uploadProfilePhoto(
                this.currentUser.uid,
                this.selectedPhoto
              )
              .toPromise();

        this.profile.photo =
          'http://127.0.0.1:8000'
          +
          response.photo;

      }

      const data = {

        // SOLO CAMPOS EDITABLES.
        // Nombre, tipo de documento, documento,
        // rol, UID y estado NO se envían.
        email:
          this.profile.email,

        phone:
          this.profile.phone,

        address:
          this.profile.address,

        photo:
          this.profile.photo,

        actor_uid:
          this.currentUser.uid

      };

      this.dashboardService
        .updateUser(
          this.currentUser.uid,
          data
        )
        .subscribe({

          next:
            () => {

              Swal.fire(
                'Correcto',
                'Perfil actualizado',
                'success'
              );

              this.selectedPhoto =
                null;

              this.loadProfile();

            },

          error:
            (
              err:
                any
            ) => {

              Swal.fire(
                'Error',
                err?.error?.message ||
                'No fue posible actualizar el perfil.',
                'error'
              );

            }

        });

    } catch (
      error
    ) {

      console.error(
        'ERROR ACTUALIZANDO PERFIL:',
        error
      );

      Swal.fire(
        'Error',
        'No fue posible subir la foto.',
        'error'
      );

    }

  }


  // =========================================================
  // BIOMETRÍA
  // =========================================================

  loadBiometricUsers():
    void {

    this.dashboardService
      .getUsers()
      .subscribe({

        next:
          (
            res:
              any
          ) => {

            const users =
              res?.users ||
              res ||
              [];

            this.biometricUsers =
              Array.isArray(
                users
              )
                ? users.map(
                    (
                      user:
                        any
                    ):
                      BiometricUser => ({

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
                        'Usuario',

                      email:
                        user?.email ||
                        '',

                      document:
                        user?.document ||
                        '',

                      role:
                        user?.role ||
                        'usuario',

                      active:
                        user?.active ??
                        true

                    })
                  )
                : [];

          },

        error:
          (
            err:
              any
          ) => {

            console.error(
              'ERROR CARGANDO USUARIOS PARA BIOMETRÍA:',
              err
            );

            this.biometricUsers =
              [];

          }

      });

  }


  filteredBiometricUsers():
    BiometricUser[] {

    const term =
      this.normalizeSearch(
        this.biometricSearch
      );

    if (
      !term
    ) {
      return this.biometricUsers;
    }

    return this.biometricUsers
      .filter(
        (
          user:
            BiometricUser
        ) => {

          const searchable =
            this.normalizeSearch(
              [
                user.name,
                user.email,
                user.document,
                user.role
              ]
                .join(
                  ' '
                )
            );

          return searchable.includes(
            term
          );

        }
      );

  }


  openFingerprintEnrollment(
    user:
      BiometricUser
  ):
    void {

    this.selectedBiometricUser =
      user;

    this.showBiometricModal =
      true;

  }


  closeFingerprintEnrollment():
    void {

    this.showBiometricModal =
      false;

    this.selectedBiometricUser =
      null;

  }


  // =========================================================
  // UTILIDADES
  // =========================================================

  formatDate(
    value:
      any
  ):
    string {

    const date =
      this.parseDate(
        value
      );

    if (
      !date
    ) {
      return 'Sin fecha';
    }

    return date
      .toLocaleDateString(
        'es-CO',
        {
          day:
            '2-digit',
          month:
            '2-digit',
          year:
            'numeric'
        }
      );

  }


  formatTime(
    value:
      any
  ):
    string {

    const date =
      this.parseDate(
        value
      );

    if (
      !date
    ) {
      return '--:--';
    }

    return date
      .toLocaleTimeString(
        'es-CO',
        {
          hour:
            '2-digit',
          minute:
            '2-digit',
          hour12:
            false
        }
      );

  }


  private parseDate(
    value:
      any
  ):
    Date | null {

    if (
      !value
    ) {
      return null;
    }

    if (
      value instanceof
      Date
    ) {

      return isNaN(
        value.getTime()
      )
        ? null
        : value;

    }

    if (
      typeof value?.toDate ===
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
      typeof value?.seconds ===
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


  private isSameDay(
    first:
      Date,
    second:
      Date
  ):
    boolean {

    return (
      first.getDate() ===
        second.getDate()
      &&
      first.getMonth() ===
        second.getMonth()
      &&
      first.getFullYear() ===
        second.getFullYear()
    );

  }


  private normalizeSearch(
    value:
      any
  ):
    string {

    return String(
      value ??
      ''
    )
      .normalize(
        'NFD'
      )
      .replace(
        /[\u0300-\u036f]/g,
        ''
      )
      .trim()
      .toLowerCase()
      .replace(
        /\s+/g,
        ' '
      );

  }


  // =========================================================
  // LOGOUT
  // =========================================================

  logout():
    void {

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
    })
      .then(
        result => {

          if (
            result.isConfirmed
          ) {

            this.authService
              .logout()
              .finally(
                () => {

                  this.router
                    .navigate(
                      [
                        '/login'
                      ]
                    );

                }
              );

          }

        }
      );

  }

}
