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
  documentType?: string;
  document: string;
  phone?: string;
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


interface AccessSession {
  id: string;
  uid: string;
  name: string;
  email: string;
  document: string;
  role: string;
  entryDate: string | null;
  exitDate: string | null;
  method: string;
  device: string;
  allowed: boolean;
  status:
    'completo' |
    'dentro' |
    'salida_sin_entrada' |
    'denegado';
}


interface TemporaryRequest {
  id?: string;
  name: string;
  email: string;
  documentType: string;
  document: string;
  phone: string;
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
  userUid?: string;
  rfid_uid?: string;
  rfid_assigned_at?: string;
  rfid_device?: string;
}


interface RfidJob {
  id: string;
  status: string;
  message?: string;
  error?: string;
  rfid_uid?: string;
  request_id?: string;
  user_uid?: string;
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

  private accessRequestInProgress =
    false;

  private accessRefreshTimer:
    ReturnType<typeof setInterval> | null =
      null;

  private readonly accessRefreshMs =
    1000;


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

  rfidActionInProgress =
    false;

  private rfidJobTimer:
    ReturnType<typeof setInterval> | null =
      null;

  private rfidJobRequestInProgress =
    false;

  private activeRfidJobId:
    string | null =
      null;


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
  // FORMULARIO TEMPORAL
  // =========================================================

  form:
    Access = {
      id: '',
      name: '',
      email: '',
      documentType: '',
      document: '',
      phone: '',
      role: '',
      status: '',
      tempAccess: false,
      expirationDate: null,
      reason: ''
    };


  constructor(
    private router:
      Router,

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
    this.loadNotifications();
    this.startAccessAutoRefresh();

  }


  ngOnDestroy():
    void {

    this.notificationSubscriptions
      .forEach(
        subscription =>
          subscription.unsubscribe()
      );

    this.stopAccessAutoRefresh();
    this.stopRfidJobWatch();

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
      'temporary'
    ) {

      this.loadTemporaryRequests();

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

  loadAccessLogs(
    silent: boolean = false
  ):
    void {

    if (this.accessRequestInProgress) {
      return;
    }

    this.accessRequestInProgress =
      true;

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
                      access?.allowed === true
                      ||
                      access?.granted === true
                      ||
                      [
                        'granted',
                        'permitido',
                        'allowed',
                        'approved',
                        'aprobado',
                        'success',
                        'exitoso'
                      ].includes(rawStatus)
                      ||
                      rawStatus.includes('permit')
                      ||
                      rawStatus.includes('author');

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

          this.accessRequestInProgress =
            false;

          this.calculateAccessStats();
          this.calculatePersonalDashboard();

        },

        error: (
          err:
            any
        ) => {


          this.accessRequestInProgress =
            false;

          console.error(
            'ERROR CARGANDO ACCESOS:',
            err
          );


          if (!silent) {

            Swal.fire({
              icon: 'error',
              title: 'No se pudieron cargar los accesos',
              text:
                err?.error?.message ||
                'No fue posible consultar el historial de accesos.'
            });

          }

        }

      });

  }


  refreshAccesses():
    void {

    this.loadAccessLogs(false);

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


  get accessSessions():
    AccessSession[] {

    return this.buildAccessSessions(
      this.accesses
    );

  }


  filteredAccessSessions():
    AccessSession[] {

    const normalized =
      this.normalizeSearch(
        this.search
      );

    if (!normalized) {
      return this.accessSessions;
    }

    const terms =
      normalized
        .split(/\s+/)
        .filter(Boolean);

    return this.accessSessions
      .filter(
        session => {

          const presence =
            session.status === 'dentro'
              ? 'dentro'
              : (
                  session.status === 'completo'
                  ||
                  session.status === 'salida_sin_entrada'
                )
                ? 'fuera'
                : session.status;

          const searchable =
            this.normalizeSearch(
              [
                session.name,
                session.email,
                session.document,
                session.role,
                session.method,
                session.device,
                session.status,
                presence
              ].join(' ')
            );

          return terms.every(
            term =>
              searchable.includes(term)
          );

        }
      );

  }


  private buildAccessSessions(
    logs: Access[]
  ):
    AccessSession[] {

    const orderedLogs =
      [...logs]
        .sort(
          (
            a: Access,
            b: Access
          ) => {

            const dateA =
              this.parseDate(a.date)
                ?.getTime() || 0;

            const dateB =
              this.parseDate(b.date)
                ?.getTime() || 0;

            return dateA - dateB;

          }
        );

    const pendingEntries =
      new Map<string, Access>();

    const sessions:
      AccessSession[] =
        [];

    for (
      const access
      of orderedLogs
    ) {

      const key =
        this.getAccessIdentityKey(
          access
        );

      if (
        access.allowed !== true
      ) {

        sessions.push({
          id:
            access.id,
          uid:
            String(access.uid || ''),
          name:
            access.name || 'Usuario desconocido',
          email:
            access.email || '',
          document:
            access.document || '',
          role:
            access.role || '',
          entryDate:
            access.type === 'entrada'
              ? access.date || null
              : null,
          exitDate:
            access.type === 'salida'
              ? access.date || null
              : null,
          method:
            access.method || '',
          device:
            access.device || '',
          allowed:
            false,
          status:
            'denegado'
        });

        continue;

      }

      if (
        access.type === 'entrada'
      ) {

        const previousEntry =
          pendingEntries.get(key);

        if (previousEntry) {

          sessions.push({
            id:
              previousEntry.id,
            uid:
              String(previousEntry.uid || ''),
            name:
              previousEntry.name || 'Usuario desconocido',
            email:
              previousEntry.email || '',
            document:
              previousEntry.document || '',
            role:
              previousEntry.role || '',
            entryDate:
              previousEntry.date || null,
            exitDate:
              null,
            method:
              previousEntry.method || '',
            device:
              previousEntry.device || '',
            allowed:
              true,
            status:
              'dentro'
          });

        }

        pendingEntries.set(
          key,
          access
        );

        continue;

      }

      const entry =
        pendingEntries.get(key);

      if (entry) {

        sessions.push({
          id:
            `${entry.id}-${access.id}`,
          uid:
            String(
              access.uid ||
              entry.uid ||
              ''
            ),
          name:
            access.name ||
            entry.name ||
            'Usuario desconocido',
          email:
            access.email ||
            entry.email ||
            '',
          document:
            access.document ||
            entry.document ||
            '',
          role:
            access.role ||
            entry.role ||
            '',
          entryDate:
            entry.date || null,
          exitDate:
            access.date || null,
          method:
            access.method ||
            entry.method ||
            '',
          device:
            access.device ||
            entry.device ||
            '',
          allowed:
            true,
          status:
            'completo'
        });

        pendingEntries.delete(
          key
        );

      } else {

        sessions.push({
          id:
            access.id,
          uid:
            String(access.uid || ''),
          name:
            access.name || 'Usuario desconocido',
          email:
            access.email || '',
          document:
            access.document || '',
          role:
            access.role || '',
          entryDate:
            null,
          exitDate:
            access.date || null,
          method:
            access.method || '',
          device:
            access.device || '',
          allowed:
            true,
          status:
            'salida_sin_entrada'
        });

      }

    }

    pendingEntries.forEach(
      entry => {

        sessions.push({
          id:
            entry.id,
          uid:
            String(entry.uid || ''),
          name:
            entry.name || 'Usuario desconocido',
          email:
            entry.email || '',
          document:
            entry.document || '',
          role:
            entry.role || '',
          entryDate:
            entry.date || null,
          exitDate:
            null,
          method:
            entry.method || '',
          device:
            entry.device || '',
          allowed:
            true,
          status:
            'dentro'
        });

      }
    );

    return sessions
      .sort(
        (
          a: AccessSession,
          b: AccessSession
        ) => {

          const dateA =
            this.parseDate(
              a.exitDate ||
              a.entryDate
            )
              ?.getTime() || 0;

          const dateB =
            this.parseDate(
              b.exitDate ||
              b.entryDate
            )
              ?.getTime() || 0;

          return dateB - dateA;

        }
      );

  }


  private getAccessIdentityKey(
    access: Access
  ):
    string {

    const uid =
      String(
        access.uid || ''
      )
        .trim();

    if (uid) {
      return `uid:${uid}`;
    }

    const email =
      String(
        access.email || ''
      )
        .trim()
        .toLowerCase();

    if (email) {
      return `email:${email}`;
    }

    const document =
      String(
        access.document || ''
      )
        .trim();

    if (document) {
      return `document:${document}`;
    }

    return `name:${this.normalizeSearch(access.name)}`;

  }


  getPresenceLabel(
    session: AccessSession
  ):
    string {

    if (!session.allowed) {
      return 'Denegado';
    }

    if (
      session.status === 'dentro'
    ) {
      return 'Dentro';
    }

    return 'Fuera';

  }


  private startAccessAutoRefresh():
    void {

    if (this.accessRefreshTimer) {
      return;
    }

    this.accessRefreshTimer =
      setInterval(
        () => {

          if (
            this.activeSection === 'dashboard'
            ||
            this.activeSection === 'accesses'
          ) {

            this.loadAccessLogs(true);

          }

        },
        this.accessRefreshMs
      );

  }


  private stopAccessAutoRefresh():
    void {

    if (!this.accessRefreshTimer) {
      return;
    }

    clearInterval(
      this.accessRefreshTimer
    );

    this.accessRefreshTimer =
      null;

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
  // DASHBOARD PERSONAL — SESIONES Y PRESENCIA
  // =========================================================

  get myAccessSessions():
    AccessSession[] {

    return this.buildAccessSessions(
      this.myAccesses
    );

  }


  get recentMyAccessSessions():
    AccessSession[] {

    return this.myAccessSessions
      .slice(
        0,
        8
      );

  }


  get myCurrentPresence():
    'Dentro' |
    'Fuera' |
    'Sin registros' {

    const lastAllowedMovement =
      this.myAccesses
        .find(
          access =>
            access.allowed === true
        );

    if (!lastAllowedMovement) {
      return 'Sin registros';
    }

    return lastAllowedMovement.type ===
      'entrada'
        ? 'Dentro'
        : 'Fuera';

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
      documentType: '',
      document: '',
      phone: '',
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

    const name =
      String(
        this.form.name || ''
      )
        .trim();

    const email =
      String(
        this.form.email || ''
      )
        .trim()
        .toLowerCase();

    const documentType =
      String(
        this.form.documentType || ''
      )
        .trim()
        .toUpperCase();

    const document =
      String(
        this.form.document || ''
      )
        .trim();

    const phone =
      String(
        this.form.phone || ''
      )
        .trim();

    const reason =
      String(
        this.form.reason || ''
      )
        .trim();

    if (!name) {

      Swal.fire(
        'Campo obligatorio',
        'El nombre completo del visitante es obligatorio.',
        'warning'
      );

      return;

    }

    if (
      name.length < 3
      ||
      !/^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ\s'.-]+$/
        .test(name)
    ) {

      Swal.fire(
        'Nombre no válido',
        'Usa únicamente letras, espacios, apóstrofes, puntos o guiones.',
        'warning'
      );

      return;

    }

    if (
      !email
      ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/
        .test(email)
    ) {

      Swal.fire(
        'Correo no válido',
        'Ingresa un correo electrónico válido.',
        'warning'
      );

      return;

    }

    if (
      ![
        'CC',
        'TI'
      ].includes(documentType)
    ) {

      Swal.fire(
        'Tipo de documento requerido',
        'Selecciona CC o TI.',
        'warning'
      );

      return;

    }

    if (
      !/^\d{6,15}$/
        .test(document)
    ) {

      Swal.fire(
        'Documento no válido',
        'El documento debe contener entre 6 y 15 dígitos.',
        'warning'
      );

      return;

    }

    const normalizedPhone =
      phone.replace(/\s+/g, '');

    if (
      normalizedPhone
      &&
      !/^\+?\d{7,15}$/
        .test(normalizedPhone)
    ) {

      Swal.fire(
        'Teléfono no válido',
        'El teléfono debe contener entre 7 y 15 dígitos y puede iniciar con +.',
        'warning'
      );

      return;

    }

    if (
      !reason
      ||
      reason.length < 5
    ) {

      Swal.fire(
        'Motivo requerido',
        'Describe claramente el motivo del acceso temporal.',
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

    if (!firebaseUser) {

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

    if (
      !Number.isFinite(durationHours)
      ||
      durationHours <= 0
      ||
      durationHours > 24
    ) {

      Swal.fire(
        'Duración no válida',
        'La duración debe estar entre 1 y 24 horas.',
        'warning'
      );

      return;

    }

    const data = {

      name,

      email,

      documentType,

      document,

      phone:
        normalizedPhone,

      reason,

      requestedBy:
        firebaseUser.uid || '',

      requestedByEmail:
        firebaseUser.email || '',

      status:
        'pendiente',

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
                'La solicitud fue enviada al administrador. Cuando sea aprobada podrás asignar la tarjeta RFID.',
              timer:
                2600,
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

                      documentType:
                        request?.documentType ||
                        request?.document_type ||
                        '',

                      document:
                        request?.document ||
                        '',

                      phone:
                        request?.phone ||
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
                        '',

                      userUid:
                        request?.userUid ||
                        request?.user_uid ||
                        '',

                      rfid_uid:
                        request?.rfid_uid ||
                        request?.rfidUid ||
                        '',

                      rfid_assigned_at:
                        request?.rfid_assigned_at ||
                        request?.rfidAssignedAt ||
                        '',

                      rfid_device:
                        request?.rfid_device ||
                        request?.rfidDevice ||
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


  canAssignRfid(
    request:
      TemporaryRequest
  ):
    boolean {

    if (
      request.status !== 'aprobada'
      ||
      !request.id
      ||
      !request.userUid
      ||
      this.rfidActionInProgress
    ) {
      return false;
    }

    return !this.isTemporaryRequestExpired(
      request
    );

  }


  isTemporaryRequestExpired(
    request:
      TemporaryRequest
  ):
    boolean {

    if (!request.expires_at) {
      return false;
    }

    const expiresAt =
      this.parseDate(
        request.expires_at
      );

    if (!expiresAt) {
      return false;
    }

    return (
      expiresAt.getTime()
      <=
      Date.now()
    );

  }


  startRfidEnrollment(
    request:
      TemporaryRequest
  ):
    void {

    if (
      !this.canAssignRfid(
        request
      )
    ) {

      Swal.fire({
        icon: 'info',
        title: 'RFID no disponible',
        text:
          this.isTemporaryRequestExpired(request)
            ? 'Este acceso temporal ya venció.'
            : 'La solicitud debe estar aprobada antes de asignar una tarjeta RFID.'
      });

      return;

    }

    const actor =
      this.authService
        .getUser();

    if (
      !actor?.uid
      ||
      !request.id
    ) {

      Swal.fire(
        'Error',
        'No se pudo identificar al vigilante o la solicitud.',
        'error'
      );

      return;

    }

    const isReplacement =
      !!request.rfid_uid;

    Swal.fire({
      icon: 'question',
      title:
        isReplacement
          ? 'Cambiar tarjeta RFID'
          : 'Asignar tarjeta RFID',
      text:
        'Después de continuar, acerca la tarjeta al lector RFID conectado al ESP32.',
      showCancelButton:
        true,
      confirmButtonText:
        isReplacement
          ? 'Cambiar tarjeta'
          : 'Leer tarjeta',
      cancelButtonText:
        'Cancelar'
    })
      .then(
        result => {

          if (!result.isConfirmed) {
            return;
          }

          this.rfidActionInProgress =
            true;

          Swal.fire({
            title:
              'Esperando tarjeta RFID',
            html:
              'Acerca la tarjeta al lector conectado al ESP32.<br><small>El proceso expira automáticamente si no se detecta una tarjeta.</small>',
            allowOutsideClick:
              false,
            allowEscapeKey:
              false,
            showConfirmButton:
              false,
            didOpen:
              () => {
                Swal.showLoading();
              }
          });

          this.dashboardService
            .startTemporaryRfidEnrollment(
              request.id!,
              actor.uid,
              'SEGURENTRY-ESP32'
            )
            .subscribe({

              next:
                (
                  res:
                    any
                ) => {

                  const jobId =
                    String(
                      res?.job?.id ||
                      res?.job_id ||
                      ''
                    );

                  if (!jobId) {

                    this.rfidActionInProgress =
                      false;

                    Swal.fire(
                      'Error',
                      'El backend no devolvió el ID del proceso RFID.',
                      'error'
                    );

                    return;

                  }

                  this.watchRfidJob(
                    jobId,
                    request
                  );

                },

              error:
                (
                  err:
                    any
                ) => {

                  this.rfidActionInProgress =
                    false;

                  Swal.fire(
                    'No se pudo iniciar',
                    err?.error?.message ||
                    'No fue posible iniciar la lectura RFID.',
                    'error'
                  );

                }

            });

        }
      );

  }


  private watchRfidJob(
    jobId:
      string,
    request:
      TemporaryRequest
  ):
    void {

    this.stopRfidJobWatch();

    this.activeRfidJobId =
      jobId;

    const checkJob =
      () => {

        if (
          this.rfidJobRequestInProgress
        ) {
          return;
        }

        this.rfidJobRequestInProgress =
          true;

        this.dashboardService
          .getTemporaryRfidJob(
            jobId
          )
          .subscribe({

            next:
              (
                res:
                  any
              ) => {

                this.rfidJobRequestInProgress =
                  false;

                const job:
                  RfidJob =
                    res?.job ||
                    ({} as RfidJob);

                const status =
                  String(
                    job?.status ||
                    ''
                  )
                    .trim()
                    .toLowerCase();

                if (
                  status === 'completed'
                ) {

                  this.stopRfidJobWatch();

                  this.rfidActionInProgress =
                    false;

                  this.loadTemporaryRequests();
                  this.loadAccessLogs(true);

                  Swal.fire({
                    icon:
                      'success',
                    title:
                      request.rfid_uid
                        ? 'Tarjeta RFID actualizada'
                        : 'Tarjeta RFID asignada',
                    text:
                      job?.rfid_uid
                        ? `Tarjeta ${job.rfid_uid} asociada correctamente.`
                        : 'La tarjeta quedó asociada al usuario temporal.',
                    timer:
                      2300,
                    showConfirmButton:
                      false
                  });

                  return;

                }

                if (
                  [
                    'failed',
                    'expired',
                    'cancelled'
                  ].includes(status)
                ) {

                  this.stopRfidJobWatch();

                  this.rfidActionInProgress =
                    false;

                  Swal.fire({
                    icon:
                      'error',
                    title:
                      'No se asignó la tarjeta',
                    text:
                      job?.error ||
                      job?.message ||
                      'El proceso RFID terminó sin completar la asociación.'
                  });

                }

              },

            error:
              (
                err:
                  any
              ) => {

                this.rfidJobRequestInProgress =
                  false;

                console.error(
                  'ERROR CONSULTANDO JOB RFID:',
                  err
                );

              }

          });

      };

    checkJob();

    this.rfidJobTimer =
      setInterval(
        checkJob,
        1500
      );

  }


  private stopRfidJobWatch():
    void {

    if (
      this.rfidJobTimer
    ) {

      clearInterval(
        this.rfidJobTimer
      );

      this.rfidJobTimer =
        null;

    }

    this.activeRfidJobId =
      null;

    this.rfidJobRequestInProgress =
      false;

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

    if (!date) {
      return 'Sin fecha';
    }

    return new Intl.DateTimeFormat(
      'es-CO',
      {
        timeZone:
          'America/Bogota',
        day:
          '2-digit',
        month:
          '2-digit',
        year:
          'numeric'
      }
    )
      .format(
        date
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

    if (!date) {
      return '--:--';
    }

    return new Intl.DateTimeFormat(
      'en-US',
      {
        timeZone:
          'America/Bogota',
        hour:
          'numeric',
        minute:
          '2-digit',
        second:
          '2-digit',
        hour12:
          true
      }
    )
      .format(
        date
      )
      .toUpperCase();

  }


  formatDateTime(
    value:
      any
  ):
    string {

    if (!value) {
      return '—';
    }

    return (
      `${this.formatDate(value)} · ${this.formatTime(value)}`
    );

  }


  private parseDate(
    value:
      any
  ):
    Date | null {

    if (!value) {
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

    let raw =
      String(
        value
      )
        .trim();

    if (!raw) {
      return null;
    }

    const isIsoDateTime =
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/
        .test(raw);

    const hasTimezone =
      /(?:Z|[+-]\d{2}:\d{2})$/i
        .test(raw);

    if (
      isIsoDateTime &&
      !hasTimezone
    ) {
      raw += 'Z';
    }

    const date =
      new Date(
        raw
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
