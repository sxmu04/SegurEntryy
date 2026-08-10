import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-perfil',
  standalone: true,
  imports: [
    CommonModule
  ],
  templateUrl: './perfil.html',
  styleUrls: ['./perfil.css']
})
export class PerfilComponent {

  // =========================
  // DATOS TEMPORALES
  // =========================

  user = {

    name: 'Juan Pérez Gómez',

    email: 'juan@sena.edu.co',

    document: '1234567890',

    phone: '3001234567',

    role: 'Aprendiz',

    status: 'Activo',

    center: 'Centro de Servicios Financieros',

    program: 'ADSO',

    record: '2876543',

    registerDate: '15/01/2026'

  };

  // =========================
  // EDITAR PERFIL
  // =========================

  editProfile() {

    Swal.fire({

      icon: 'info',

      title: 'Editar Perfil',

      text: 'Esta funcionalidad se conectará con el backend.',

      confirmButtonColor: '#2563EB'

    });

  }

  // =========================
  // GUARDAR CAMBIOS
  // =========================

  saveProfile() {

    Swal.fire({

      icon: 'success',

      title: 'Perfil actualizado',

      text: 'Los cambios se guardarán cuando se conecte el backend.',

      confirmButtonColor: '#2563EB'

    });

  }

  // =========================
  // CAMBIAR CONTRASEÑA
  // =========================

  changePassword() {

    Swal.fire({

      icon: 'warning',

      title: 'Cambiar contraseña',

      text: 'Esta opción estará disponible en la siguiente etapa del proyecto.',

      confirmButtonColor: '#2563EB'

    });

  }

}