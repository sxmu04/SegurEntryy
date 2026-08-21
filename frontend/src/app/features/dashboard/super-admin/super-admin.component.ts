import { Component, OnInit, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Auth } from '@angular/fire/auth';
import Swal from 'sweetalert2';
import { AuthService } from '../../../core/services/auth.service';

import { DashboardService } from '../../../core/services/dashboard.service';



interface User {
  uid: string;
  name: string;
  email: string;
  role: string;
  active: boolean;
  document?: string;
  phone?: string;
  address?: string;
  photo?: string;
  created_at?: string;
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
    private authService: AuthService
  ) { }

  // ==========================
  // 🆕 VARIABLES QUE FALTABAN (NO BORRO NADA)
  // ==========================
  currentUser: User | null = null;

  profile = {

    name: "",
    email: "",
    phone: "",
    address: "",
    document: "",
    photo: ""

  };

  settings = {
    darkMode: false,
    alerts: true,
    notifications: true
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
    { key: 'settings', label: 'Configuración', icon: 'fa-cog' }
  ];

  setSection(section: string): void { this.activeSection = section; }
  isActive(section: string): boolean { return this.activeSection === section; }
  toggleMenu(): void { this.menuOpen = !this.menuOpen; }




  // ==========================
  // DATA
  // ==========================
  useRealtime = true;

  accesses: User[] = [];
  filteredUsers: User[] = [];

  admins: User[] = [];
  accessLogs: any[] = [];
  invitations: Invitation[] = [];
  notifications: any[] = [];
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
  // INIT
  // ==========================
  ngOnInit(): void {
    this.loadUsers();     // 🔥 SIEMPRE backend primero
    this.safeRealtime();  // 🔥 luego intenta firestore
    this.loadInvitations();
  }

  // ==========================
  // 🔥 REALTIME SEGURO (FIX REAL)
  // ==========================
  safeRealtime(): void {
    try {
      this.listenUsersRealtime();
    } catch (e) {
      console.warn('⚠️ Firestore no disponible');
    }
  }

  listenUsersRealtime(): void {

    if (!this.useRealtime) return;

    try {
      const obs = (this.dashboardService as any).getUsersRealtime?.();
      if (!obs) return;

      obs.subscribe({
        next: (users: any[]) => {

          this.zone.run(() => {

            const mapped = (users || []).map((user: any) => ({
              uid: user.uid || user.id || '',
              name: user.name || '',
              email: user.email || '',
              role: user.role || '',
              active: user.active ?? true,
              document: user.document || '',
              phone: user.phone || '',
              address: user.address || ''
            }));

            console.log('🔥 REALTIME USERS:', mapped);

            // 🔥 SOLO reemplaza si sí hay datos
            if (mapped.length > 0) {
              console.log('✅ Firestore reemplazó datos');

              this.accesses = mapped;
              this.filteredUsers = [...mapped];
              this.lastSnapshot = [...mapped];

              this.syncData();
            } else {
              console.warn('⚠️ Firestore vacío → NO se sobreescribe Django');
            }

          });

        },
        error: (err: any) => {
          console.error('❌ Error realtime:', err);
        }
      });

    } catch (error) {
      console.warn('❌ Error realtime:', error);
    }
  }

  // ==========================
  // 🔥 LOAD BACKEND (CLAVE)
  // ==========================
  loadUsers(): void {

    this.dashboardService.getUsers().subscribe({

      next: (res: any) => {

        console.log('📡 RESPUESTA DJANGO:', res);

        const users = res?.users || res || [];

        if (!users || users.length === 0) {
          console.warn('⚠️ Django devolvió vacío');
          return;
        }

        const mapped = users.map((user: any) => ({

          uid: user.uid || user.id || '',

          name: user.name || '',

          email: user.email || '',

          role: user.role || '',

          active: user.active ?? true,

          document: user.document || '',

          phone: user.phone || '',

          address: user.address || '',

          photo: user.photo || 'assets/avatar.png'

        }));

        console.log('📦 DJANGO USERS:', mapped);

        this.accesses = mapped;
        this.filteredUsers = [...mapped];
        this.lastSnapshot = [...mapped];

        // Buscar el usuario autenticado
        const firebaseUser = this.authService.getUser();

        if (firebaseUser) {

          const me = mapped.find(
            (u: any) => u.email === firebaseUser.email
          );

          if (me) {

            this.currentUser = me;

            this.profile = {

              name: me.name || '',

              email: me.email || '',

              phone: me.phone || '',

              address: me.address || '',

              document: me.document || '',

              photo: me.photo || 'assets/avatar.png'

            };

          }

        }

        this.syncData();

      },

      error: (err: any) => {

        console.error('❌ ERROR BACKEND:', err);

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
    active: true
  };

  openForm() { this.resetForm(); this.editMode = false; this.showForm = true; }
  closeForm() { this.resetForm(); this.showForm = false; }

  resetForm() {
    this.form = { uid: '', name: '', email: '', role: '', active: true };
  }

  editAccess(user: User) {
    this.form = { ...user };
    this.editMode = true;
    this.showForm = true;
    this.isEditing = true;
    this.showModal = true;
  }

  // ==========================
  // CRUD
  // ==========================
  saveAccess(): void {

    if (!this.form.name || !this.form.email || !this.form.role) {
      Swal.fire(
        'Error',
        'Nombre, correo y rol son obligatorios',
        'error'
      );
      return;
    }

    const data = {
      name: this.form.name,
      email: this.form.email,
      role: this.form.role,
      active: this.form.active,
      document: this.form.document || '',
      phone: this.form.phone || '',
      address: this.form.address || ''
    };

    console.log('📤 DATOS CRUD:', data);
    console.log('🆔 UID:', this.form.uid);

    if (this.editMode) {

      if (!this.form.uid) {
        Swal.fire(
          'Error',
          'No se encontró el ID del usuario que se quiere modificar',
          'error'
        );
        return;
      }

      this.dashboardService.updateUser(this.form.uid, data)
        .subscribe({
          next: (response: any) => {

            console.log('✅ USUARIO ACTUALIZADO:', response);

            this.loadUsers();
            this.closeModal();

            Swal.fire({
              icon: 'success',
              title: 'Usuario actualizado',
              text: 'Los cambios se guardaron correctamente',
              timer: 1800,
              showConfirmButton: false
            });
          },

          error: (err: any) => {

            console.error('❌ ERROR ACTUALIZANDO:', err);

            Swal.fire({
              icon: 'error',
              title: 'No se pudo actualizar',
              text:
                err?.error?.message ||
                err?.error?.detail ||
                'El servidor no permitió actualizar el usuario'
            });
          }
        });

    } else {

      this.dashboardService.createUser(data)
        .subscribe({
          next: (response: any) => {

            console.log('✅ USUARIO CREADO:', response);

            this.loadUsers();
            this.closeModal();

            Swal.fire({
              icon: 'success',
              title: 'Usuario creado',
              text: 'El usuario fue registrado correctamente',
              timer: 1800,
              showConfirmButton: false
            });
          },

          error: (err: any) => {

            console.error('❌ ERROR CREANDO:', err);

            Swal.fire({
              icon: 'error',
              title: 'No se pudo crear',
              text:
                err?.error?.message ||
                err?.error?.detail ||
                'El servidor rechazó la creación del usuario'
            });
          }
        });
    }
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

      console.log('🗑️ ELIMINANDO UID:', uid);

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

            console.error('❌ ERROR ELIMINANDO:', err);

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
  updateProfile(): void {

    if (!this.currentUser) {
      Swal.fire(
        'Error',
        'No hay un usuario seleccionado',
        'error'
      );
      return;
    }

    const updated = {
      ...this.currentUser,
      email: this.profile.email,
      phone: this.profile.phone,
      address: this.profile.address
    };

    console.log('📤 ACTUALIZANDO PERFIL:', updated);
    console.log('🆔 UID:', this.currentUser.uid);

    this.dashboardService.updateUser(
      this.currentUser.uid,
      updated
    ).subscribe({

      next: (response: any) => {

        console.log('✅ PERFIL ACTUALIZADO:', response);

        this.currentUser = updated;

        this.loadUsers();

        Swal.fire({
          icon: 'success',
          title: 'Perfil actualizado',
          text: 'Los cambios se guardaron correctamente',
          timer: 1800,
          showConfirmButton: false
        });

      },

      error: (err: any) => {

        console.error('❌ ERROR ACTUALIZANDO PERFIL:', err);

        Swal.fire({
          icon: 'error',
          title: 'Error',
          text:
            err?.error?.message ||
            err?.error?.detail ||
            'No fue posible actualizar el perfil'
        });

      }

    });
  }

  // ==========================
  // FILTER
  // ==========================
  filterUsers(event: any): void {
    const value = event.target.value.toLowerCase();

    this.filteredUsers = this.accesses.filter(user =>
      user.name?.toLowerCase().includes(value) ||
      user.email?.toLowerCase().includes(value) ||
      user.role?.toLowerCase().includes(value)
    );
  }

  // ==========================
  // GETTERS
  // ==========================
  get users(): User[] {
    return this.filteredUsers;
  }

  // ==========================
  // MODAL
  // ==========================
  openModal() {
    this.openForm();
    this.showModal = true;
    this.isEditing = false;
  }

  closeModal() {
    this.closeForm();
    this.showModal = false;
    this.isEditing = false;
  }

  editUser(u: User) { this.editAccess(u); }
  deleteUser(user: any) {

    console.log("USUARIO COMPLETO:", user);

    console.log("UID:", user.uid);

    this.deleteAccess(user.uid);

  }
  submitForm() { this.saveAccess(); }

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

      error: err => {

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
}