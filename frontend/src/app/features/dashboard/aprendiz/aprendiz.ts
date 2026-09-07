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


interface PersonalAccessLog {
  id: string;
  uid: string;
  user: string;
  email: string;
  document: string;
  role: string;
  type: 'entrada' | 'salida';
  date: string;
  method: string;
  device: string;
  allowed: boolean;
  status: string;
}


interface PersonalAccessSession {
  id: string;
  uid: string;
  user: string;
  email: string;
  document: string;
  role: string;
  entryDate: string | null;
  exitDate: string | null;
  method: string;
  device: string;
  allowed: boolean;
  status:
    'dentro' |
    'fuera' |
    'denegado' |
    'salida_sin_entrada';
}


@Component({
  selector: 'app-aprendiz',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl: './aprendiz.html',
  styleUrls: [
    './aprendiz.css'
  ]
})
export class Aprendiz
  implements
    OnInit,
    OnDestroy {

  menuOpen = true;

  activeSection:
    string =
      'dashboard';

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


  menuItems = [
    {
      key: 'dashboard',
      label: 'Dashboard',
      icon: 'fa-home'
    },
    {
      key: 'access',
      label: 'Mis Accesos',
      icon: 'fa-history'
    },
    {
      key: 'notifications',
      label: 'Notificaciones',
      icon: 'fa-bell'
    },
    {
      key: 'profile',
      label: 'Mi Perfil',
      icon: 'fa-user-circle'
    }
  ];


  // =========================================================
  // MIS ACCESOS
  // =========================================================

  personalAccessLogs:
    PersonalAccessLog[] =
      [];

  accessLoading =
    false;

  accessSearch =
    '';

  accessMovement:
    'todos' |
    'entrada' |
    'salida' =
      'todos';

  accessStatus:
    'todos' |
    'permitido' |
    'denegado' =
      'todos';

  accessDate =
    '';

  private accessRequestInProgress =
    false;

  private accessRefreshTimer:
    ReturnType<typeof setInterval> | null =
      null;

  private readonly accessRefreshMs =
    1000;


  // =========================================================
  // NOTIFICACIONES PERSONALES
  // =========================================================

  notifications:
    any[] =
      [];

  unreadNotifications =
    0;

  notificationLoading =
    false;

  notificationFilter:
    'todas' |
    'no-leidas' |
    'accesos' |
    'cuenta' |
    'biometria' =
      'todas';

  private notificationRefreshTimer:
    ReturnType<typeof setInterval> | null =
      null;

  private readonly notificationRefreshMs =
    1000;

  private knownNotificationIds =
    new Set<string>();

  private notificationSnapshotReady =
    false;



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

  ngOnInit(): void {

    this.initNotifications();
    this.loadProfile();

  }


  ngOnDestroy(): void {

    this.stopAccessAutoRefresh();
    this.stopNotificationAutoRefresh();

  }


  // =========================================================
  // SIDEBAR
  // =========================================================

  toggleMenu(): void {

    this.menuOpen =
      !this.menuOpen;

  }


  setSection(
    section: string
  ): void {

    this.activeSection =
      section;

    if (
      section === 'dashboard' ||
      section === 'access'
    ) {

      this.loadPersonalAccessLogs(
        true
      );

    }

    if (
      section === 'notifications'
    ) {

      this.loadNotifications();

    }

  }


  isActive(
    section: string
  ): boolean {

    return (
      this.activeSection ===
      section
    );

  }


  // =========================================================
  // PERFIL
  // =========================================================

  loadProfile(): void {

    this.dashboardService
      .getUsers()
      .subscribe({

        next: (
          res: any
        ) => {

          const users =
            res?.users ||
            res?.results ||
            [];

          const firebaseUser =
            this.authService
              .getUser();

          if (!firebaseUser) {
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
                user: any
              ) => {

                const uid =
                  String(
                    user?.uid ||
                    user?.id ||
                    ''
                  );

                const email =
                  String(
                    user?.email ||
                    ''
                  )
                    .trim()
                    .toLowerCase();

                return (
                  (
                    firebaseUid &&
                    uid ===
                      firebaseUid
                  )
                  ||
                  (
                    firebaseEmail &&
                    email ===
                      firebaseEmail
                  )
                );

              }
            );

          if (!me) {

            console.warn(
              'No se encontró el perfil del Aprendiz.'
            );

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

          // Una vez conocemos el UID/correo/documento del usuario,
          // cargamos exclusivamente sus propios registros.
          this.loadPersonalAccessLogs();

          // Actualización automática mientras el usuario se
          // encuentre en Dashboard o Mis Accesos.
          this.startAccessAutoRefresh();

        },

        error: (
          err: any
        ) => {

          console.error(
            'ERROR CARGANDO PERFIL:',
            err
          );

        }

      });

  }


  // =========================================================
  // ACCESOS — AUTO REFRESH
  // =========================================================

  private startAccessAutoRefresh():
    void {

    if (
      this.accessRefreshTimer
    ) {
      return;
    }

    this.accessRefreshTimer =
      setInterval(
        () => {

          if (
            this.activeSection ===
              'dashboard'
            ||
            this.activeSection ===
              'access'
          ) {

            this.loadPersonalAccessLogs(
              true
            );

          }

        },
        this.accessRefreshMs
      );

  }


  private stopAccessAutoRefresh():
    void {

    if (
      !this.accessRefreshTimer
    ) {
      return;
    }

    clearInterval(
      this.accessRefreshTimer
    );

    this.accessRefreshTimer =
      null;

  }


  // =========================================================
  // ACCESOS — CARGAR
  // =========================================================

  loadPersonalAccessLogs(
    silent: boolean = false
  ): void {

    if (
      !this.currentUser ||
      this.accessRequestInProgress
    ) {
      return;
    }

    this.accessRequestInProgress =
      true;

    if (!silent) {
      this.accessLoading =
        true;
    }

    this.dashboardService
      .getAccesses()
      .subscribe({

        next: (
          res: any
        ) => {

          const rawLogs =
            res?.accesses ||
            res?.access ||
            res?.logs ||
            res?.results ||
            res ||
            [];

          const logs =
            Array.isArray(
              rawLogs
            )
              ? rawLogs
              : [];

          const myUid =
            String(
              this.currentUser?.uid ||
              this.currentUser?.id ||
              ''
            );

          const myEmail =
            String(
              this.currentUser?.email ||
              this.profile.email ||
              ''
            )
              .trim()
              .toLowerCase();

          const myDocument =
            String(
              this.currentUser?.document ||
              this.profile.document ||
              ''
            )
              .trim();

          this.personalAccessLogs =
            logs
              .filter(
                (
                  access: any
                ) => {

                  const accessUid =
                    String(
                      access?.uid ||
                      access?.user_uid ||
                      access?.userId ||
                      ''
                    );

                  const accessEmail =
                    String(
                      access?.email ||
                      access?.user_email ||
                      ''
                    )
                      .trim()
                      .toLowerCase();

                  const accessDocument =
                    String(
                      access?.document ||
                      access?.user_document ||
                      ''
                    )
                      .trim();

                  // Prioridad UID. Email/documento sirven como
                  // compatibilidad con logs históricos.
                  if (
                    myUid &&
                    accessUid
                  ) {

                    return (
                      accessUid ===
                      myUid
                    );

                  }

                  if (
                    myEmail &&
                    accessEmail &&
                    accessEmail ===
                      myEmail
                  ) {
                    return true;
                  }

                  if (
                    myDocument &&
                    accessDocument &&
                    accessDocument ===
                      myDocument
                  ) {
                    return true;
                  }

                  return false;

                }
              )
              .map(
                (
                  access: any
                ):
                  PersonalAccessLog => {

                  const rawType =
                    String(
                      access?.type ||
                      access?.entry ||
                      access?.access_type ||
                      access?.movement ||
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

                  const allowed =
                    access?.allowed ===
                      true
                    ||
                    access?.granted ===
                      true
                    ||
                    String(
                      access?.status ||
                      ''
                    )
                      .trim()
                      .toLowerCase()
                      .includes(
                        'permit'
                      )
                    ||
                    String(
                      access?.status ||
                      ''
                    )
                      .trim()
                      .toLowerCase()
                      .includes(
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
                        access?.user_uid ||
                        ''
                      ),

                    user:
                      access?.user ||
                      access?.name ||
                      this.profile.name ||
                      'Aprendiz',

                    email:
                      access?.email ||
                      access?.user_email ||
                      this.profile.email ||
                      '',

                    document:
                      String(
                        access?.document ||
                        access?.user_document ||
                        this.profile.document ||
                        ''
                      ),

                    role:
                      access?.role ||
                      this.currentUser?.role ||
                      'aprendiz',

                    type:
                      type,

                    date:
                      String(
                        access?.date ||
                        access?.created_at ||
                        access?.timestamp ||
                        ''
                      ),

                    method:
                      access?.method ||
                      access?.access_method ||
                      'Huella',

                    device:
                      access?.device ||
                      access?.device_name ||
                      '',

                    allowed:
                      allowed,

                    status:
                      access?.status ||
                      (
                        allowed
                          ? 'Permitido'
                          : 'Denegado'
                      )

                  };

                }
              )
              .sort(
                (
                  a:
                    PersonalAccessLog,
                  b:
                    PersonalAccessLog
                ) => {

                  return (
                    this.parseAccessDate(
                      b.date
                    )
                      ?.getTime() ||
                    0
                  )
                  -
                  (
                    this.parseAccessDate(
                      a.date
                    )
                      ?.getTime() ||
                    0
                  );

                }
              );

          this.accessRequestInProgress =
            false;

          if (!silent) {
            this.accessLoading =
              false;
          }

        },

        error: (
          err: any
        ) => {

          this.accessRequestInProgress =
            false;

          if (!silent) {
            this.accessLoading =
              false;
          }

          console.error(
            'ERROR CARGANDO MIS ACCESOS:',
            err
          );

          if (!silent) {

            Swal.fire({
              icon: 'error',
              title:
                'No se pudieron cargar tus accesos',
              text:
                err?.error?.message ||
                'No fue posible consultar tu historial personal.'
            });

          }

        }

      });

  }


  // =========================================================
  // ACCESOS — SESIONES / FILTROS
  // =========================================================

  private buildPersonalAccessSessions():
    PersonalAccessSession[] {

    const ordered =
      [...this.personalAccessLogs]
        .sort(
          (
            a:
              PersonalAccessLog,
            b:
              PersonalAccessLog
          ) => {

            const dateA =
              this.parseAccessDate(
                a.date
              )?.getTime() || 0;

            const dateB =
              this.parseAccessDate(
                b.date
              )?.getTime() || 0;

            return dateA - dateB;

          }
        );

    const pendingEntries =
      new Map<
        string,
        PersonalAccessLog
      >();

    const sessions:
      PersonalAccessSession[] =
        [];

    for (
      const log
      of ordered
    ) {

      const key =
        String(
          log.uid ||
          log.email ||
          log.document ||
          log.user ||
          log.id
        )
          .trim()
          .toLowerCase();

      // Los intentos denegados se muestran,
      // pero no modifican el estado Dentro/Fuera.
      if (!log.allowed) {

        sessions.push({
          id:
            log.id,
          uid:
            log.uid,
          user:
            log.user,
          email:
            log.email,
          document:
            log.document,
          role:
            log.role,
          entryDate:
            log.type === 'entrada'
              ? log.date
              : null,
          exitDate:
            log.type === 'salida'
              ? log.date
              : null,
          method:
            log.method,
          device:
            log.device,
          allowed:
            false,
          status:
            'denegado'
        });

        continue;

      }

      if (
        log.type ===
        'entrada'
      ) {

        const previousEntry =
          pendingEntries.get(
            key
          );

        // Compatibilidad con datos históricos:
        // si aparecen dos entradas consecutivas,
        // conservamos la anterior como sesión abierta.
        if (previousEntry) {

          sessions.push({
            id:
              previousEntry.id,
            uid:
              previousEntry.uid,
            user:
              previousEntry.user,
            email:
              previousEntry.email,
            document:
              previousEntry.document,
            role:
              previousEntry.role,
            entryDate:
              previousEntry.date,
            exitDate:
              null,
            method:
              previousEntry.method,
            device:
              previousEntry.device,
            allowed:
              true,
            status:
              'dentro'
          });

        }

        pendingEntries.set(
          key,
          log
        );

        continue;

      }

      const entry =
        pendingEntries.get(
          key
        );

      if (entry) {

        sessions.push({
          id:
            `${entry.id}-${log.id}`,
          uid:
            log.uid ||
            entry.uid,
          user:
            log.user ||
            entry.user,
          email:
            log.email ||
            entry.email,
          document:
            log.document ||
            entry.document,
          role:
            log.role ||
            entry.role,
          entryDate:
            entry.date,
          exitDate:
            log.date,
          method:
            log.method ||
            entry.method,
          device:
            log.device ||
            entry.device,
          allowed:
            true,
          status:
            'fuera'
        });

        pendingEntries.delete(
          key
        );

      } else {

        sessions.push({
          id:
            log.id,
          uid:
            log.uid,
          user:
            log.user,
          email:
            log.email,
          document:
            log.document,
          role:
            log.role,
          entryDate:
            null,
          exitDate:
            log.date,
          method:
            log.method,
          device:
            log.device,
          allowed:
            true,
          status:
            'salida_sin_entrada'
        });

      }

    }

    pendingEntries.forEach(
      (
        entry:
          PersonalAccessLog
      ) => {

        sessions.push({
          id:
            entry.id,
          uid:
            entry.uid,
          user:
            entry.user,
          email:
            entry.email,
          document:
            entry.document,
          role:
            entry.role,
          entryDate:
            entry.date,
          exitDate:
            null,
          method:
            entry.method,
          device:
            entry.device,
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
          a:
            PersonalAccessSession,
          b:
            PersonalAccessSession
        ) => {

          const dateA =
            this.parseAccessDate(
              a.exitDate ||
              a.entryDate
            )?.getTime() || 0;

          const dateB =
            this.parseAccessDate(
              b.exitDate ||
              b.entryDate
            )?.getTime() || 0;

          return dateB - dateA;

        }
      );

  }


  get personalAccessSessions():
    PersonalAccessSession[] {

    return this
      .buildPersonalAccessSessions();

  }


  get filteredPersonalAccessSessions():
    PersonalAccessSession[] {

    const search =
      this.accessSearch
        .trim()
        .toLowerCase();

    return this.personalAccessSessions
      .filter(
        (
          session:
            PersonalAccessSession
        ) => {

          if (
            this.accessMovement ===
              'entrada'
            &&
            !session.entryDate
          ) {
            return false;
          }

          if (
            this.accessMovement ===
              'salida'
            &&
            !session.exitDate
          ) {
            return false;
          }

          if (
            this.accessStatus ===
              'permitido'
            &&
            !session.allowed
          ) {
            return false;
          }

          if (
            this.accessStatus ===
              'denegado'
            &&
            session.allowed
          ) {
            return false;
          }

          if (
            this.accessDate
          ) {

            const entryKey =
              this.getAccessDateKey(
                session.entryDate
              );

            const exitKey =
              this.getAccessDateKey(
                session.exitDate
              );

            if (
              entryKey !==
                this.accessDate
              &&
              exitKey !==
                this.accessDate
            ) {
              return false;
            }

          }

          if (search) {

            const statusLabel =
              session.status ===
                'dentro'
                ? 'dentro'
                : session.status ===
                    'fuera'
                    ? 'fuera'
                    : session.status ===
                        'denegado'
                        ? 'denegado'
                        : 'salida';

            const searchable =
              [
                session.user,
                session.email,
                session.document,
                session.role,
                session.method,
                session.device,
                statusLabel
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
      );

  }


  get currentPresenceStatus():
    'Dentro' |
    'Fuera' |
    'Sin registro' {

    const lastGranted =
      this.personalAccessLogs
        .find(
          access =>
            access.allowed
        );

    if (!lastGranted) {
      return 'Sin registro';
    }

    return lastGranted.type ===
      'entrada'
        ? 'Dentro'
        : 'Fuera';

  }


  get currentPresenceClass():
    string {

    return this.currentPresenceStatus ===
      'Dentro'
        ? 'inside'
        : this.currentPresenceStatus ===
            'Fuera'
            ? 'outside'
            : 'unknown';

  }


  resetAccessFilters():
    void {

    this.accessSearch =
      '';

    this.accessMovement =
      'todos';

    this.accessStatus =
      'todos';

    this.accessDate =
      '';

  }


  // =========================================================
  // ACCESOS — DASHBOARD
  // =========================================================

  get monthEntries():
    number {

    const nowKey =
      this.getAccessDateKey(
        new Date()
      );

    const currentMonth =
      nowKey.slice(
        0,
        7
      );

    return this.personalAccessLogs
      .filter(
        access => {

          if (
            access.type !==
              'entrada'
          ) {
            return false;
          }

          const accessKey =
            this.getAccessDateKey(
              access.date
            );

          return (
            !!accessKey &&
            accessKey.slice(
              0,
              7
            ) ===
              currentMonth
          );

        }
      )
      .length;

  }


  get allowedAccessCount():
    number {

    return this.personalAccessLogs
      .filter(
        access =>
          access.allowed
      )
      .length;

  }


  get deniedAccessCount():
    number {

    return this.personalAccessLogs
      .filter(
        access =>
          !access.allowed
      )
      .length;

  }


  get lastAccess():
    PersonalAccessLog | null {

    return (
      this.personalAccessLogs[0] ||
      null
    );

  }


  get lastAccessTime():
    string {

    if (!this.lastAccess) {
      return '—';
    }

    return this.formatAccessTime(
      this.lastAccess.date
    );

  }


  get recentPersonalAccessLogs():
    PersonalAccessLog[] {

    return this.personalAccessLogs
      .slice(
        0,
        4
      );

  }


  // =========================================================
  // ACCESOS — UTILIDADES
  // =========================================================

  private parseAccessDate(
    value: any
  ): Date | null {

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

    // Compatibilidad con los accesos históricos de SegurEntry.
    // El backend antiguo guardaba datetime.utcnow().isoformat()
    // sin indicar la zona horaria. Esos valores eran UTC.
    const isIsoDateTime =
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/
        .test(
          raw
        );

    const hasTimezone =
      /(?:Z|[+-]\d{2}:\d{2})$/i
        .test(
          raw
        );

    if (
      isIsoDateTime &&
      !hasTimezone
    ) {

      raw +=
        'Z';

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


  private getAccessDateKey(
    value: any
  ): string {

    const date =
      this.parseAccessDate(
        value
      );

    if (!date) {
      return '';
    }

    const parts =
      new Intl.DateTimeFormat(
        'en-US',
        {
          timeZone:
            'America/Bogota',
          year:
            'numeric',
          month:
            '2-digit',
          day:
            '2-digit'
        }
      )
        .formatToParts(
          date
        );

    const year =
      parts.find(
        part =>
          part.type ===
          'year'
      )?.value || '';

    const month =
      parts.find(
        part =>
          part.type ===
          'month'
      )?.value || '';

    const day =
      parts.find(
        part =>
          part.type ===
          'day'
      )?.value || '';

    return (
      year &&
      month &&
      day
    )
      ? `${year}-${month}-${day}`
      : '';

  }


  formatAccessDate(
    value: any
  ): string {

    const date =
      this.parseAccessDate(
        value
      );

    if (!date) {
      return '—';
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


  formatAccessTime(
    value: any
  ): string {

    const date =
      this.parseAccessDate(
        value
      );

    if (!date) {
      return '—';
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


  getAccessMethodIcon(
    method: string
  ): string {

    const normalized =
      String(
        method ||
        ''
      )
        .trim()
        .toLowerCase();

    if (
      normalized.includes(
        'huella'
      )
      ||
      normalized.includes(
        'finger'
      )
    ) {
      return 'fa-fingerprint';
    }

    if (
      normalized.includes(
        'rfid'
      )
      ||
      normalized.includes(
        'tarjeta'
      )
    ) {
      return 'fa-id-card';
    }

    if (
      normalized.includes(
        'qr'
      )
    ) {
      return 'fa-qrcode';
    }

    return 'fa-shield-halved';

  }



  // =========================================================
  // NOTIFICACIONES — INICIALIZACIÓN
  // =========================================================

  private initNotifications():
    void {

    this.notificationService
      .getNotifications()
      .subscribe({

        next: (
          notifications:
            any[]
        ) => {

          const sorted =
            Array.isArray(
              notifications
            )
              ? [...notifications]
              : [];

          sorted.sort(
            (
              a: any,
              b: any
            ) => {

              return (
                this.getNotificationTimestamp(
                  b
                )
                -
                this.getNotificationTimestamp(
                  a
                )
              );

            }
          );

          this.notifications =
            sorted;

          if (
            this.notificationSnapshotReady
          ) {

            const newNotifications =
              sorted.filter(
                notification => {

                  const id =
                    String(
                      notification?.id ||
                      ''
                    );

                  return (
                    id &&
                    !this.knownNotificationIds.has(
                      id
                    )
                  );

                }
              );

            if (
              newNotifications.length > 0
            ) {

              this.showNotificationToast(
                newNotifications[0]
              );

            }

          }

          for (
            const notification
            of sorted
          ) {

            const id =
              String(
                notification?.id ||
                ''
              );

            if (id) {

              this.knownNotificationIds.add(
                id
              );

            }

          }

        },

        error: (
          error: any
        ) => {

          console.error(
            'ERROR EN NOTIFICACIONES:',
            error
          );

        }

      });


    this.notificationService
      .getUnreadCount()
      .subscribe({

        next: (
          count:
            number
        ) => {

          this.unreadNotifications =
            Number(
              count ||
              0
            );

        },

        error: (
          error: any
        ) => {

          console.error(
            'ERROR EN CONTADOR DE NOTIFICACIONES:',
            error
          );

        }

      });


    this.loadNotifications();

    // Esperamos la carga inicial para que las notificaciones
    // antiguas no aparezcan como Toast al entrar al sistema.
    setTimeout(
      () => {

        for (
          const notification
          of this.notifications
        ) {

          const id =
            String(
              notification?.id ||
              ''
            );

          if (id) {

            this.knownNotificationIds.add(
              id
            );

          }

        }

        this.notificationSnapshotReady =
          true;

      },
      1600
    );

    this.startNotificationAutoRefresh();

  }


  // =========================================================
  // NOTIFICACIONES — ACTUALIZACIÓN AUTOMÁTICA
  // =========================================================

  private startNotificationAutoRefresh():
    void {

    if (
      this.notificationRefreshTimer
    ) {
      return;
    }

    this.notificationRefreshTimer =
      setInterval(
        () => {

          this.loadNotifications(
            true
          );

        },
        this.notificationRefreshMs
      );

  }


  private stopNotificationAutoRefresh():
    void {

    if (
      !this.notificationRefreshTimer
    ) {
      return;
    }

    clearInterval(
      this.notificationRefreshTimer
    );

    this.notificationRefreshTimer =
      null;

  }


  // =========================================================
  // NOTIFICACIONES — CARGAR
  // =========================================================

  loadNotifications(
    silent: boolean = false
  ): void {

    if (!silent) {
      this.notificationLoading =
        true;
    }

    this.notificationService
      .loadNotifications();

    this.notificationService
      .loadUnreadNotifications();

    if (!silent) {

      setTimeout(
        () => {

          this.notificationLoading =
            false;

        },
        700
      );

    }

  }


  // =========================================================
  // NOTIFICACIONES — FILTROS
  // =========================================================

  get filteredNotifications():
    any[] {

    return this.notifications
      .filter(
        (
          notification:
            any
        ) => {

          const category =
            this.getNotificationCategory(
              notification
            );

          if (
            this.notificationFilter ===
              'no-leidas'
            &&
            notification?.read ===
              true
          ) {
            return false;
          }

          if (
            this.notificationFilter ===
              'accesos'
            &&
            category !==
              'accesos'
          ) {
            return false;
          }

          if (
            this.notificationFilter ===
              'cuenta'
            &&
            category !==
              'cuenta'
          ) {
            return false;
          }

          if (
            this.notificationFilter ===
              'biometria'
            &&
            category !==
              'biometria'
          ) {
            return false;
          }

          return true;

        }
      );

  }


  get notificationTotal():
    number {

    return this.notifications
      .length;

  }


  get notificationAccessCount():
    number {

    return this.notifications
      .filter(
        notification =>
          this.getNotificationCategory(
            notification
          ) ===
          'accesos'
      )
      .length;

  }


  get notificationAccountCount():
    number {

    return this.notifications
      .filter(
        notification =>
          this.getNotificationCategory(
            notification
          ) ===
          'cuenta'
      )
      .length;

  }


  // =========================================================
  // NOTIFICACIONES — TIPO / PRESENTACIÓN
  // =========================================================

  getNotificationCategory(
    notification: any
  ):
    'accesos' |
    'cuenta' |
    'biometria' |
    'sistema' {

    const type =
      String(
        notification?.type ||
        ''
      )
        .trim()
        .toLowerCase();

    if (
      type.includes(
        'access'
      )
      ||
      type.includes(
        'entry'
      )
      ||
      type.includes(
        'exit'
      )
    ) {
      return 'accesos';
    }

    if (
      type.includes(
        'account'
      )
      ||
      type.includes(
        'user_updated'
      )
      ||
      type.includes(
        'profile'
      )
    ) {
      return 'cuenta';
    }

    if (
      type.includes(
        'fingerprint'
      )
      ||
      type.includes(
        'biometric'
      )
    ) {
      return 'biometria';
    }

    return 'sistema';

  }


  getNotificationCategoryLabel(
    notification: any
  ): string {

    switch (
      this.getNotificationCategory(
        notification
      )
    ) {

      case 'accesos':
        return 'Acceso';

      case 'cuenta':
        return 'Mi cuenta';

      case 'biometria':
        return 'Biometría';

      default:
        return 'Sistema';

    }

  }


  getNotificationIcon(
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
      type ===
        'access_entry'
      ||
      type.includes(
        'entry'
      )
    ) {
      return 'fa-arrow-right-to-bracket';
    }

    if (
      type ===
        'access_exit'
      ||
      type.includes(
        'exit'
      )
    ) {
      return 'fa-arrow-right-from-bracket';
    }

    if (
      type.includes(
        'account'
      )
      ||
      type.includes(
        'user_updated'
      )
    ) {
      return 'fa-user-pen';
    }

    if (
      type.includes(
        'fingerprint'
      )
      ||
      type.includes(
        'biometric'
      )
    ) {
      return 'fa-fingerprint';
    }

    return 'fa-bell';

  }


  getNotificationTone(
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
      type.includes(
        'exit'
      )
    ) {
      return 'exit';
    }

    if (
      type.includes(
        'entry'
      )
      ||
      type.includes(
        'access'
      )
    ) {
      return 'entry';
    }

    if (
      type.includes(
        'account'
      )
      ||
      type.includes(
        'user_updated'
      )
    ) {
      return 'account';
    }

    if (
      type.includes(
        'fingerprint'
      )
      ||
      type.includes(
        'biometric'
      )
    ) {
      return 'biometric';
    }

    return 'system';

  }


  // =========================================================
  // NOTIFICACIONES — FECHA
  // =========================================================

  private getNotificationTimestamp(
    notification: any
  ): number {

    const raw =
      notification?.created_at ||
      notification?.createdAt ||
      notification?.timestamp ||
      '';

    if (!raw) {
      return 0;
    }

    if (
      typeof raw?.toDate ===
      'function'
    ) {

      return raw
        .toDate()
        .getTime();

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


  formatNotificationDate(
    notification: any
  ): string {

    const timestamp =
      this.getNotificationTimestamp(
        notification
      );

    if (!timestamp) {
      return 'Sin fecha';
    }

    return new Date(
      timestamp
    )
      .toLocaleString(
        'es-CO',
        {
          dateStyle:
            'medium',
          timeStyle:
            'short'
        }
      );

  }


  // =========================================================
  // NOTIFICACIONES — LEER
  // =========================================================

  markNotificationAsRead(
    notification: any
  ): void {

    if (
      !notification?.id ||
      notification?.read ===
        true
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
      this.unreadNotifications ===
      0
    ) {
      return;
    }

    this.notificationService
      .markAllAsRead();

  }


  // =========================================================
  // NOTIFICACIONES — TOAST EN TIEMPO REAL
  // =========================================================

  private showNotificationToast(
    notification: any
  ): void {

    const category =
      this.getNotificationCategory(
        notification
      );

    const icon:
      'success' |
      'info' =
        category ===
          'accesos'
          ? 'success'
          : 'info';

    Swal.fire({

      toast:
        true,

      position:
        'top-end',

      icon:
        icon,

      title:
        notification?.title ||
        'Nueva notificación',

      text:
        notification?.message ||
        '',

      showConfirmButton:
        false,

      timer:
        3500,

      timerProgressBar:
        true

    });

  }


  // =========================================================
  // FOTO
  // =========================================================

  uploadPhoto(
    event: any
  ): void {

    const file =
      event?.target?.files?.[0];

    if (!file) {
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


  // =========================================================
  // ACTUALIZAR PERFIL
  // =========================================================

  async updateProfile():
    Promise<void> {

    if (
      !this.currentUser
    ) {

      Swal.fire(
        'Error',
        'No se encontró el usuario actual.',
        'error'
      );

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

        // El Aprendiz solamente puede editar estos campos.
        // Nombre, tipo de documento, documento y rol
        // son campos protegidos y NO se envían al backend.
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

          next: () => {

            Swal.fire({
              icon: 'success',
              title:
                'Perfil actualizado',
              text:
                'Tus datos fueron actualizados correctamente.',
              timer:
                1800,
              showConfirmButton:
                false
            });

            this.selectedPhoto =
              null;

            this.loadProfile();

          },

          error: (
            err: any
          ) => {

            console.error(
              'ERROR ACTUALIZANDO PERFIL:',
              err
            );

            Swal.fire({
              icon: 'error',
              title:
                'No se pudo actualizar',
              text:
                err?.error?.message ||
                err?.error?.detail ||
                'No fue posible actualizar tus datos.'
            });

          }

        });

    } catch (
      error
    ) {

      console.error(
        'ERROR SUBIENDO FOTO:',
        error
      );

      Swal.fire({
        icon: 'error',
        title: 'Error',
        text:
          'No fue posible subir la foto.'
      });

    }

  }


  // =========================================================
  // LOGOUT
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
    }).then(
      result => {

        if (
          result.isConfirmed
        ) {

          this.router.navigate(
            [
              '/login'
            ]
          );

        }

      }
    );

  }

}
