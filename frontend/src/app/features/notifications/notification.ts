import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import Swal from 'sweetalert2';

interface Notification {

  id: number;

  title: string;

  message: string;

  date: string;

  type: 'success' | 'warning' | 'info' | 'primary';

  read: boolean;

}

@Component({

  selector: 'app-notification',

  standalone: true,

  imports: [
    CommonModule
  ],

  templateUrl: './notification.html',

  styleUrls: ['./notification.css']

})

export class NotificationComponent {

  // =========================
  // NOTIFICACIONES
  // =========================

  notifications: Notification[] = [

    {

      id: 1,

      title: 'Acceso permitido',

      message: 'Tu ingreso fue registrado correctamente mediante huella dactilar.',

      date: 'Hoy • 07:42 AM',

      type: 'success',

      read: false

    },

    {

      id: 2,

      title: 'Intento de acceso denegado',

      message: 'Se detectó un intento de ingreso no autorizado.',

      date: 'Ayer • 05:30 PM',

      type: 'warning',

      read: false

    },

    {

      id: 3,

      title: 'Perfil actualizado',

      message: 'La información de tu cuenta fue actualizada exitosamente.',

      date: '24/06/2026 • 11:20 AM',

      type: 'info',

      read: true

    },

    {

      id: 4,

      title: 'Bienvenido a SegurEntry',

      message: 'Tu cuenta ha sido creada correctamente.',

      date: '20/06/2026 • 09:00 AM',

      type: 'primary',

      read: true

    }

  ];

  // =========================
  // MARCAR TODAS COMO LEÍDAS
  // =========================

  markAllAsRead() {

    this.notifications.forEach(notification => {

      notification.read = true;

    });

    Swal.fire({

      icon: 'success',

      title: 'Notificaciones actualizadas',

      text: 'Todas las notificaciones fueron marcadas como leídas.',

      timer: 1800,

      showConfirmButton: false

    });

  }

  // =========================
  // ELIMINAR NOTIFICACIÓN
  // =========================

  deleteNotification(id: number) {

    Swal.fire({

      title: 'Eliminar notificación',

      text: '¿Deseas eliminar esta notificación?',

      icon: 'warning',

      showCancelButton: true,

      confirmButtonText: 'Eliminar',

      cancelButtonText: 'Cancelar'

    }).then(result => {

      if (result.isConfirmed) {

        this.notifications = this.notifications.filter(

          notification => notification.id !== id

        );

        Swal.fire({

          icon: 'success',

          title: 'Notificación eliminada',

          timer: 1500,

          showConfirmButton: false

        });

      }

    });

  }

}