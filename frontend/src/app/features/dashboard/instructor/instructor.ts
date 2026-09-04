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
  FirestoreService
} from '../../../core/services/firestore.service';

import {
  DashboardService
} from '../../../core/services/dashboard.service';

import {
  AuthService
} from '../../../core/services/auth.service';

interface AccessLog {
  id: string;
  uid: string;
  name: string;
  email: string;
  document: string;
  date: string;
  type: 'Ingreso' | 'Salida';
  result: 'Permitido' | 'Denegado';
  method: string;
  device: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  documentType: string;
  document: string;
  role: string;
  active: boolean;
  lastEntry: string;
  lastExit: string;
}

@Component({
  selector: 'app-instructor',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl: './instructor.html',
  styleUrls: [
    './instructor.css'
  ]
})
export class InstructorComponent implements OnInit, OnDestroy {

  private readonly colombiaTimeZone = 'America/Bogota';
  private readonly accessRefreshMs = 1000;

  menuOpen = true;
  activeTab = 'dashboard';

  // =========================================================
  // PERFIL
  // =========================================================

  currentUser: any = null;
  selectedPhoto: File | null = null;

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
  // MIS ACCESOS PERSONALES
  // =========================================================

  logs: AccessLog[] = [];
  filteredLogs: AccessLog[] = [];
  accessSearchTerm = '';

  private accessRefreshTimer: ReturnType<typeof setInterval> | null = null;
  private accessRequestInProgress = false;

  // =========================================================
  // APRENDICES
  // =========================================================

  users: User[] = [];
  filteredUsers: User[] = [];
  apprenticeAccessLogs: AccessLog[] = [];
  private apprenticeAccessRequestInProgress = false;

  // =========================================================
  // BUSCADOR DE APRENDICES
  // =========================================================

  searchTerm = '';

  // =========================================================
  // NOTIFICACIONES
  // =========================================================

  notifications: string[] = [
    'Nuevo acceso registrado',
    'Usuario denegado',
    'Sistema activo correctamente'
  ];

  // =========================================================
  // ESTADÍSTICAS PERSONALES DEL INSTRUCTOR
  // =========================================================

  stats = {
    ingresos: 0,
    salidas: 0,
    ultimoMovimiento: '--:--',
    permitidos: 0,
    denegados: 0
  };

  constructor(
    private router: Router,
    private firestoreService: FirestoreService,
    private dashboardService: DashboardService,
    private authService: AuthService
  ) {}

  // =========================================================
  // CICLO DE VIDA
  // =========================================================

  ngOnInit(): void {
    this.loadUsers();
    this.loadProfile();
  }

  ngOnDestroy(): void {
    this.stopAccessAutoRefresh();
  }

  // =========================================================
  // PERFIL
  // =========================================================

  loadProfile(): void {
    this.dashboardService
      .getUsers()
      .subscribe({
        next: (res: any) => {
          const users = Array.isArray(res)
            ? res
            : (res?.users || res?.results || []);

          const firebaseUser = this.authService.getUser();

          if (!firebaseUser) {
            return;
          }

          const firebaseUid = String(firebaseUser?.uid || '');
          const firebaseEmail = String(firebaseUser?.email || '')
            .trim()
            .toLowerCase();

          const me = users.find((user: any) => {
            const uid = String(user?.uid || user?.id || '');
            const email = String(user?.email || '')
              .trim()
              .toLowerCase();

            return (
              (!!firebaseUid && uid === firebaseUid)
              ||
              (!!firebaseEmail && email === firebaseEmail)
            );
          });

          if (!me) {
            return;
          }

          this.currentUser = me;

          this.profile = {
            name: me?.name || '',
            email: me?.email || '',
            phone: me?.phone || '',
            address: me?.address || '',
            documentType: me?.document_type || me?.documentType || '',
            document: me?.document || '',
            photo: me?.photo || 'assets/avatar.png'
          };

          // Al conocer al instructor autenticado cargamos únicamente
          // sus propios movimientos personales.
          this.loadMyAccesses(true);
          this.startAccessAutoRefresh();
        },
        error: (err: any) => {
          console.error('ERROR CARGANDO PERFIL DEL INSTRUCTOR:', err);
        }
      });
  }

  // =========================================================
  // MIS ACCESOS — TIEMPO REAL
  // =========================================================

  loadMyAccesses(silent = false): void {
    if (!this.currentUser || this.accessRequestInProgress) {
      return;
    }

    this.accessRequestInProgress = true;

    this.dashboardService
      .getAccesses()
      .subscribe({
        next: (res: any) => {
          const rawLogs =
            res?.accesses ||
            res?.access ||
            res?.logs ||
            res?.results ||
            res ||
            [];

          const allLogs = Array.isArray(rawLogs)
            ? rawLogs
            : [];

          const myUid = String(
            this.currentUser?.uid ||
            this.currentUser?.id ||
            ''
          ).trim();

          const myEmail = String(
            this.currentUser?.email ||
            this.profile.email ||
            ''
          )
            .trim()
            .toLowerCase();

          const myDocument = String(
            this.currentUser?.document ||
            this.profile.document ||
            ''
          ).trim();

          this.logs = allLogs
            .filter((access: any) => {
              const accessUid = String(
                access?.uid ||
                access?.user_uid ||
                access?.userId ||
                ''
              ).trim();

              const accessEmail = String(
                access?.email ||
                access?.user_email ||
                ''
              )
                .trim()
                .toLowerCase();

              const accessDocument = String(
                access?.document ||
                access?.user_document ||
                ''
              ).trim();

              if (myUid && accessUid) {
                return myUid === accessUid;
              }

              if (myEmail && accessEmail && myEmail === accessEmail) {
                return true;
              }

              return !!myDocument
                && !!accessDocument
                && myDocument === accessDocument;
            })
            .map((access: any) => this.mapAccessLog(access, true))
            .sort((a: AccessLog, b: AccessLog) => {
              return (
                this.parseAccessDate(b.date)?.getTime() || 0
              ) - (
                this.parseAccessDate(a.date)?.getTime() || 0
              );
            });

          this.filterLogs();
          this.calculateStats();
          this.accessRequestInProgress = false;
        },
        error: (err: any) => {
          this.accessRequestInProgress = false;
          console.error('ERROR CARGANDO ACCESOS DEL INSTRUCTOR:', err);

          if (!silent) {
            Swal.fire({
              icon: 'error',
              title: 'No se pudieron cargar tus accesos',
              text:
                err?.error?.message ||
                'No fue posible consultar tus ingresos y salidas.'
            });
          }
        }
      });
  }

  private mapAccessLog(access: any, useProfileFallback = false): AccessLog {
    const rawType = String(
      access?.type ||
      access?.movement ||
      access?.access_type ||
      ''
    )
      .trim()
      .toLowerCase();

    const type: 'Ingreso' | 'Salida' = (
      rawType === 'salida'
      || rawType === 'exit'
      || rawType.includes('sal')
    )
      ? 'Salida'
      : 'Ingreso';

    const rawStatus = String(
      access?.status ||
      access?.result ||
      ''
    )
      .trim()
      .toLowerCase();

    const allowed =
      access?.allowed === true
      || access?.granted === true
      || access?.authorized === true
      || rawStatus.includes('permit')
      || rawStatus.includes('author')
      || rawStatus.includes('allow')
      || rawStatus.includes('aprob');

    return {
      id: String(access?.id || ''),
      uid: String(
        access?.uid ||
        access?.user_uid ||
        access?.userId ||
        ''
      ),
      name: String(
        access?.user ||
        access?.name ||
        (useProfileFallback ? this.profile.name : '') ||
        (useProfileFallback ? 'Instructor' : '')
      ),
      email: String(
        access?.email ||
        access?.user_email ||
        (useProfileFallback ? this.profile.email : '') ||
        ''
      ),
      document: String(
        access?.document ||
        access?.user_document ||
        (useProfileFallback ? this.profile.document : '') ||
        ''
      ),
      date: String(
        access?.date ||
        access?.created_at ||
        access?.timestamp ||
        ''
      ),
      type,
      result: allowed ? 'Permitido' : 'Denegado',
      method: String(
        access?.method ||
        access?.access_method ||
        'Huella'
      ),
      device: String(
        access?.device ||
        access?.device_name ||
        ''
      )
    };
  }

  // =========================================================
  // AUTOREFRESH — DASHBOARD / ACCESOS / APRENDICES
  // =========================================================

  private startAccessAutoRefresh(): void {
    if (this.accessRefreshTimer) {
      return;
    }

    this.accessRefreshTimer = setInterval(() => {
      if (
        this.activeTab === 'dashboard'
        || this.activeTab === 'accesos'
      ) {
        this.loadMyAccesses(true);
      }

      if (this.activeTab === 'aprendices') {
        this.loadApprenticeAccesses(true);
      }
    }, this.accessRefreshMs);
  }

  private stopAccessAutoRefresh(): void {
    if (!this.accessRefreshTimer) {
      return;
    }

    clearInterval(this.accessRefreshTimer);
    this.accessRefreshTimer = null;
  }

  // =========================================================
  // ESTADÍSTICAS PERSONALES
  // =========================================================

  calculateStats(): void {
    this.stats.ingresos = this.logs.filter(
      log => log.type === 'Ingreso'
    ).length;

    this.stats.salidas = this.logs.filter(
      log => log.type === 'Salida'
    ).length;

    this.stats.permitidos = this.logs.filter(
      log => log.result === 'Permitido'
    ).length;

    this.stats.denegados = this.logs.filter(
      log => log.result === 'Denegado'
    ).length;

    this.stats.ultimoMovimiento = this.logs.length > 0
      ? this.formatAccessTime(this.logs[0].date)
      : '--:--';
  }

  get recentMyAccesses(): AccessLog[] {
    return this.logs.slice(0, 8);
  }

  // =========================================================
  // FECHA / HORA COLOMBIA
  // =========================================================

  private parseAccessDate(value: any): Date | null {
    if (!value) {
      return null;
    }

    if (value instanceof Date) {
      return Number.isNaN(value.getTime())
        ? null
        : value;
    }

    if (typeof value?.toDate === 'function') {
      const date = value.toDate();
      return Number.isNaN(date.getTime())
        ? null
        : date;
    }

    if (typeof value?.seconds === 'number') {
      const date = new Date(value.seconds * 1000);
      return Number.isNaN(date.getTime())
        ? null
        : date;
    }

    if (typeof value?._seconds === 'number') {
      const date = new Date(value._seconds * 1000);
      return Number.isNaN(date.getTime())
        ? null
        : date;
    }

    if (typeof value === 'string') {
      let text = value.trim();

      if (!text) {
        return null;
      }

      // DashboardService normaliza las fechas de API al reloj de Colombia
      // sin offset. Aquí fijamos explícitamente UTC-05:00 para que la hora
      // siga siendo correcta aunque el navegador esté en otra zona horaria.
      if (
        /^\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}/.test(text)
        && !/(Z|[+-]\d{2}:?\d{2})$/i.test(text)
      ) {
        text = text.replace(' ', 'T');
        text = `${text}-05:00`;
      }

      const date = new Date(text);
      return Number.isNaN(date.getTime())
        ? null
        : date;
    }

    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? null
      : date;
  }

  formatAccessDate(value: any): string {
    const date = this.parseAccessDate(value);

    if (!date) {
      return '—';
    }

    return date.toLocaleDateString('es-CO', {
      timeZone: this.colombiaTimeZone,
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  formatAccessTime(value: any): string {
    const date = this.parseAccessDate(value);

    if (!date) {
      return '--:--';
    }

    return date.toLocaleTimeString('en-US', {
      timeZone: this.colombiaTimeZone,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  }

  // =========================================================
  // APRENDICES — CARGAR REGISTRADOS
  // =========================================================

  loadUsers(): void {
    this.firestoreService
      .getUsers()
      .subscribe({
        next: (data: any[]) => {
          const source = Array.isArray(data)
            ? data
            : [];

          this.users = source
            .map((user: any): User => ({
              id: String(user?.uid || user?.id || ''),
              name: String(user?.name || user?.nombre || 'Sin nombre'),
              email: String(user?.email || user?.correo || ''),
              documentType: String(
                user?.document_type ||
                user?.documentType ||
                user?.tipo_documento ||
                user?.tipoDocumento ||
                ''
              )
                .trim()
                .toUpperCase(),
              document: String(user?.document || user?.documento || ''),
              role: String(user?.role || user?.rol || '')
                .trim()
                .toLowerCase(),
              active: user?.active !== false,
              lastEntry: '',
              lastExit: ''
            }))
            .filter(user => user.role === 'aprendiz')
            .sort((a: User, b: User) => {
              return a.name.localeCompare(
                b.name,
                'es',
                { sensitivity: 'base' }
              );
            });

          this.applyLastAccessesToUsers();
          this.filterUsers();
          this.loadApprenticeAccesses(true);
        },
        error: (err: any) => {
          console.error('ERROR CARGANDO APRENDICES:', err);
          this.users = [];
          this.filteredUsers = [];
        }
      });
  }

  // =========================================================
  // APRENDICES — ACCESOS
  // =========================================================

  loadApprenticeAccesses(silent = false): void {
    if (this.apprenticeAccessRequestInProgress) {
      return;
    }

    this.apprenticeAccessRequestInProgress = true;

    this.dashboardService
      .getAccesses()
      .subscribe({
        next: (res: any) => {
          const rawLogs =
            res?.accesses ||
            res?.access ||
            res?.logs ||
            res?.results ||
            res ||
            [];

          const allLogs = Array.isArray(rawLogs)
            ? rawLogs
            : [];

          this.apprenticeAccessLogs = allLogs
            .map((access: any) => this.mapAccessLog(access))
            .sort((a: AccessLog, b: AccessLog) => {
              return (
                this.parseAccessDate(b.date)?.getTime() || 0
              ) - (
                this.parseAccessDate(a.date)?.getTime() || 0
              );
            });

          this.applyLastAccessesToUsers();
          this.filterUsers();
          this.apprenticeAccessRequestInProgress = false;
        },
        error: (err: any) => {
          this.apprenticeAccessRequestInProgress = false;
          console.error('ERROR CARGANDO ACCESOS DE APRENDICES:', err);

          if (!silent) {
            Swal.fire({
              icon: 'error',
              title: 'No se pudo cargar la actividad',
              text:
                err?.error?.message ||
                'No fue posible consultar los accesos de los aprendices.'
            });
          }
        }
      });
  }

  // =========================================================
  // APRENDICES — ÚLTIMO INGRESO / SALIDA
  // =========================================================

  private applyLastAccessesToUsers(): void {
    if (this.users.length === 0) {
      return;
    }

    this.users = this.users.map((user: User) => {
      const personalLogs = this.apprenticeAccessLogs.filter(
        (log: AccessLog) => {
          if (log.result !== 'Permitido') {
            return false;
          }

          return this.accessBelongsToUser(log, user);
        }
      );

      const lastEntry = personalLogs.find(
        log => log.type === 'Ingreso'
      );

      const lastExit = personalLogs.find(
        log => log.type === 'Salida'
      );

      return {
        ...user,
        lastEntry: lastEntry?.date || '',
        lastExit: lastExit?.date || ''
      };
    });
  }

  private accessBelongsToUser(log: AccessLog, user: User): boolean {
    const userUid = String(user.id || '').trim();
    const logUid = String(log.uid || '').trim();

    if (userUid && logUid) {
      return userUid === logUid;
    }

    const userEmail = String(user.email || '')
      .trim()
      .toLowerCase();

    const logEmail = String(log.email || '')
      .trim()
      .toLowerCase();

    if (userEmail && logEmail && userEmail === logEmail) {
      return true;
    }

    const userDocument = String(user.document || '').trim();
    const logDocument = String(log.document || '').trim();

    return !!userDocument
      && !!logDocument
      && userDocument === logDocument;
  }

  // =========================================================
  // BUSCADORES
  // =========================================================

  filterUsers(): void {
    const normalizedSearch = this.normalizeSearchValue(this.searchTerm);

    if (!normalizedSearch) {
      this.filteredUsers = [...this.users];
      return;
    }

    const terms = normalizedSearch
      .split(/\s+/)
      .filter(Boolean);

    this.filteredUsers = this.users.filter((user: User) => {
      const searchable = this.normalizeSearchValue([
        user.name,
        user.documentType,
        user.document,
        user.email,
        user.role
      ].join(' '));

      return terms.every(term => searchable.includes(term));
    });
  }

  clearUserSearch(): void {
    this.searchTerm = '';
    this.filterUsers();
  }

  filterLogs(): void {
    const normalizedSearch = this.normalizeSearchValue(this.accessSearchTerm);

    if (!normalizedSearch) {
      this.filteredLogs = [...this.logs];
      return;
    }

    const terms = normalizedSearch
      .split(/\s+/)
      .filter(Boolean);

    this.filteredLogs = this.logs.filter((log: AccessLog) => {
      const searchable = this.normalizeSearchValue([
        log.type,
        log.result,
        log.method,
        log.device,
        log.name,
        log.email,
        log.document,
        this.formatAccessDate(log.date),
        this.formatAccessTime(log.date)
      ].join(' '));

      return terms.every(term => searchable.includes(term));
    });
  }

  clearAccessSearch(): void {
    this.accessSearchTerm = '';
    this.filterLogs();
  }

  private normalizeSearchValue(value: any): string {
    return String(value ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, ' ');
  }

  // =========================================================
  // UI
  // =========================================================

  toggleMenu(): void {
    this.menuOpen = !this.menuOpen;
  }

  changeTab(tab: string): void {
    this.activeTab = tab;

    if (tab === 'dashboard' || tab === 'accesos') {
      this.loadMyAccesses(true);
    }

    if (tab === 'aprendices') {
      this.loadUsers();
      this.loadApprenticeAccesses(true);
    }
  }

  // =========================================================
  // FOTO
  // =========================================================

  uploadPhoto(event: any): void {
    const file = event?.target?.files?.[0];

    if (!file) {
      return;
    }

    this.selectedPhoto = file;

    const reader = new FileReader();

    reader.onload = () => {
      this.profile.photo = reader.result as string;
    };

    reader.readAsDataURL(file);
  }

  // =========================================================
  // ACTUALIZAR PERFIL
  // =========================================================

  async updateProfile(): Promise<void> {
    if (!this.currentUser) {
      Swal.fire(
        'Error',
        'No se encontró el usuario actual.',
        'error'
      );
      return;
    }

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
        email: this.profile.email,
        phone: this.profile.phone,
        address: this.profile.address,
        photo: this.profile.photo,
        actor_uid: this.currentUser.uid
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
              text: 'Tus datos fueron actualizados correctamente.',
              timer: 1800,
              showConfirmButton: false
            });

            this.selectedPhoto = null;
            this.loadProfile();
          },
          error: (err: any) => {
            console.error('ERROR ACTUALIZANDO PERFIL:', err);

            Swal.fire({
              icon: 'error',
              title: 'No se pudo actualizar',
              text:
                err?.error?.message ||
                err?.error?.detail ||
                'No fue posible actualizar tus datos.'
            });
          }
        });
    } catch (error) {
      console.error('ERROR SUBIENDO FOTO:', error);

      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No fue posible subir la foto.'
      });
    }
  }

  // =========================================================
  // LOGOUT
  // =========================================================

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
