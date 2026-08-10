import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import Swal from 'sweetalert2';

interface AccessHistory {

  id: number;

  name: string;

  document: string;

  date: string;

  time: string;

  status: 'Permitido' | 'Denegado';

  method: string;

  door: string;

  observation: string;

}

@Component({

  selector: 'app-access-history',

  standalone: true,

  imports: [
    CommonModule
  ],

  templateUrl: './access-history.html',

  styleUrls: ['./access-history.css']

})

export class AccessHistoryComponent {

  // =========================
  // HISTORIAL
  // =========================

  history: AccessHistory[] = [

    {

      id: 1,

      name: 'Juan Pérez',

      document: '1032456789',

      date: '25/06/2026',

      time: '07:42 AM',

      status: 'Permitido',

      method: 'Huella',

      door: 'Principal',

      observation: 'Ingreso autorizado'

    },

    {

      id: 2,

      name: 'María Gómez',

      document: '1019876543',

      date: '25/06/2026',

      time: '08:15 AM',

      status: 'Permitido',

      method: 'RFID',

      door: 'Bloque A',

      observation: 'Ingreso autorizado'

    },

    {

      id: 3,

      name: 'Carlos Ruiz',

      document: '1023459876',

      date: '25/06/2026',

      time: '09:02 AM',

      status: 'Denegado',

      method: 'Huella',

      door: 'Laboratorio',

      observation: 'Huella no registrada'

    },

    {

      id: 4,

      name: 'Ana Torres',

      document: '1002345678',

      date: '24/06/2026',

      time: '05:30 PM',

      status: 'Permitido',

      method: 'QR',

      door: 'Principal',

      observation: 'Salida registrada'

    },

    {

      id: 5,

      name: 'Pedro Martínez',

      document: '1045678912',

      date: '24/06/2026',

      time: '06:18 PM',

      status: 'Denegado',

      method: 'Facial',

      door: 'Bloque B',

      observation: 'Usuario no autorizado'

    }

  ];

  // =========================
  // EXPORTAR HISTORIAL
  // =========================

  exportHistory() {

    Swal.fire({

      icon: 'success',

      title: 'Exportación iniciada',

      text: 'El historial será exportado cuando el backend esté conectado.',

      confirmButtonColor: '#2563EB'

    });

  }

  // =========================
  // FILTRAR HISTORIAL
  // =========================

  filterHistory() {

    Swal.fire({

      icon: 'info',

      title: 'Filtros',

      text: 'Los filtros estarán disponibles al conectar la base de datos.',

      confirmButtonColor: '#2563EB'

    });

  }

}