import { Component, OnInit, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';
import { AuthService } from '../../../core/services/auth.service';

import { DashboardService } from '../../../core/services/dashboard.service';
import { NotificationService } from '../../../core/services/notification.service';


interface User {
  uid: string;
  name: string;
  email: string;
  role: string;
  active: boolean;

  documentType?: 'CC' | 'TI' | '';
  document_type?: 'CC' | 'TI' | '';
  document?: string;

  phone?: string;
  address?: string;
  photo?: string;

  created_at?: string;
  createdAt?: string;
  status?: string;
}

interface AuditLog {
  id: string;

  action: string;
  category: string;

  actor_uid: string;
  actor_name: string;
  actor_email: string;
  actor_role: string;

  target_uid: string;
  target_name: string;
  target_email: string;

  description: string;

  changes: {
    [key: string]: {
      before: any;
      after: any;
    };
  };

  metadata: any;

  created_at: string;
}

interface Invitation {
  id: string;
  email: string;
  role: string;
  created_at: string;
  expires_at?: string;
  accepted?: boolean;
  used?: boolean;
  sent?: boolean;
}

interface AccessLog {
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

@Component({
  selector: 'app-super-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './super-admin.component.html',
  styleUrls: ['./super-admin.component.css']
})
export class SuperAdminComponent implements OnInit {

  constructor(
    private dashboardService: DashboardService,
    private router: Router,
    private zone: NgZone,
    private authService: AuthService,
    private notificationService: NotificationService
  ) { }

  // ==========================
  //  VARIABLES QUE FALTABAN (NO BORRO NADA)
  // ==========================
  currentUser: User | null = null;

  profile = {
    name: '',
    email: '',
    phone: '',
    address: '',
    documentType: '' as 'CC' | 'TI' | '',
    document_type: '' as 'CC' | 'TI' | '',
    document: '',
    photo: '',
    role: '',
    uid: '',
    status: 'Activo'
  };



  showModal = false;
  isEditing = false;

  // ==========================
  // FOTO DE PERFIL
  // ==========================
  selectedPhoto: File | null = null;

  // ==========================
  // SIDEBAR
  // ==========================
  menuOpen = true;
  activeSection: string = 'dashboard';

  menuItems = [
    { key: 'dashboard', label: 'Dashboard', icon: 'fa-home' },
    { key: 'users', label: 'Usuarios', icon: 'fa-users' },
    { key: 'admins', label: 'Admins', icon: 'fa-user-shield' },
    { key: 'access', label: 'Accesos', icon: 'fa-door-open' },
    { key: 'roles', label: 'Roles', icon: 'fa-id-badge' },
    { key: 'invitations', label: 'Invitaciones', icon: 'fa-envelope' },
    { key: 'reports', label: 'Reportes', icon: 'fa-chart-bar' },
    { key: 'notifications', label: 'Notificaciones', icon: 'fa-bell' },
    { key: 'profile', label: 'Perfil', icon: 'fa-user' },
    { key: 'audit', label: 'Auditoría', icon: 'fa-clock-rotate-left' }
  ];

  setSection(section: string): void {

    this.activeSection = section;

    if (
      section === 'reports' ||
      section === 'access'
    ) {

      this.loadAccessLogs();

    }

    if (
      section === 'audit'
    ) {

      this.loadAuditLogs();

    }

  }


  isActive(section: string): boolean { return this.activeSection === section; }
  toggleMenu(): void { this.menuOpen = !this.menuOpen; }




  // ==========================
  // DATA
  // ==========================
  useRealtime = false;

  accesses: User[] = [];
  filteredUsers: User[] = [];

  // ==========================================================
  // USUARIOS - FILTROS Y PAGINACIÓN
  // ==========================================================

  userSearch = '';

  userRoleFilter = 'todos';

  userStatusFilter = 'todos';

  userDocumentTypeFilter = 'todos';

  userPageSize = 10;

  userCurrentPage = 1;

  admins: User[] = [];
  accessLogs: AccessLog[] = [];

  // ==========================================================
  // ACCESOS - FILTROS Y PAGINACIÓN
  // ==========================================================

  accessSearch = '';

  accessStatusFilter:
    'todos' |
    'permitido' |
    'denegado' = 'todos';

  accessTypeFilter:
    'todos' |
    'entrada' |
    'salida' = 'todos';

  accessMethodFilter = 'todos';

  accessPageSize = 10;

  accessCurrentPage = 1;
  // ==========================
  // REPORTES
  // ==========================

  reportLoading = false;

  reportSearch = '';

  reportFrom = '';

  reportTo = '';

  reportStatus:
    'todos' |
    'permitido' |
    'denegado' = 'todos';

  reportType:
    'todos' |
    'entrada' |
    'salida' = 'todos';

  reportRole = 'todos';
  invitations: Invitation[] = [];
  notifications: any[] = [];
  unreadNotifications = 0;
  auditLogs: AuditLog[] = [];

  auditSearch = '';

  auditAction = 'todos';

  auditDate = '';

  auditLoading = false;
  roles: any[] = [
    {
      name: 'Aprendiz',
      description: 'Usuarios con rol de aprendiz',
      users: 0
    },
    {
      name: 'Administrador',
      description: 'Administradores del sistema',
      users: 0
    },
    {
      name: 'Super Admin',
      description: 'Administradores principales del sistema',
      users: 0
    },
    {
      name: 'Instructor',
      description: 'Usuarios con rol de instructor',
      users: 0
    },
    {
      name: 'Vigilante',
      description: 'Usuarios encargados de vigilancia',
      users: 0
    },
    {
      name: 'Usuario',
      description: 'Usuarios generales del sistema',
      users: 0
    }
  ];

  stats = {
    total_users: 0,
    admins: 0,
    invitations: 0,
    acceptedInvitations: 0,
    pendingInvitations: 0,
    today_access: 0,
    denied_access: 0,
    aprendices: 0,
    instructores: 0,
    vigilantes: 0,
    superAdmins: 0
  };

  lastSnapshot: User[] = [];




  // ==========================
  // DOCUMENTO - NORMALIZACIÓN
  // ==========================

  private documentDataCache =
    new Map<string, { type: 'CC' | 'TI' | ''; document: string }>();

  private normalizeDocumentType(value: any): 'CC' | 'TI' | '' {

    const normalized =
      String(value ?? '')
        .trim()
        .toUpperCase();

    if (normalized === 'CC' || normalized === 'TI') {
      return normalized;
    }

    return '';
  }

  private getDocumentTypeFrom(user: any): 'CC' | 'TI' | '' {

    const rawValue =
      user?.document_type ??
      user?.documentType ??
      user?.tipo_documento ??
      user?.tipoDocumento ??
      user?.document_type_code ??
      user?.documentTypeCode ??
      user?.profile?.document_type ??
      user?.profile?.documentType ??
      user?.data?.document_type ??
      user?.data?.documentType ??
      '';

    const directType =
      this.normalizeDocumentType(rawValue);

    if (directType) {
      return directType;
    }

    const uidKey =
      String(
        user?.uid ||
        user?.id ||
        ''
      ).trim();

    const emailKey =
      String(
        user?.email ||
        ''
      )
        .trim()
        .toLowerCase();

    const cachedByUid =
      uidKey
        ? this.documentDataCache.get(`uid:${uidKey}`)
        : undefined;

    if (cachedByUid?.type) {
      return cachedByUid.type;
    }

    const cachedByEmail =
      emailKey
        ? this.documentDataCache.get(`email:${emailKey}`)
        : undefined;

    return cachedByEmail?.type || '';
  }

  private rememberDocumentData(
    uid: string | undefined,
    email: string | undefined,
    type: 'CC' | 'TI' | '',
    document: string
  ): void {

    const normalizedType =
      this.normalizeDocumentType(type);

    const normalizedDocument =
      String(document || '').trim();

    const uidKey =
      String(uid || '').trim();

    const emailKey =
      String(email || '')
        .trim()
        .toLowerCase();

    const value = {
      type: normalizedType,
      document: normalizedDocument
    };

    if (uidKey) {
      this.documentDataCache.set(
        `uid:${uidKey}`,
        value
      );
    }

    if (emailKey) {
      this.documentDataCache.set(
        `email:${emailKey}`,
        value
      );
    }
  }

  private mapUser(user: any): User {

    const documentType =
      this.getDocumentTypeFrom(user);

    const uid =
      user?.uid ||
      user?.id ||
      '';

    const email =
      user?.email ||
      '';

    let document =
      String(
        user?.document ??
        user?.document_number ??
        user?.documentNumber ??
        user?.numero_documento ??
        user?.numeroDocumento ??
        ''
      ).trim();

    if (!document) {

      const uidKey =
        String(uid || '').trim();

      const emailKey =
        String(email || '')
          .trim()
          .toLowerCase();

      const cached =
        (uidKey
          ? this.documentDataCache.get(`uid:${uidKey}`)
          : undefined) ||
        (emailKey
          ? this.documentDataCache.get(`email:${emailKey}`)
          : undefined);

      document =
        cached?.document ||
        '';
    }

    const mapped: User = {

      uid,

      name:
        user?.name ||
        '',

      email,

      role:
        user?.role ||
        '',

      active:
        user?.active ?? true,

      documentType,

      document_type:
        documentType,

      document,

      phone:
        user?.phone ||
        '',

      address:
        user?.address ||
        '',

      photo:
        user?.photo ||
        'assets/avatar.png',

      created_at:
        user?.created_at ||
        user?.createdAt ||
        '',

      createdAt:
        user?.createdAt ||
        user?.created_at ||
        '',

      status:
        user?.status ??
        (user?.active === false
          ? 'Inactivo'
          : 'Activo')

    };

    if (documentType || document) {
      this.rememberDocumentData(
        mapped.uid,
        mapped.email,
        documentType,
        document
      );
    }

    return mapped;
  }

  private mergeUsersPreservingDocumentData(
    incomingUsers: User[]
  ): User[] {

    const currentByUid =
      new Map<string, User>();

    const currentByEmail =
      new Map<string, User>();

    this.accesses.forEach(user => {

      if (user.uid) {
        currentByUid.set(
          user.uid,
          user
        );
      }

      if (user.email) {
        currentByEmail.set(
          user.email.trim().toLowerCase(),
          user
        );
      }

    });

    return incomingUsers.map(incoming => {

      const existing =
        (incoming.uid
          ? currentByUid.get(incoming.uid)
          : undefined) ||
        (incoming.email
          ? currentByEmail.get(
            incoming.email.trim().toLowerCase()
          )
          : undefined);

      const existingType =
        existing
          ? this.getDocumentTypeFrom(existing)
          : '';

      const incomingType =
        this.getDocumentTypeFrom(incoming);

      const finalType =
        incomingType ||
        existingType ||
        '';

      const finalDocument =
        incoming.document ||
        existing?.document ||
        '';

      const merged: User = {
        ...existing,
        ...incoming,
        documentType: finalType,
        document_type: finalType,
        document: finalDocument
      };

      if (finalType || finalDocument) {
        this.rememberDocumentData(
          merged.uid,
          merged.email,
          finalType,
          finalDocument
        );
      }

      return merged;
    });
  }

  private updateLocalDocumentData(
    uid: string | undefined,
    email: string | undefined,
    type: 'CC' | 'TI' | '',
    document: string
  ): void {

    const normalizedType =
      this.normalizeDocumentType(type);

    this.rememberDocumentData(
      uid,
      email,
      normalizedType,
      document
    );

    const normalizedEmail =
      String(email || '')
        .trim()
        .toLowerCase();

    this.accesses =
      this.accesses.map(user => {

        const sameUser =
          (!!uid && user.uid === uid) ||
          (
            !!normalizedEmail &&
            user.email.trim().toLowerCase() === normalizedEmail
          );

        if (!sameUser) {
          return user;
        }

        return {
          ...user,
          documentType: normalizedType,
          document_type: normalizedType,
          document
        };
      });

    this.filteredUsers =
      [...this.accesses];

    this.syncData();
  }


  // ==========================
  // INIT
  // ==========================
  ngOnInit(): void {
    this.loadUsers();
    this.safeRealtime();
    this.loadInvitations();
    this.loadNotifications();
    this.loadProfile();
    this.loadAccessLogs();
    this.loadAuditLogs();
  }

  // ==========================
  //  NOTIFICACIONES
  // ==========================

  loadNotifications(): void {

    this.notificationService
      .getNotifications()
      .subscribe({

        next: (notifications: any[]) => {

          console.log(
            '🔔 NOTIFICACIONES:',
            notifications
          );

          this.notifications =
            notifications || [];

          this.unreadNotifications =
            this.notifications.filter(
              n =>
                n.read === false ||
                n.read === undefined
            ).length;

        },

        error: (error: any) => {

          console.error(
            ' ERROR CARGANDO NOTIFICACIONES:',
            error
          );

        }

      });

    // También cargamos el contador

    this.notificationService
      .getUnreadCount()
      .subscribe({

        next: (count: number) => {

          this.unreadNotifications =
            count;

        }

      });

    // Ordenamos al servicio que consulte el backend

    this.notificationService
      .loadNotifications();

  }

  // ==========================
  //  REALTIME SEGURO (FIX REAL)
  // ==========================
  safeRealtime(): void {
    try {
      this.listenUsersRealtime();
    } catch (e) {
      console.warn(' Firestore no disponible');
    }
  }

  listenUsersRealtime(): void {

    if (!this.useRealtime) {
      return;
    }

    try {

      const obs =
        (this.dashboardService as any)
          .getUsersRealtime?.();

      if (!obs) {
        return;
      }

      obs.subscribe({

        next: (users: any[]) => {

          this.zone.run(() => {

            const mapped: User[] =
              (users || [])
                .map((user: any) =>
                  this.mapUser(user)
                );

            const merged =
              this.mergeUsersPreservingDocumentData(
                mapped
              );

            console.log(
              '🔥 REALTIME USERS:',
              merged
            );

            if (merged.length > 0) {

              this.accesses =
                merged;

              this.filteredUsers =
                [...merged];

              this.lastSnapshot =
                [...merged];

              this.syncData();

            } else {

              console.warn(
                'Firestore vacío → NO se sobreescribe Django'
              );

            }

          });

        },

        error: (err: any) => {

          console.error(
            'Error realtime:',
            err
          );

        }

      });

    } catch (error) {

      console.warn(
        'Error realtime:',
        error
      );

    }

  }

  // ==========================
  //  LOAD BACKEND (CLAVE)
  // ==========================
  loadUsers(): void {

    this.dashboardService
      .getUsers()
      .subscribe({

        next: (res: any) => {

          console.log(
            '📡 RESPUESTA DJANGO:',
            res
          );

          const users =
            res?.users ||
            res?.data?.users ||
            res?.results ||
            res ||
            [];

          if (
            !Array.isArray(users) ||
            users.length === 0
          ) {

            console.warn(
              'Django devolvió usuarios vacíos'
            );

            return;
          }

          const mapped: User[] =
            users.map((user: any) =>
              this.mapUser(user)
            );

          const merged =
            this.mergeUsersPreservingDocumentData(
              mapped
            );

          console.log(
            '✅ DJANGO USERS MAPEADOS:',
            merged
          );

          this.accesses =
            merged;

          this.filteredUsers =
            [...merged];

          this.lastSnapshot =
            [...merged];

          const firebaseUser =
            this.authService.getUser();

          if (firebaseUser) {

            const me =
              merged.find(
                (u: User) =>
                  u.uid === firebaseUser.uid ||
                  u.email === firebaseUser.email
              );

            if (me) {

              this.currentUser =
                me;

              const documentType =
                this.getDocumentTypeFrom(me);

              this.profile = {

                name:
                  me.name ||
                  '',

                email:
                  me.email ||
                  '',

                phone:
                  me.phone ||
                  '',

                address:
                  me.address ||
                  '',

                documentType,

                document_type:
                  documentType,

                document:
                  me.document ||
                  '',

                photo:
                  me.photo ||
                  'assets/avatar.png',

                role:
                  me.role ||
                  'Super Administrador',

                uid:
                  me.uid ||
                  '',

                status:
                  me.status ??
                  (me.active === false
                    ? 'Inactivo'
                    : 'Activo')

              };

            }

          }

          this.syncData();

        },

        error: (err: any) => {

          console.error(
            '❌ ERROR BACKEND:',
            err
          );

        }

      });

  }

  // ==========================
  // SYNC
  // ==========================
  syncData(): void {

    // ==========================================
    // ADMINISTRADORES
    // ==========================================

    this.admins = this.accesses.filter(
      u =>
        u.role === 'administrador' ||
        u.role === 'super-admin'
    );


    // ==========================================
    // ESTADÍSTICAS GENERALES
    // ==========================================

    this.stats.total_users = this.accesses.length;

    this.stats.admins = this.admins.length;

    this.stats.aprendices =
      this.accesses.filter(
        u => u.role === 'aprendiz'
      ).length;

    this.stats.instructores =
      this.accesses.filter(
        u => u.role === 'instructor'
      ).length;

    this.stats.vigilantes =
      this.accesses.filter(
        u => u.role === 'vigilante'
      ).length;

    this.stats.superAdmins =
      this.accesses.filter(
        u => u.role === 'super-admin'
      ).length;


    // ==========================================
    // INVITACIONES
    // ==========================================

    this.stats.invitations =
      this.invitations.length;

    this.stats.acceptedInvitations =
      this.invitations.filter(
        i => i.used || i.accepted
      ).length;

    this.stats.pendingInvitations =
      this.invitations.filter(
        i => !(i.used || i.accepted)
      ).length;


    // ==========================================
    // ROLES
    // ==========================================

    this.roles = [

      {
        name: 'Aprendiz',
        description: 'Usuarios con rol de aprendiz',
        users: this.accesses.filter(
          u => u.role?.toLowerCase() === 'aprendiz'
        ).length
      },

      {
        name: 'Administrador',
        description: 'Administradores del sistema',
        users: this.accesses.filter(
          u => u.role?.toLowerCase() === 'administrador'
        ).length
      },

      {
        name: 'Super Admin',
        description: 'Administradores principales del sistema',
        users: this.accesses.filter(
          u => u.role?.toLowerCase() === 'super-admin'
        ).length
      },

      {
        name: 'Instructor',
        description: 'Usuarios con rol de instructor',
        users: this.accesses.filter(
          u => u.role?.toLowerCase() === 'instructor'
        ).length
      },

      {
        name: 'Vigilante',
        description: 'Usuarios encargados de vigilancia',
        users: this.accesses.filter(
          u => u.role?.toLowerCase() === 'vigilante'
        ).length
      },

      {
        name: 'Usuario',
        description: 'Usuarios generales del sistema',
        users: this.accesses.filter(
          u => u.role?.toLowerCase() === 'usuario'
        ).length
      }

    ];

  }

  // ==========================================================
  // REPORTES - CARGAR ACCESOS
  // ==========================================================

  loadAccessLogs(): void {

    this.reportLoading = true;

    this.dashboardService
      .getAccesses()
      .subscribe({

        next: (res: any) => {

          const logs =
            res?.accesses ||
            res?.logs ||
            res?.results ||
            res ||
            [];

          this.accessLogs =
            Array.isArray(logs)
              ? logs.map(
                (access: any): AccessLog => {

                  const status =
                    String(
                      access.status ||
                      access.result ||
                      ''
                    )
                      .trim()
                      .toLowerCase();

                  let allowed = true;

                  if (
                    typeof access.allowed === 'boolean'
                  ) {

                    allowed =
                      access.allowed;

                  } else if (
                    typeof access.granted === 'boolean'
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
                    ].includes(status)
                  ) {

                    allowed = false;

                  } else if (
                    [
                      'permitido',
                      'allowed',
                      'aprobado',
                      'approved',
                      'granted',
                      'exitoso',
                      'success'
                    ].includes(status)
                  ) {

                    allowed = true;

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
                      rawType === 'salida' ||
                      rawType === 'exit' ||
                      rawType.includes('sal')
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
                      this.normalizeAccessDate(
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


          this.accessLogs.sort(
            (
              a: AccessLog,
              b: AccessLog
            ) => {

              const dateA =
                this.parseAccessDate(
                  a.date
                )?.getTime() || 0;

              const dateB =
                this.parseAccessDate(
                  b.date
                )?.getTime() || 0;

              return dateB - dateA;

            }
          );


          this.calculateReportStats();

          this.reportLoading = false;

        },


        error: (err: any) => {

          console.error(
            'ERROR CARGANDO ACCESOS PARA REPORTES:',
            err
          );

          this.accessLogs = [];

          this.calculateReportStats();

          this.reportLoading = false;

        }

      });

  }


  // ==========================================================
  // FECHA DE ACCESO
  // ==========================================================

  private parseAccessDate(
    value: any
  ): Date | null {

    if (!value) {
      return null;
    }


    if (
      typeof value?.toDate === 'function'
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
      typeof value?.seconds === 'number'
    ) {

      const date =
        new Date(
          value.seconds * 1000
        );

      return isNaN(
        date.getTime()
      )
        ? null
        : date;

    }


    const date =
      new Date(value);

    return isNaN(
      date.getTime()
    )
      ? null
      : date;

  }


  private normalizeAccessDate(
    value: any
  ): string {

    const date =
      this.parseAccessDate(
        value
      );

    return date
      ? date.toISOString()
      : '';

  }


  // ==========================================================
  // ESTADÍSTICAS DE ACCESO
  // ==========================================================

  calculateReportStats(): void {

    const today =
      new Date();

    this.stats.today_access =
      this.accessLogs.filter(
        log => {

          const date =
            this.parseAccessDate(
              log.date
            );

          if (!date) {
            return false;
          }

          return (
            date.getDate() ===
            today.getDate() &&

            date.getMonth() ===
            today.getMonth() &&

            date.getFullYear() ===
            today.getFullYear()
          );

        }
      ).length;


    this.stats.denied_access =
      this.accessLogs.filter(
        log =>
          !log.allowed
      ).length;

  }


  // ==========================================================
  // REGISTROS FILTRADOS
  // ==========================================================

  get filteredReportLogs():
    AccessLog[] {

    const search =
      this.reportSearch
        .trim()
        .toLowerCase();


    let fromDate:
      Date | null = null;

    let toDate:
      Date | null = null;


    if (this.reportFrom) {

      fromDate =
        new Date(
          `${this.reportFrom}T00:00:00`
        );

    }


    if (this.reportTo) {

      toDate =
        new Date(
          `${this.reportTo}T23:59:59.999`
        );

    }


    return this.accessLogs
      .filter(
        (log: AccessLog) => {

          const date =
            this.parseAccessDate(
              log.date
            );


          if (
            fromDate &&
            (
              !date ||
              date < fromDate
            )
          ) {

            return false;

          }


          if (
            toDate &&
            (
              !date ||
              date > toDate
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
          a: AccessLog,
          b: AccessLog
        ) => {

          const dateA =
            this.parseAccessDate(
              a.date
            )?.getTime() || 0;

          const dateB =
            this.parseAccessDate(
              b.date
            )?.getTime() || 0;

          return dateB - dateA;

        }
      );

  }


  // ==========================================================
  // MÉTRICAS FILTRADAS
  // ==========================================================

  get reportAllowed(): number {

    return this.filteredReportLogs
      .filter(
        log =>
          log.allowed
      )
      .length;

  }


  get reportDenied(): number {

    return this.filteredReportLogs
      .filter(
        log =>
          !log.allowed
      )
      .length;

  }


  get reportEntries(): number {

    return this.filteredReportLogs
      .filter(
        log =>
          log.type ===
          'entrada'
      )
      .length;

  }


  get reportExits(): number {

    return this.filteredReportLogs
      .filter(
        log =>
          log.type ===
          'salida'
      )
      .length;

  }


  get reportSuccessRate(): number {

    const total =
      this.filteredReportLogs.length;

    if (!total) {
      return 0;
    }

    return Math.round(
      (
        this.reportAllowed /
        total
      ) * 100
    );

  }


  // ==========================================================
  // ROLES DISPONIBLES EN REPORTE
  // ==========================================================

  get reportRoles(): string[] {

    const values =
      this.accessLogs
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
          values.push(role);
        }

      }
    );


    return [
      ...new Set(values)
    ]
      .sort();

  }


  // ==========================================================
  // PORCENTAJE POR ROL
  // ==========================================================

  getRolePercentage(
    users: number
  ): number {

    if (
      !this.stats.total_users
    ) {

      return 0;

    }

    return Math.round(
      (
        users /
        this.stats.total_users
      ) * 100
    );

  }


  // ==========================================================
  // NOMBRE DEL ROL
  // ==========================================================

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

        return 'Super Administrador';


      case 'administrador':

        return 'Administrador';


      case 'vigilante':

        return 'Vigilante';


      case 'aprendiz':

        return 'Aprendiz';


      case 'instructor':

        return 'Instructor';


      case 'usuario':

        return 'Usuario';


      default:

        return role ||
          'Sin rol';

    }

  }


  // ==========================================================
  // ICONO SEGÚN MÉTODO
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

      return 'fa-fingerprint';

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

      return 'fa-id-card';

    }


    if (
      value.includes(
        'qr'
      )
    ) {

      return 'fa-qrcode';

    }


    return 'fa-key';

  }


  // ==========================================================
  // LIMPIAR FILTROS
  // ==========================================================

  resetReportFilters(): void {

    this.reportSearch = '';

    this.reportFrom = '';

    this.reportTo = '';

    this.reportStatus =
      'todos';

    this.reportType =
      'todos';

    this.reportRole =
      'todos';

  }


  // ==========================================================
  // FORMATEAR FECHA PARA EXPORTAR
  // ==========================================================

  private formatReportDate(
    value: any
  ): string {

    const date =
      this.parseAccessDate(
        value
      );

    if (!date) {
      return '';
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
  // ESCAPAR CSV
  // ==========================================================

  private csvValue(
    value: any
  ): string {

    return `"${String(
      value ?? ''
    ).replace(
      /"/g,
      '""'
    )}"`;

  }


  // ==========================================================
  // EXPORTAR CSV
  // ==========================================================

  exportReportCsv(): void {

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
                  this.csvValue(
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
      `segurentry-reporte-${today}.csv`;


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
  // SEGURIDAD PARA IMPRESIÓN
  // ==========================================================

  private escapeReportHtml(
    value: any
  ): string {

    return String(
      value ?? ''
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
  // IMPRIMIR / GUARDAR PDF
  // ==========================================================

  printReport(): void {

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
        title: 'Ventana bloqueada',
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
          )
            }
            </td>

            <td>
              ${this.escapeReportHtml(
              log.user
            )
            }
            </td>

            <td>
              ${this.escapeReportHtml(
              log.document
            )
            }
            </td>

            <td>
              ${this.escapeReportHtml(
              this.formatRoleName(
                log.role
              )
            )
            }
            </td>

            <td>
              ${log.type === 'salida'
              ? 'Salida'
              : 'Entrada'
            }
            </td>

            <td>
              ${this.escapeReportHtml(
              log.method ||
              'No especificado'
            )
            }
            </td>

            <td>
              ${log.allowed
              ? 'Permitido'
              : 'Denegado'
            }
            </td>

          </tr>

        `
        )
        .join('');


    printWindow.document.write(`

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

          padding: 32px;

          color: #111827;
        }

        .header {
          border-bottom:
            3px solid #16a34a;

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
            repeat(4, 1fr);

          gap:
            12px;

          margin-bottom:
            24px;
        }

        .summary div {
          border:
            1px solid #e2e8f0;

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
            1px solid #e2e8f0;

          padding:
            8px;

          text-align:
            left;
        }

        th {
          background:
            #f8fafc;
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
          Reporte general del sistema
        </strong>

        <p>
          Generado:
          ${this.escapeReportHtml(
      new Date()
        .toLocaleString(
          'es-CO'
        )
    )
      }
        </p>

      </div>


      <div class="summary">

        <div>

          <strong>
            ${this.stats.total_users}
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

          ${rows ||
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
        Reporte generado desde el panel Super Administrador

      </div>

    </body>

    </html>

  `);


    printWindow.document.close();

    printWindow.focus();


    setTimeout(
      () => {

        printWindow.print();

      },
      300
    );

  }

  // ==========================
  // FORM
  // ==========================

  showForm = false;

  editMode = false;

  form: User = {
    uid: '',
    name: '',
    email: '',
    role: '',
    active: true,

    documentType: '',
    document_type: '',

    document: '',
    phone: '',
    address: ''
  };


  // ==========================
  // ABRIR FORMULARIO
  // ==========================

  openForm(): void {
    this.resetForm();
    this.editMode = false;
    this.isEditing = false;
    this.showForm = true;
    this.showModal = true;
  }


  // ==========================
  // CERRAR FORMULARIO
  // ==========================

  closeForm(): void {
    this.resetForm();
    this.showForm = false;
    this.showModal = false;
    this.editMode = false;
    this.isEditing = false;
  }


  // ==========================
  // LIMPIAR FORMULARIO
  // ==========================

  resetForm(): void {

    this.form = {
      uid: '',
      name: '',
      email: '',
      role: '',
      active: true,

      documentType: '',
      document_type: '',

      document: '',
      phone: '',
      address: ''
    };

  }


  // ==========================
  // EDITAR USUARIO
  // ==========================

  editAccess(user: User): void {

    const documentType =
      this.getDocumentTypeFrom(user);

    this.form = {

      uid:
        user.uid || '',

      name:
        user.name || '',

      email:
        user.email || '',

      role:
        user.role || '',

      active:
        user.active !== false,

      documentType,

      document_type:
        documentType,

      document:
        user.document || '',

      phone:
        user.phone || '',

      address:
        user.address || '',

      photo:
        user.photo || '',

      created_at:
        user.created_at || '',

      createdAt:
        user.createdAt || '',

      status:
        user.status || ''

    };

    this.editMode = true;
    this.showForm = true;
    this.isEditing = true;
    this.showModal = true;

  }

  // ==========================
  // CRUD
  // ==========================
  saveAccess(): void {

    const name =
      this.form.name
        ?.trim();

    const email =
      this.form.email
        ?.trim();

    const role =
      this.form.role
        ?.trim();

    const document =
      this.form.document
        ?.trim();

    const documentType =
      this.normalizeDocumentType(
        this.form.documentType ||
        this.form.document_type ||
        ''
      );

    if (!name) {

      Swal.fire({
        icon: 'warning',
        title: 'Nombre requerido',
        text: 'Ingresa el nombre completo del usuario.'
      });

      return;
    }

    if (!email) {

      Swal.fire({
        icon: 'warning',
        title: 'Correo requerido',
        text: 'Ingresa el correo electrónico del usuario.'
      });

      return;
    }

    if (!documentType) {

      Swal.fire({
        icon: 'warning',
        title: 'Tipo de documento requerido',
        text:
          'Selecciona Cédula de Ciudadanía (CC) o Tarjeta de Identidad (TI).'
      });

      return;
    }

    if (!document) {

      Swal.fire({
        icon: 'warning',
        title: 'Documento requerido',
        text: 'Ingresa el número de documento.'
      });

      return;
    }

    if (!/^\d{6,15}$/.test(document)) {

      Swal.fire({
        icon: 'warning',
        title: 'Documento no válido',
        text:
          'El documento debe contener únicamente números entre 6 y 15 dígitos.'
      });

      return;
    }

    if (!role) {

      Swal.fire({
        icon: 'warning',
        title: 'Rol requerido',
        text: 'Selecciona un rol para el usuario.'
      });

      return;
    }

    const currentUser =
      this.authService.getUser();

    const data = {

      name,

      email,

      role,

      active:
        this.form.active,

      document_type:
        documentType,

      document,

      phone:
        this.form.phone?.trim() || '',

      address:
        this.form.address?.trim() || '',

      actor_uid:
        currentUser?.uid || ''

    };

    console.log(
      '📤 DATOS CRUD:',
      data
    );

    console.log(
      '🆔 UID:',
      this.form.uid
    );

    // Guardamos también el dato localmente para impedir que
    // Realtime lo reemplace por vacío mientras sincroniza.
    this.rememberDocumentData(
      this.form.uid,
      email,
      documentType,
      document
    );

    if (this.editMode) {

      if (!this.form.uid) {

        Swal.fire({
          icon: 'error',
          title: 'Usuario no identificado',
          text:
            'No se encontró el ID del usuario que se quiere modificar.'
        });

        return;
      }

      this.dashboardService
        .updateUser(
          this.form.uid,
          data
        )
        .subscribe({

          next: (response: any) => {

            console.log(
              '✅ USUARIO ACTUALIZADO:',
              response
            );

            this.updateLocalDocumentData(
              this.form.uid,
              email,
              documentType,
              document
            );

            this.closeForm();

            this.loadUsers();

            Swal.fire({
              icon: 'success',
              title: 'Usuario actualizado',
              text:
                'Los cambios se guardaron correctamente.',
              timer: 1800,
              showConfirmButton: false
            });

          },

          error: (err: any) => {

            console.error(
              '❌ ERROR ACTUALIZANDO:',
              err
            );

            Swal.fire({
              icon: 'error',
              title: 'No se pudo actualizar',
              text:
                err?.error?.message ||
                err?.error?.detail ||
                'El servidor no permitió actualizar el usuario.'
            });

          }

        });

      return;
    }

    this.dashboardService
      .createUser(data)
      .subscribe({

        next: (response: any) => {

          console.log(
            '✅ USUARIO CREADO:',
            response
          );

          const responseUser =
            response?.user ||
            response?.data?.user ||
            response?.data ||
            response ||
            {};

          const createdUid =
            responseUser?.uid ||
            responseUser?.id ||
            '';

          this.rememberDocumentData(
            createdUid,
            email,
            documentType,
            document
          );

          this.closeForm();

          this.loadUsers();

          Swal.fire({
            icon: 'success',
            title: 'Usuario creado',
            text:
              'El usuario fue registrado correctamente.',
            timer: 1800,
            showConfirmButton: false
          });

        },

        error: (err: any) => {

          console.error(
            '❌ ERROR CREANDO:',
            err
          );

          Swal.fire({
            icon: 'error',
            title: 'No se pudo crear',
            text:
              err?.error?.message ||
              err?.error?.detail ||
              'El servidor rechazó la creación del usuario.'
          });

        }

      });

  }


  // ==========================
  // ELIMINAR
  // ==========================
  deleteAccess(uid: string): void {

    if (!uid) {
      Swal.fire(
        'Error',
        'No se encontró el ID del usuario',
        'error'
      );
      return;
    }

    Swal.fire({
      title: 'Eliminar usuario',
      text: '¿Seguro que deseas eliminar este usuario?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    }).then(result => {

      if (!result.isConfirmed) {
        return;
      }

      console.log(' ELIMINANDO UID:', uid);

      this.dashboardService.deleteUser(uid)
        .subscribe({

          next: (response: any) => {

            console.log('✅ USUARIO ELIMINADO:', response);

            this.loadUsers();

            Swal.fire({
              icon: 'success',
              title: 'Usuario eliminado',
              text: 'El usuario fue eliminado correctamente',
              timer: 1800,
              showConfirmButton: false
            });
          },

          error: (err: any) => {

            console.error('           ERROR ELIMINANDO:', err);

            Swal.fire({
              icon: 'error',
              title: 'No se pudo eliminar',
              text:
                err?.error?.message ||
                err?.error?.detail ||
                'El servidor rechazó la eliminación'
            });
          }

        });

    });
  }


  // ==========================
  // ACTUALIZAR PERFIL
  // ==========================
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

      const data = {

        name:
          this.profile.name.trim(),

        email:
          this.profile.email.trim(),

        phone:
          this.profile.phone.trim(),

        address:
          this.profile.address.trim(),

        document_type:
          this.profile.documentType ||
          this.profile.document_type ||
          '',

        document:
          this.profile.document,

        photo:
          this.profile.photo

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
              text: 'Los datos se actualizaron correctamente.',
              timer: 1800,
              showConfirmButton: false
            });

            this.selectedPhoto = null;

            this.loadProfile();

          },

          error: (err: any) => {

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

    } catch (error) {

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

  getProfileRole(): string {

    const role = String(
      this.profile.role || ''
    ).toLowerCase();

    if (
      role === 'superadmin' ||
      role === 'super-admin' ||
      role === 'super_admin' ||
      role === 'super administrador'
    ) {
      return 'Super Administrador';
    }

    return this.profile.role || 'Super Administrador';

  }

  // ==========================
  // FILTER
  // ==========================
  filterUsers(event: Event): void {

    const input =
      event.target as HTMLInputElement;

    this.userSearch =
      input.value || '';

    this.userCurrentPage = 1;

  }

  // ==========================================================
  // USUARIOS - LISTA FILTRADA
  // ==========================================================

  get filteredUsersList(): User[] {

    const search =
      this.userSearch
        .trim()
        .toLowerCase();

    return this.accesses.filter(
      (user: User) => {

        const documentType =
          this.getDocumentTypeFrom(
            user
          );

        const status =
          user.active === false
            ? 'inactivo'
            : 'activo';

        // ==========================================
        // BUSCADOR
        // ==========================================

        if (search) {

          const searchable =
            [
              user.name,
              user.email,
              user.document,
              documentType,
              user.phone,
              user.address,
              user.role,
              user.uid
            ]
              .map(
                value =>
                  String(
                    value || ''
                  )
                    .toLowerCase()
              )
              .join(' ');

          if (
            !searchable.includes(
              search
            )
          ) {

            return false;

          }

        }


        // ==========================================
        // ROL
        // ==========================================

        if (
          this.userRoleFilter !==
          'todos'
        ) {

          if (
            String(
              user.role || ''
            )
              .toLowerCase() !==
            this.userRoleFilter
              .toLowerCase()
          ) {

            return false;

          }

        }


        // ==========================================
        // ESTADO
        // ==========================================

        if (
          this.userStatusFilter !==
          'todos'
        ) {

          if (
            status !==
            this.userStatusFilter
          ) {

            return false;

          }

        }


        // ==========================================
        // TIPO DE DOCUMENTO
        // ==========================================

        if (
          this.userDocumentTypeFilter !==
          'todos'
        ) {

          if (
            documentType !==
            this.userDocumentTypeFilter
          ) {

            return false;

          }

        }


        return true;

      }
    );

  }


  // ==========================================================
  // USUARIOS - PAGINADOS
  // ==========================================================

  get paginatedUsers(): User[] {

    const start =
      (
        this.userCurrentPage - 1
      ) * this.userPageSize;

    const end =
      start +
      this.userPageSize;

    return this.filteredUsersList
      .slice(
        start,
        end
      );

  }


  // ==========================================================
  // USUARIOS - GETTER EXISTENTE
  // ==========================================================

  get users(): User[] {

    return this.paginatedUsers;

  }


  // ==========================================================
  // USUARIOS - TOTAL RESULTADOS
  // ==========================================================

  get totalFilteredUsers(): number {

    return this.filteredUsersList.length;

  }


  // ==========================================================
  // USUARIOS - TOTAL PÁGINAS
  // ==========================================================

  get totalUserPages(): number {

    const total =
      Math.ceil(
        this.totalFilteredUsers /
        this.userPageSize
      );

    return Math.max(
      total,
      1
    );

  }


  // ==========================================================
  // USUARIOS - INICIO DE RESULTADOS
  // ==========================================================

  get userResultStart(): number {

    if (
      this.totalFilteredUsers === 0
    ) {

      return 0;

    }

    return (
      (
        this.userCurrentPage - 1
      ) *
      this.userPageSize
    ) + 1;

  }


  // ==========================================================
  // USUARIOS - FIN DE RESULTADOS
  // ==========================================================

  get userResultEnd(): number {

    return Math.min(
      this.userCurrentPage *
      this.userPageSize,

      this.totalFilteredUsers
    );

  }


  // ==========================================================
  // USUARIOS - ROLES DISPONIBLES
  // ==========================================================

  get userFilterRoles(): string[] {

    const roles =
      this.accesses
        .map(
          user =>
            String(
              user.role || ''
            )
              .trim()
              .toLowerCase()
        )
        .filter(
          role =>
            !!role
        );

    return [
      ...new Set(
        roles
      )
    ].sort();

  }


  // ==========================================================
  // USUARIOS - CAMBIAR PÁGINA
  // ==========================================================

  goToUserPage(
    page: number
  ): void {

    if (
      page < 1 ||
      page > this.totalUserPages
    ) {

      return;

    }

    this.userCurrentPage =
      page;

  }


  // ==========================================================
  // USUARIOS - PÁGINA ANTERIOR
  // ==========================================================

  previousUserPage(): void {

    if (
      this.userCurrentPage > 1
    ) {

      this.userCurrentPage--;

    }

  }


  // ==========================================================
  // USUARIOS - PÁGINA SIGUIENTE
  // ==========================================================

  nextUserPage(): void {

    if (
      this.userCurrentPage <
      this.totalUserPages
    ) {

      this.userCurrentPage++;

    }

  }


  // ==========================================================
  // USUARIOS - CAMBIO DE FILTRO
  // ==========================================================

  onUserFilterChange(): void {

    this.userCurrentPage = 1;

  }


  // ==========================================================
  // USUARIOS - CAMBIO DE TAMAÑO
  // ==========================================================

  onUserPageSizeChange(): void {

    this.userCurrentPage = 1;

  }


  // ==========================================================
  // USUARIOS - LIMPIAR FILTROS
  // ==========================================================

  resetUserFilters(): void {

    this.userSearch = '';

    this.userRoleFilter =
      'todos';

    this.userStatusFilter =
      'todos';

    this.userDocumentTypeFilter =
      'todos';

    this.userPageSize =
      10;

    this.userCurrentPage =
      1;

  }


  // ==========================================================
  // USUARIOS - NÚMEROS DE PÁGINA
  // ==========================================================

  get userPageNumbers(): number[] {

    const total =
      this.totalUserPages;

    const current =
      this.userCurrentPage;

    const maxVisible =
      5;

    let start =
      Math.max(
        1,
        current - 2
      );

    let end =
      Math.min(
        total,
        start + maxVisible - 1
      );

    if (
      end - start + 1 <
      maxVisible
    ) {

      start =
        Math.max(
          1,
          end - maxVisible + 1
        );

    }

    const pages:
      number[] = [];

    for (
      let page = start;
      page <= end;
      page++
    ) {

      pages.push(
        page
      );

    }

    return pages;

  }


  // ==========================================================
  // TRACKBY
  // ==========================================================

  trackByUserUid(
    index: number,
    user: User
  ): string {

    return user.uid ||
      user.email ||
      String(index);

  }

  // ==========================
  // MODAL
  // ==========================
  openModal(): void {
    this.openForm();
  }

  closeModal(): void {
    this.closeForm();
  }

  editUser(u: User): void {
    this.editAccess(u);
  }
  deleteUser(user: any) {

    console.log("USUARIO COMPLETO:", user);

    console.log("UID:", user.uid);

    this.deleteAccess(user.uid);

  }
  submitForm(): void {
    this.saveAccess();
  }

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
  loadInvitations(): void {

    this.dashboardService.getInvitations().subscribe({

      next: (res: any) => {

        console.log("INVITACIONES:", res);

        this.invitations = res.invitations || [];
        this.syncData();

      },

      error: (err: any) => {

        console.error("Error cargando invitaciones:", err);

      }

    });

  }

  getInvitationStatus(inv: Invitation): string {

    if (inv.accepted || inv.used) {
      return 'Aceptada';
    }

    if (inv.expires_at) {

      const exp = new Date(inv.expires_at);

      if (exp < new Date()) {
        return 'Expirada';
      }

    }

    return 'Pendiente';
  }

  resendInvitation(inv: Invitation): void {

    this.dashboardService.createInvitation({
      email: inv.email,
      role: inv.role
    }).subscribe({

      next: () => {

        Swal.fire(
          'Enviada',
          'La invitación fue reenviada.',
          'success'
        );

        this.loadInvitations();

      },

      error: () => {

        Swal.fire(
          'Error',
          'No fue posible reenviar la invitación.',
          'error'
        );

      }

    });

  }

  deleteInvitation(id: string): void {

    Swal.fire({

      title: '¿Eliminar invitación?',
      icon: 'warning',
      showCancelButton: true

    }).then(result => {

      if (!result.isConfirmed) return;

      this.dashboardService.deleteInvitation(id)
        .subscribe({

          next: () => {

            Swal.fire(
              'Eliminada',
              '',
              'success'
            );

            this.loadInvitations();

          },

          error: () => {

            Swal.fire(
              'Error',
              'No fue posible eliminar la invitación.',
              'error'
            );

          }

        });

    });

  }

  loadProfile(): void {

    this.dashboardService
      .getUsers()
      .subscribe({

        next: (res: any) => {

          const users =
            res?.users ||
            res?.data?.users ||
            res?.results ||
            res ||
            [];

          const firebaseUser =
            this.authService.getUser();

          if (!firebaseUser) {

            console.warn(
              'No existe un usuario autenticado.'
            );

            return;
          }

          if (!Array.isArray(users)) {

            console.warn(
              'La respuesta de usuarios no es una lista válida.'
            );

            return;
          }

          const mappedUsers =
            users.map((user: any) =>
              this.mapUser(user)
            );

          const me =
            mappedUsers.find(
              (u: User) =>
                u.uid === firebaseUser.uid ||
                u.email === firebaseUser.email
            );

          if (!me) {

            console.warn(
              'No se encontró el usuario SuperAdmin actual.'
            );

            return;
          }

          const documentType =
            this.getDocumentTypeFrom(me);

          this.currentUser = {
            ...me,
            documentType,
            document_type:
              documentType
          };

          this.profile = {

            uid:
              me.uid ||
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

            documentType,

            document_type:
              documentType,

            document:
              me.document ||
              '',

            role:
              me.role ||
              'superadmin',

            status:
              me.status ??
              (me.active === false
                ? 'Inactivo'
                : 'Activo'),

            photo:
              me.photo ||
              'assets/avatar.png'

          };

        },

        error: (err: any) => {

          console.error(
            'Error cargando perfil del SuperAdmin:',
            err
          );

        }

      });

  }

  getProfileName(): string {

    return this.profile.name || 'Super Administrador';

  }

  getProfilePhoto(): string {

    if (!this.profile.photo) {
      return 'assets/avatar.png';
    }

    if (
      this.profile.photo.startsWith('http://') ||
      this.profile.photo.startsWith('https://') ||
      this.profile.photo.startsWith('data:image')
    ) {
      return this.profile.photo;
    }

    return `http://127.0.0.1:8000${this.profile.photo}`;
  }



  uploadPhoto(event: any): void {

    const file =
      event.target?.files?.[0];

    if (!file) {
      return;
    }

    if (!file.type.startsWith('image/')) {

      Swal.fire({
        icon: 'warning',
        title: 'Archivo no válido',
        text: 'Seleccione una imagen válida.'
      });

      event.target.value = '';

      return;
    }

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

    const reader = new FileReader();

    reader.onload = () => {

      this.profile.photo =
        reader.result as string;

    };

    reader.readAsDataURL(file);

  }


  // ==========================
  // 🔔 MARCAR NOTIFICACIÓN COMO LEÍDA
  // ==========================

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


  // ==========================
  // 🔔 MARCAR TODAS COMO LEÍDAS
  // ==========================

  markAllNotificationsAsRead(): void {

    this.notificationService
      .markAllAsRead();

  }


  // ==========================
  // 🔔 ICONO SEGÚN TIPO
  // ==========================

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


  // ==========================
  //  FECHA
  // ==========================

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

      return date;

    }

  }

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

  approveTemporaryRequest(notification: any): void {

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
      text: '¿Deseas crear este usuario temporal?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, aprobar',
      cancelButtonText: 'Cancelar'
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
              title: 'Solicitud aprobada',
              text: 'El usuario temporal fue creado correctamente.',
              timer: 1800,
              showConfirmButton: false
            });

            this.markNotificationAsRead(notification);

            this.loadNotifications();

          },

          error: (err: any) => {

            console.error(
              'ERROR APROBANDO SOLICITUD:',
              err
            );

            Swal.fire(
              'Error',
              err?.error?.message ||
              'No fue posible aprobar la solicitud.',
              'error'
            );

          }

        });

    });
  }

  rejectTemporaryRequest(notification: any): void {

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

      inputLabel: 'Motivo del rechazo',

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

              title: 'Solicitud rechazada',

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

            Swal.fire(
              'Error',
              err?.error?.message ||
              'No fue posible rechazar la solicitud.',
              'error'
            );

          }

        });

    });
  }

  // ==========================================================
  // AUDITORÍA
  // ==========================================================

  loadAuditLogs(): void {

    this.auditLoading = true;

    this.dashboardService
      .getAuditLogs()
      .subscribe({

        next: (res: any) => {

          console.log(
            '📋 AUDITORÍA:',
            res
          );

          const logs =
            res?.logs ||
            res?.data?.logs ||
            res?.results ||
            res ||
            [];

          this.auditLogs =
            Array.isArray(logs)
              ? logs
              : [];

          this.auditLogs.sort(
            (a: AuditLog, b: AuditLog) => {

              const dateA =
                new Date(
                  a.created_at || 0
                ).getTime();

              const dateB =
                new Date(
                  b.created_at || 0
                ).getTime();

              return dateB - dateA;

            }
          );

          this.auditLoading = false;

        },

        error: (err: any) => {

          console.error(
            '❌ ERROR CARGANDO AUDITORÍA:',
            err
          );

          this.auditLogs = [];

          this.auditLoading = false;

        }

      });

  }


  // ==========================================================
  // AUDITORÍA - REGISTROS FILTRADOS
  // ==========================================================

  get filteredAuditLogs(): AuditLog[] {

    const search =
      this.auditSearch
        .trim()
        .toLowerCase();

    return this.auditLogs
      .filter(
        (log: AuditLog) => {

          // ==========================================
          // FILTRO POR ACCIÓN
          // ==========================================

          if (
            this.auditAction !== 'todos' &&
            log.action !== this.auditAction
          ) {

            return false;

          }


          // ==========================================
          // FILTRO POR FECHA
          // ==========================================

          if (this.auditDate) {

            if (!log.created_at) {
              return false;
            }

            const date =
              new Date(
                log.created_at
              );

            if (
              isNaN(
                date.getTime()
              )
            ) {

              return false;

            }

            const year =
              date.getFullYear();

            const month =
              String(
                date.getMonth() + 1
              ).padStart(
                2,
                '0'
              );

            const day =
              String(
                date.getDate()
              ).padStart(
                2,
                '0'
              );

            const logDate =
              `${year}-${month}-${day}`;

            if (
              logDate !== this.auditDate
            ) {

              return false;

            }

          }


          // ==========================================
          // BUSCADOR
          // ==========================================

          if (search) {

            const searchable =
              [
                log.actor_name,
                log.actor_email,
                log.actor_role,

                log.target_name,
                log.target_email,
                log.target_uid,

                log.description,

                log.action,
                log.category
              ]
                .map(
                  value =>
                    String(
                      value ?? ''
                    )
                )
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
          a: AuditLog,
          b: AuditLog
        ) => {

          const dateA =
            new Date(
              a.created_at || 0
            ).getTime();

          const dateB =
            new Date(
              b.created_at || 0
            ).getTime();

          return dateB - dateA;

        }
      );

  }


  // ==========================================================
  // AUDITORÍA - ACCIONES DISPONIBLES
  // ==========================================================

  get auditActions(): string[] {

    const actions =
      this.auditLogs
        .map(
          (log: AuditLog) =>
            String(
              log.action || ''
            ).trim()
        )
        .filter(
          (action: string) =>
            !!action
        );

    return [
      ...new Set(actions)
    ].sort();

  }


  // ==========================================================
  // AUDITORÍA - NOMBRE DE LA ACCIÓN
  // ==========================================================

  getAuditActionLabel(
    action: string
  ): string {

    switch (
    String(
      action || ''
    )
      .trim()
      .toLowerCase()
    ) {

      case 'user_created':
        return 'Usuario creado';

      case 'user_updated':
        return 'Usuario actualizado';

      case 'user_deleted':
        return 'Usuario eliminado';

      case 'role_changed':
        return 'Rol modificado';

      case 'temporary_request':
        return 'Solicitud temporal';

      case 'temporary_request_approved':
        return 'Solicitud aprobada';

      case 'temporary_request_rejected':
        return 'Solicitud rechazada';

      case 'invitation_created':
        return 'Invitación creada';

      case 'invitation_deleted':
        return 'Invitación eliminada';

      case 'invitation_resent':
        return 'Invitación reenviada';

      case 'profile_updated':
        return 'Perfil actualizado';

      case 'access_granted':
        return 'Acceso permitido';

      case 'access_denied':
        return 'Acceso denegado';

      case 'fingerprint_enrolled':
        return 'Huella registrada';

      case 'fingerprint_removed':
        return 'Huella eliminada';

      case 'rfid_assigned':
        return 'Tarjeta RFID asignada';

      default:
        return action || 'Actividad';

    }

  }


  // ==========================================================
  // AUDITORÍA - CAMPOS MODIFICADOS
  // ==========================================================

  getAuditChanges(
    log: AuditLog
  ): {
    field: string;
    before: any;
    after: any;
  }[] {

    const changes =
      log?.changes;

    if (
      !changes ||
      typeof changes !== 'object'
    ) {

      return [];

    }

    return Object
      .keys(changes)
      .map(
        (field: string) => {

          const change =
            changes[field];

          return {

            field,

            before:
              change?.before,

            after:
              change?.after

          };

        }
      );

  }


  // ==========================================================
  // AUDITORÍA - NOMBRE DE CAMPOS
  // ==========================================================

  getAuditFieldLabel(
    field: string
  ): string {

    switch (
    String(
      field || ''
    )
      .trim()
      .toLowerCase()
    ) {

      case 'name':
        return 'Nombre';

      case 'email':
        return 'Correo electrónico';

      case 'role':
        return 'Rol';

      case 'document_type':
      case 'documenttype':
        return 'Tipo de documento';

      case 'document':
        return 'Número de documento';

      case 'phone':
        return 'Teléfono';

      case 'address':
        return 'Dirección';

      case 'active':
        return 'Estado';

      case 'status':
        return 'Estado';

      case 'photo':
        return 'Foto de perfil';

      case 'password':
        return 'Contraseña';

      default:
        return field || 'Campo';

    }

  }


  // ==========================================================
  // AUDITORÍA - NOMBRE DEL ROL
  // ==========================================================

  getAuditRoleLabel(
    role: string
  ): string {

    const value =
      String(
        role || ''
      )
        .trim()
        .toLowerCase();

    switch (value) {

      case 'super-admin':
      case 'superadmin':
      case 'super_admin':
      case 'super administrador':
        return 'Super Administrador';

      case 'administrador':
        return 'Administrador';

      case 'vigilante':
        return 'Vigilante';

      case 'aprendiz':
        return 'Aprendiz';

      case 'instructor':
        return 'Instructor';

      case 'usuario':
        return 'Usuario';

      case 'system':
      case 'sistema':
        return 'Sistema';

      default:
        return role || 'Sistema';

    }

  }


  // ==========================================================
  // AUDITORÍA - FORMATEAR VALORES
  // ==========================================================

  formatAuditValue(
    field: string,
    value: any
  ): string {

    if (
      value === null ||
      value === undefined ||
      value === ''
    ) {

      return 'Sin información';

    }

    if (
      field === 'active'
    ) {

      if (
        value === true ||
        value === 'true' ||
        value === 1 ||
        value === '1'
      ) {

        return 'Activo';

      }

      return 'Inactivo';

    }

    if (
      field === 'role'
    ) {

      return this.getAuditRoleLabel(
        String(value)
      );

    }

    if (
      field === 'document_type' ||
      field === 'documentType'
    ) {

      const documentType =
        String(value)
          .trim()
          .toUpperCase();

      if (
        documentType === 'CC'
      ) {

        return 'CC - Cédula de Ciudadanía';

      }

      if (
        documentType === 'TI'
      ) {

        return 'TI - Tarjeta de Identidad';

      }

    }

    if (
      typeof value === 'boolean'
    ) {

      return value
        ? 'Sí'
        : 'No';

    }

    if (
      typeof value === 'object'
    ) {

      try {

        return JSON.stringify(
          value
        );

      } catch {

        return 'Información modificada';

      }

    }

    return String(
      value
    );

  }


  // ==========================================================
  // AUDITORÍA - FECHA
  // ==========================================================

  formatAuditDate(
    date: string
  ): string {

    if (!date) {
      return 'Sin fecha';
    }

    const parsedDate =
      new Date(date);

    if (
      isNaN(
        parsedDate.getTime()
      )
    ) {

      return date;

    }

    return parsedDate
      .toLocaleString(
        'es-CO',
        {
          year: 'numeric',
          month: 'short',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        }
      );

  }

  // ==========================================================
  // ACCESOS - FILTRADOS
  // ==========================================================

  get filteredAccessLogs(): AccessLog[] {

    const search =
      this.accessSearch
        .trim()
        .toLowerCase();

    return this.accessLogs
      .filter((log: AccessLog) => {

        if (
          this.accessStatusFilter === 'permitido' &&
          !log.allowed
        ) {
          return false;
        }

        if (
          this.accessStatusFilter === 'denegado' &&
          log.allowed
        ) {
          return false;
        }

        if (
          this.accessTypeFilter !== 'todos' &&
          log.type !== this.accessTypeFilter
        ) {
          return false;
        }

        if (
          this.accessMethodFilter !== 'todos' &&
          String(log.method || '')
            .trim()
            .toLowerCase() !==
          this.accessMethodFilter.toLowerCase()
        ) {
          return false;
        }

        if (search) {

          const searchable = [
            log.user,
            log.email,
            log.document,
            log.role,
            log.type,
            log.method,
            log.device,
            log.status
          ]
            .map(value =>
              String(value || '').toLowerCase()
            )
            .join(' ');

          if (!searchable.includes(search)) {
            return false;
          }

        }

        return true;

      })
      .sort((a, b) => {

        const dateA =
          this.parseAccessDate(a.date)?.getTime() || 0;

        const dateB =
          this.parseAccessDate(b.date)?.getTime() || 0;

        return dateB - dateA;

      });

  }


  // ==========================================================
  // ACCESOS - PAGINADOS
  // ==========================================================

  get paginatedAccessLogs(): AccessLog[] {

    const start =
      (this.accessCurrentPage - 1) *
      this.accessPageSize;

    return this.filteredAccessLogs.slice(
      start,
      start + this.accessPageSize
    );

  }


  // ==========================================================
  // ACCESOS - MÉTRICAS
  // ==========================================================

  get accessAllowedCount(): number {

    return this.filteredAccessLogs
      .filter(log => log.allowed)
      .length;

  }

  get accessDeniedCount(): number {

    return this.filteredAccessLogs
      .filter(log => !log.allowed)
      .length;

  }

  get accessEntriesCount(): number {

    return this.filteredAccessLogs
      .filter(log => log.type === 'entrada')
      .length;

  }

  get accessExitsCount(): number {

    return this.filteredAccessLogs
      .filter(log => log.type === 'salida')
      .length;

  }


  // ==========================================================
  // ACCESOS - MÉTODOS DISPONIBLES
  // ==========================================================

  get accessMethods(): string[] {

    const methods =
      this.accessLogs
        .map(log =>
          String(log.method || '').trim()
        )
        .filter(method => !!method);

    return [
      ...new Set(methods)
    ].sort();

  }


  // ==========================================================
  // ACCESOS - TOTAL PÁGINAS
  // ==========================================================

  get accessTotalPages(): number {

    return Math.max(
      1,
      Math.ceil(
        this.filteredAccessLogs.length /
        this.accessPageSize
      )
    );

  }


  // ==========================================================
  // ACCESOS - INICIO / FIN
  // ==========================================================

  get accessResultStart(): number {

    if (!this.filteredAccessLogs.length) {
      return 0;
    }

    return (
      (this.accessCurrentPage - 1) *
      this.accessPageSize
    ) + 1;

  }

  get accessResultEnd(): number {

    return Math.min(
      this.accessCurrentPage *
      this.accessPageSize,

      this.filteredAccessLogs.length
    );

  }


  // ==========================================================
  // ACCESOS - NÚMEROS DE PÁGINA
  // ==========================================================

  get accessPageNumbers(): number[] {

    const total =
      this.accessTotalPages;

    const current =
      this.accessCurrentPage;

    let start =
      Math.max(
        1,
        current - 2
      );

    let end =
      Math.min(
        total,
        start + 4
      );

    if (end - start < 4) {

      start =
        Math.max(
          1,
          end - 4
        );

    }

    const pages: number[] = [];

    for (
      let page = start;
      page <= end;
      page++
    ) {
      pages.push(page);
    }

    return pages;

  }


  // ==========================================================
  // ACCESOS - CAMBIAR PÁGINA
  // ==========================================================

  goToAccessPage(
    page: number
  ): void {

    if (
      page < 1 ||
      page > this.accessTotalPages
    ) {
      return;
    }

    this.accessCurrentPage =
      page;

  }

  previousAccessPage(): void {

    if (
      this.accessCurrentPage > 1
    ) {
      this.accessCurrentPage--;
    }

  }

  nextAccessPage(): void {

    if (
      this.accessCurrentPage <
      this.accessTotalPages
    ) {
      this.accessCurrentPage++;
    }

  }


  // ==========================================================
  // ACCESOS - FILTROS
  // ==========================================================

  onAccessFilterChange(): void {

    this.accessCurrentPage = 1;

  }

  resetAccessFilters(): void {

    this.accessSearch = '';

    this.accessStatusFilter =
      'todos';

    this.accessTypeFilter =
      'todos';

    this.accessMethodFilter =
      'todos';

    this.accessPageSize =
      10;

    this.accessCurrentPage =
      1;

  }


  // ==========================================================
  // ACCESOS - TRACKBY
  // ==========================================================

  trackByAccessLog(
    index: number,
    log: AccessLog
  ): string {

    return log.id ||
      `${log.uid}-${log.date}` ||
      String(index);

  }
  isProfileActive(): boolean {
    return this.profile.status !== 'Inactivo';
  }
}