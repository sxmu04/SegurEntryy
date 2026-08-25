import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';
import { FirestoreService } from '../../../core/services/firestore.service';
import { DashboardService } from '../../../core/services/dashboard.service';
import { AuthService } from '../../../core/services/auth.service';

interface AccessLog {
  id: string;
  name: string;
  email: string;
  date: string;
  time: string;
  type: 'Ingreso' | 'Salida';
  result: 'Permitido' | 'Denegado';
  method: string;
}

// 🔥 interfaz usuarios
interface User {
  id: string;
  name: string;
  email: string;
  document?: string;
  role?: string;
}

@Component({
  selector: 'app-instructor',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './instructor.html',
  styleUrls: ['./instructor.css']
})
export class InstructorComponent implements OnInit {

  menuOpen = true;
  activeTab: string = 'dashboard';

  // =========================
  // LOGS
  // =========================
  logs: AccessLog[] = [];
  filteredLogs: AccessLog[] = [];

  currentUser: any = null;

  selectedPhoto: File | null = null;

  profile = {
    name: '',
    email: '',
    phone: '',
    address: '',
    document: '',
    photo: 'assets/avatar.png'
  };

  // =========================
  // USUARIOS
  // =========================
  users: User[] = [];
  filteredUsers: User[] = [];

  // =========================
  // BUSCADOR
  // =========================
  searchTerm = '';

  // =========================
  // NOTIFICACIONES
  // =========================
  notifications: string[] = [
    'Nuevo acceso registrado',
    'Usuario denegado',
    'Sistema activo correctamente'
  ];

  // =========================
  // STATS
  // =========================
  stats = {
    ingresos: 0,
    ultimoIngreso: '--:--',
    permitidos: 0,
    denegados: 0
  };

  constructor(
    private router: Router,
    private firestoreService: FirestoreService,
    private dashboardService: DashboardService,
    private authService: AuthService
  ) { }

  ngOnInit() {
    this.loadLogs();
    this.loadUsers();
    this.loadProfile();
  }

  // =========================
  // 🔥 CARGAR USUARIOS BIEN
  // =========================
  loadUsers() {
    this.firestoreService.getUsers().subscribe({
      next: (data: any[]) => {

        console.log('🔥 RAW Firestore:', data);

        // 🔥 MAPEO INTELIGENTE + FILTRO
        this.users = data
          .map(u => ({
            id: u.id,

            name: u.name || u.nombre || 'Sin nombre',

            email: u.email || u.correo || 'Sin correo',

            document: u.document || u.documento || '',

            role: u.role || u.rol || ''
          }))
          // 🔥 SOLO APRENDICES
          .filter(u => u.role === 'aprendiz' || u.role === 'Aprendiz' || u.role === '');

        this.filteredUsers = this.users;

        console.log('✅ Usuarios procesados:', this.users);
      },

      error: (err) => {
        console.error('❌ Error cargando usuarios:', err);

        // fallback visual
        this.users = [
          { id: '1', name: 'Demo Usuario', email: 'demo@email.com' }
        ];
        this.filteredUsers = this.users;
      }
    });
  }

  // =========================
  // 🔍 FILTRO USUARIOS
  // =========================
  filterUsers() {

    const term = this.searchTerm
      .trim()
      .toLowerCase();

    this.filteredUsers = this.users.filter(user =>

      (user.name || '')
        .toLowerCase()
        .includes(term)

      ||

      (user.document || '')
        .toLowerCase()
        .includes(term)

    );
  }
  // =========================
  // LOGS
  // =========================
  loadLogs() {
    this.firestoreService.getAccessLogs().subscribe((data: any[]) => {

      // 🔥 también protegemos logs
      this.logs = data.map(l => ({
        ...l,
        name: l.name || 'Sin nombre',
        email: l.email || 'Sin email'
      }));

      this.filteredLogs = this.logs;
      this.calculateStats();
    });
  }

  // =========================
  // FILTRO LOGS
  // =========================
  filterLogs() {
    const term = this.searchTerm.toLowerCase();

    this.filteredLogs = this.logs.filter(log =>
      (log.name || '').toLowerCase().includes(term) ||
      (log.email || '').toLowerCase().includes(term)
    );
  }

  // =========================
  // STATS
  // =========================
  calculateStats() {
    const ingresos = this.logs.filter(l => l.type === 'Ingreso');
    const permitidos = this.logs.filter(l => l.result === 'Permitido');
    const denegados = this.logs.filter(l => l.result === 'Denegado');

    this.stats.ingresos = ingresos.length;
    this.stats.permitidos = permitidos.length;
    this.stats.denegados = denegados.length;

    if (ingresos.length > 0) {
      this.stats.ultimoIngreso = ingresos[0].time;
    }
  }

  // =========================
  // UI
  // =========================
  toggleMenu() {
    this.menuOpen = !this.menuOpen;
  }

  changeTab(tab: string) {
    this.activeTab = tab;
  }

  logout() {
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

  loadProfile(): void {

    this.dashboardService.getUsers().subscribe({

      next: (res: any) => {

        const users = res.users || [];

        const firebaseUser = this.authService.getUser();

        if (!firebaseUser) return;

        const me = users.find(
          (u: any) => u.email === firebaseUser.email
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

      error: (err) => {
        console.error(err);
      }

    });

  }

  uploadPhoto(event: any): void {

    const file = event.target.files[0];

    if (!file) return;

    this.selectedPhoto = file;

    const reader = new FileReader();

    reader.onload = () => {
      this.profile.photo = reader.result as string;
    };

    reader.readAsDataURL(file);

  }

  async updateProfile() {

    if (!this.currentUser) {

      Swal.fire(
        'Error',
        'No se encontró el usuario actual.',
        'error'
      );

      return;
    }

    try {

      // =========================
      // SUBIR FOTO
      // =========================

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


      // =========================
      // DATOS EDITABLES
      // =========================

      const data = {

        name: this.profile.name,

        email: this.profile.email,

        phone: this.profile.phone,

        address: this.profile.address,

        document: this.profile.document,

        photo: this.profile.photo

        // IMPORTANTE:
        // NO enviamos role
        // NO enviamos uid
        // NO enviamos active
      };


      console.log(
        '📤 ACTUALIZANDO PERFIL INSTRUCTOR:',
        data
      );

      console.log(
        '🆔 UID:',
        this.currentUser.uid
      );


      // =========================
      // ACTUALIZAR
      // =========================

      this.dashboardService
        .updateUser(
          this.currentUser.uid,
          data
        )
        .subscribe({

          next: (response: any) => {

            console.log(
              '✅ PERFIL ACTUALIZADO:',
              response
            );

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

            console.error(
              '❌ ERROR ACTUALIZANDO PERFIL:',
              err
            );

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

    }

    catch (error) {

      console.error(
        '❌ ERROR SUBIENDO FOTO:',
        error
      );

      Swal.fire({

        icon: 'error',

        title: 'Error',

        text: 'No fue posible subir la foto.'

      });

    }

  }
}