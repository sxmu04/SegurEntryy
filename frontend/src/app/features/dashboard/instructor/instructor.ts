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
export class InstructorComponent
  implements OnInit, OnDestroy {

  menuOpen = true;

  activeTab:
    string =
      'dashboard';


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
  // MIS ACCESOS PERSONALES
  // =========================================================

  logs:
    AccessLog[] =
      [];

  filteredLogs:
    AccessLog[] =
      [];

  private accessRefreshTimer:
    ReturnType<typeof setInterval> | null =
      null;

  private readonly accessRefreshMs =
    1000;

  private accessRequestInProgress =
    false;


  // =========================================================
  // APRENDICES
  // =========================================================

  users:
    User[] =
      [];

  filteredUsers:
    User[] =
      [];

  apprenticeAccessLogs:
    AccessLog[] =
      [];

  private apprenticeAccessRequestInProgress =
    false;


  // =========================================================
  // BUSCADOR
  // =========================================================

  searchTerm =
    '';


  // =========================================================
  // NOTIFICACIONES
  // =========================================================

  notifications:
    string[] = [
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
    private router:
      Router,

    private firestoreService:
      FirestoreService,

    private dashboardService:
      DashboardService,

    private authService:
      AuthService
  ) {}


  // =========================================================
  // INIT
  // =========================================================

  ngOnInit():
    void {

    this.loadUsers();
    this.loadProfile();

  }


  ngOnDestroy():
    void {

    this.stopAccessAutoRefresh();

  }


  // =========================================================
  // PERFIL
  // =========================================================

  loadProfile():
    void {

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
                    uid === firebaseUid
                  )
                  ||
                  (
                    firebaseEmail &&
                    email === firebaseEmail
                  )
                );

              }
            );

          if (!me) {
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

          // Una vez sabemos quién es el Instructor,
          // cargamos SOLO sus propios accesos.
          this.loadMyAccesses();

          this.startAccessAutoRefresh();

        },

        error: (
          err: any
        ) => {

          console.error(
            'ERROR CARGANDO PERFIL DEL INSTRUCTOR:',
            err
          );

        }

      });

  }


  // =========================================================
  // DASHBOARD — MIS ACCESOS
  // =========================================================

  loadMyAccesses(
    silent:
      boolean =
        false
  ):
    void {

    if (
      !this.currentUser
      ||
      this.accessRequestInProgress
    ) {
      return;
    }

    this.accessRequestInProgress =
      true;

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

          const allLogs =
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

          this.logs =
            allLogs

              // IMPORTANTE:
              // El Instructor ve en su Dashboard únicamente
              // SUS propios accesos.
              .filter(
                (
                  access:
                    any
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

                  if (
                    myUid &&
                    accessUid
                  ) {

                    return (
                      myUid ===
                      accessUid
                    );

                  }

                  if (
                    myEmail &&
                    accessEmail &&
                    myEmail ===
                      accessEmail
                  ) {
                    return true;
                  }

                  if (
                    myDocument &&
                    accessDocument &&
                    myDocument ===
                      accessDocument
                  ) {
                    return true;
                  }

                  return false;

                }
              )

              .map(
                (
                  access:
                    any
                ):
                  AccessLog => {

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
                    'Ingreso' |
                    'Salida' =
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
                        ? 'Salida'
                        : 'Ingreso';

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

                  const result:
                    'Permitido' |
                    'Denegado' =
                      allowed
                        ? 'Permitido'
                        : 'Denegado';

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

                    name:
                      access?.user ||
                      access?.name ||
                      this.profile.name ||
                      'Instructor',

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

                    date:
                      String(
                        access?.date ||
                        access?.created_at ||
                        access?.timestamp ||
                        ''
                      ),

                    type:
                      type,

                    result:
                      result,

                    method:
                      access?.method ||
                      access?.access_method ||
                      'Huella',

                    device:
                      access?.device ||
                      access?.device_name ||
                      ''

                  };

                }
              )

              .sort(
                (
                  a:
                    AccessLog,
                  b:
                    AccessLog
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

          this.filteredLogs =
            this.logs;

          this.calculateStats();

          this.accessRequestInProgress =
            false;

        },

        error: (
          err: any
        ) => {

          this.accessRequestInProgress =
            false;

          console.error(
            'ERROR CARGANDO ACCESOS DEL INSTRUCTOR:',
            err
          );

          if (!silent) {

            Swal.fire({
              icon:
                'error',
              title:
                'No se pudieron cargar tus accesos',
              text:
                err?.error?.message ||
                'No fue posible consultar tus ingresos y salidas.'
            });

          }

        }

      });

  }


  // =========================================================
  // AUTOREFRESH DEL DASHBOARD
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
            this.activeTab ===
              'dashboard'
          ) {

            this.loadMyAccesses(
              true
            );

          }

          if (
            this.activeTab ===
              'aprendices'
          ) {

            this.loadApprenticeAccesses(
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
  // ESTADÍSTICAS PERSONALES
  // =========================================================

  calculateStats():
    void {

    const ingresos =
      this.logs.filter(
        log =>
          log.type ===
          'Ingreso'
      );

    const salidas =
      this.logs.filter(
        log =>
          log.type ===
          'Salida'
      );

    const permitidos =
      this.logs.filter(
        log =>
          log.result ===
          'Permitido'
      );

    const denegados =
      this.logs.filter(
        log =>
          log.result ===
          'Denegado'
      );

    this.stats.ingresos =
      ingresos.length;

    this.stats.salidas =
      salidas.length;

    this.stats.permitidos =
      permitidos.length;

    this.stats.denegados =
      denegados.length;

    this.stats.ultimoMovimiento =
      this.logs.length > 0
        ? this.formatAccessTime(
            this.logs[0].date
          )
        : '--:--';

  }


  get recentMyAccesses():
    AccessLog[] {

    return this.logs
      .slice(
        0,
        8
      );

  }


  // =========================================================
  // UTILIDADES FECHA / HORA
  // =========================================================

  private parseAccessDate(
    value: any
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


  formatAccessDate(
    value: any
  ):
    string {

    const date =
      this.parseAccessDate(
        value
      );

    if (!date) {
      return '—';
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


  formatAccessTime(
    value: any
  ):
    string {

    const date =
      this.parseAccessDate(
        value
      );

    if (!date) {
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


  // =========================================================
  // APRENDICES — CARGAR TODOS LOS REGISTRADOS
  // =========================================================

  loadUsers():
    void {

    this.firestoreService
      .getUsers()
      .subscribe({

        next: (
          data:
            any[]
        ) => {

          const source =
            Array.isArray(
              data
            )
              ? data
              : [];

          this.users =
            source

              .map(
                (
                  user:
                    any
                ):
                  User => ({

                  id:
                    String(
                      user?.uid ||
                      user?.id ||
                      ''
                    ),

                  name:
                    String(
                      user?.name ||
                      user?.nombre ||
                      'Sin nombre'
                    ),

                  email:
                    String(
                      user?.email ||
                      user?.correo ||
                      ''
                    ),

                  documentType:
                    String(
                      user?.document_type ||
                      user?.documentType ||
                      user?.tipo_documento ||
                      user?.tipoDocumento ||
                      ''
                    )
                      .trim()
                      .toUpperCase(),

                  document:
                    String(
                      user?.document ||
                      user?.documento ||
                      ''
                    ),

                  role:
                    String(
                      user?.role ||
                      user?.rol ||
                      ''
                    )
                      .trim()
                      .toLowerCase(),

                  active:
                    user?.active !==
                      false,

                  lastEntry:
                    '',

                  lastExit:
                    ''

                })
              )

              // El Instructor visualiza TODOS los usuarios
              // cuyo rol registrado sea Aprendiz.
              .filter(
                user =>
                  user.role ===
                  'aprendiz'
              )

              .sort(
                (
                  a:
                    User,
                  b:
                    User
                ) => {

                  return a.name
                    .localeCompare(
                      b.name,
                      'es',
                      {
                        sensitivity:
                          'base'
                      }
                    );

                }
              );

          this.applyLastAccessesToUsers();

          this.filterUsers();

          // Una vez conocemos los Aprendices,
          // consultamos su actividad.
          this.loadApprenticeAccesses(
            true
          );

        },

        error: (
          err:
            any
        ) => {

          console.error(
            'ERROR CARGANDO APRENDICES:',
            err
          );

          this.users =
            [];

          this.filteredUsers =
            [];

        }

      });

  }


  // =========================================================
  // APRENDICES — CARGAR ACCESOS
  // =========================================================

  loadApprenticeAccesses(
    silent:
      boolean =
        false
  ):
    void {

    if (
      this.apprenticeAccessRequestInProgress
    ) {
      return;
    }

    this.apprenticeAccessRequestInProgress =
      true;

    this.dashboardService
      .getAccesses()
      .subscribe({

        next: (
          res:
            any
        ) => {

          const rawLogs =
            res?.accesses ||
            res?.access ||
            res?.logs ||
            res?.results ||
            res ||
            [];

          const allLogs =
            Array.isArray(
              rawLogs
            )
              ? rawLogs
              : [];

          this.apprenticeAccessLogs =
            allLogs
              .map(
                (
                  access:
                    any
                ):
                  AccessLog => {

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
                    'Ingreso' |
                    'Salida' =
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
                        ? 'Salida'
                        : 'Ingreso';

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
                        access?.user_uid ||
                        access?.userId ||
                        ''
                      ),

                    name:
                      String(
                        access?.user ||
                        access?.name ||
                        ''
                      ),

                    email:
                      String(
                        access?.email ||
                        access?.user_email ||
                        ''
                      ),

                    document:
                      String(
                        access?.document ||
                        access?.user_document ||
                        ''
                      ),

                    date:
                      String(
                        access?.date ||
                        access?.created_at ||
                        access?.timestamp ||
                        ''
                      ),

                    type:
                      type,

                    result:
                      allowed
                        ? 'Permitido'
                        : 'Denegado',

                    method:
                      String(
                        access?.method ||
                        access?.access_method ||
                        'Huella'
                      ),

                    device:
                      String(
                        access?.device ||
                        access?.device_name ||
                        ''
                      )

                  };

                }
              )

              .sort(
                (
                  a:
                    AccessLog,
                  b:
                    AccessLog
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

          this.applyLastAccessesToUsers();

          this.filterUsers();

          this.apprenticeAccessRequestInProgress =
            false;

        },

        error: (
          err:
            any
        ) => {

          this.apprenticeAccessRequestInProgress =
            false;

          console.error(
            'ERROR CARGANDO ACCESOS DE APRENDICES:',
            err
          );

          if (!silent) {

            Swal.fire({
              icon:
                'error',
              title:
                'No se pudo cargar la actividad',
              text:
                err?.error?.message ||
                'No fue posible consultar los accesos de los aprendices.'
            });

          }

        }

      });

  }


  // =========================================================
  // APRENDICES — ÚLTIMO INGRESO / ÚLTIMA SALIDA
  // =========================================================

  private applyLastAccessesToUsers():
    void {

    if (
      this.users.length ===
      0
    ) {
      return;
    }

    this.users =
      this.users.map(
        (
          user:
            User
        ) => {

          const personalLogs =
            this.apprenticeAccessLogs
              .filter(
                (
                  log:
                    AccessLog
                ) => {

                  // Para "último ingreso" y "última salida"
                  // únicamente cuentan movimientos realmente
                  // permitidos.
                  if (
                    log.result !==
                    'Permitido'
                  ) {
                    return false;
                  }

                  return this.accessBelongsToUser(
                    log,
                    user
                  );

                }
              );

          const lastEntry =
            personalLogs.find(
              log =>
                log.type ===
                'Ingreso'
            );

          const lastExit =
            personalLogs.find(
              log =>
                log.type ===
                'Salida'
            );

          return {
            ...user,

            lastEntry:
              lastEntry?.date ||
              '',

            lastExit:
              lastExit?.date ||
              ''
          };

        }
      );

  }


  private accessBelongsToUser(
    log:
      AccessLog,
    user:
      User
  ):
    boolean {

    const userUid =
      String(
        user.id ||
        ''
      )
        .trim();

    const logUid =
      String(
        log.uid ||
        ''
      )
        .trim();

    if (
      userUid &&
      logUid
    ) {

      return (
        userUid ===
        logUid
      );

    }

    const userEmail =
      String(
        user.email ||
        ''
      )
        .trim()
        .toLowerCase();

    const logEmail =
      String(
        log.email ||
        ''
      )
        .trim()
        .toLowerCase();

    if (
      userEmail &&
      logEmail &&
      userEmail ===
        logEmail
    ) {
      return true;
    }

    const userDocument =
      String(
        user.document ||
        ''
      )
        .trim();

    const logDocument =
      String(
        log.document ||
        ''
      )
        .trim();

    return (
      !!userDocument &&
      !!logDocument &&
      userDocument ===
        logDocument
    );

  }


  // =========================================================
  // APRENDICES — BUSCADOR COMBINADO
  // =========================================================

  filterUsers():
    void {

    const normalizedSearch =
      this.normalizeSearchValue(
        this.searchTerm
      );

    if (
      !normalizedSearch
    ) {

      this.filteredUsers =
        [...this.users];

      return;

    }

    const terms =
      normalizedSearch
        .split(
          /\s+/
        )
        .filter(
          Boolean
        );

    this.filteredUsers =
      this.users.filter(
        (
          user:
            User
        ) => {

          // Se construye una sola cadena con:
          // nombre + apellido + tipo documento +
          // número documento + correo + rol.
          //
          // Cada término escrito debe aparecer en esa cadena.
          // Por eso funcionan búsquedas como:
          //
          // "juan perez"
          // "cc 123456"
          // "juan perez cc 123456"
          //
          const searchable =
            this.normalizeSearchValue(
              [
                user.name,
                user.documentType,
                user.document,
                user.email,
                user.role
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


  clearUserSearch():
    void {

    this.searchTerm =
      '';

    this.filterUsers();

  }


  private normalizeSearchValue(
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


  filterLogs():
    void {

    const term =
      this.searchTerm
        .trim()
        .toLowerCase();

    this.filteredLogs =
      this.logs.filter(
        log => {

          return (
            (
              log.name ||
              ''
            )
              .toLowerCase()
              .includes(
                term
              )
            ||
            (
              log.email ||
              ''
            )
              .toLowerCase()
              .includes(
                term
              )
          );

        }
      );

  }


  // =========================================================
  // UI
  // =========================================================

  toggleMenu():
    void {

    this.menuOpen =
      !this.menuOpen;

  }


  changeTab(
    tab:
      string
  ):
    void {

    this.activeTab =
      tab;

    if (
      tab ===
      'dashboard'
    ) {

      this.loadMyAccesses(
        true
      );

    }

    if (
      tab ===
      'aprendices'
    ) {

      this.loadUsers();
      this.loadApprenticeAccesses(
        true
      );

    }

  }


  // =========================================================
  // FOTO
  // =========================================================

  uploadPhoto(
    event: any
  ):
    void {

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

        // El Instructor solo puede editar estos campos.
        // Nombre, tipo de documento y número de documento
        // son datos de identidad protegidos.
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
              icon:
                'success',
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
            err:
              any
          ) => {

            console.error(
              'ERROR ACTUALIZANDO PERFIL:',
              err
            );

            Swal.fire({
              icon:
                'error',
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
        icon:
          'error',
        title:
          'Error',
        text:
          'No fue posible subir la foto.'
      });

    }

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
        'Salir'
    })
      .then(
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
