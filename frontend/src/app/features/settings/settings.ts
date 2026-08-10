import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import Swal from 'sweetalert2';

@Component({

  selector: 'app-settings',

  standalone: true,

  imports: [
    CommonModule
  ],

  templateUrl: './settings.html',

  styleUrls: ['./settings.css']

})

export class SettingsComponent {

  // =========================
  // CONFIGURACIÓN
  // =========================

  settings = {

    notifications: true,

    emailNotifications: true,

    theme: 'Oscuro',

    language: 'Español',

    loginSecurity: true,

    rememberDevice: false,

    timezone: 'GMT-5 (Colombia)',

    dateFormat: 'DD/MM/AAAA'

  };

  // =========================
  // GUARDAR CONFIGURACIÓN
  // =========================

  saveSettings() {

    Swal.fire({

      icon: 'success',

      title: 'Configuración guardada',

      text: 'Los cambios fueron almacenados correctamente.',

      timer: 1800,

      showConfirmButton: false

    });

  }

  // =========================
  // RESTAURAR CONFIGURACIÓN
  // =========================

  resetSettings() {

    Swal.fire({

      title: 'Restaurar configuración',

      text: '¿Deseas volver a la configuración predeterminada?',

      icon: 'warning',

      showCancelButton: true,

      confirmButtonText: 'Restaurar',

      cancelButtonText: 'Cancelar'

    }).then(result => {

      if(result.isConfirmed){

        this.settings = {

          notifications: true,

          emailNotifications: true,

          theme: 'Oscuro',

          language: 'Español',

          loginSecurity: true,

          rememberDevice: false,

          timezone: 'GMT-5 (Colombia)',

          dateFormat: 'DD/MM/AAAA'

        };

        Swal.fire({

          icon: 'success',

          title: 'Configuración restaurada',

          timer: 1500,

          showConfirmButton: false

        });

      }

    });

  }

}