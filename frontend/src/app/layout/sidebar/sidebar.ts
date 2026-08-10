import { Component } from '@angular/core';

import { CommonModule } from '@angular/common';

import { RouterModule, Router } from '@angular/router';

import Swal from 'sweetalert2';

@Component({

    selector:'app-sidebar',

    standalone:true,

    imports:[

        CommonModule,

        RouterModule

    ],

    templateUrl:'./sidebar.html',

    styleUrls:['./sidebar.css']

})

export class SidebarComponent{

    menuOpen=true;

    role='SUPER_ADMIN';

    menuItems:any[]=[];

    constructor(private router:Router){}

    ngOnInit(){

        this.loadMenu();

    }

    loadMenu(){

        switch(this.role){

            case 'SUPER_ADMIN':

                this.menuItems=[

                    {
                        label:'Dashboard',
                        icon:'fas fa-home',
                        route:'/dashboard/super-admin'
                    },

                    {
                        label:'Usuarios',
                        icon:'fas fa-users',
                        route:'/users'
                    },

                    {
                        label:'Roles',
                        icon:'fas fa-user-tag',
                        route:'/roles'
                    },

                    {
                        label:'Accesos',
                        icon:'fas fa-door-open',
                        route:'/access'
                    },

                    {
                        label:'Invitaciones',
                        icon:'fas fa-envelope',
                        route:'/invitations'
                    },

                    {
                        label:'Reportes',
                        icon:'fas fa-chart-bar',
                        route:'/reports'
                    },

                    {
                        label:'Perfil',
                        icon:'fas fa-user-circle',
                        route:'/profile'
                    },

                    {
                        label:'Configuración',
                        icon:'fas fa-cog',
                        route:'/settings'
                    }

                ];

            break;

        }

    }

    logout(){

        Swal.fire({

            title:'Cerrar sesión',

            text:'¿Desea salir del sistema?',

            icon:'question',

            showCancelButton:true,

            confirmButtonText:'Salir',

            cancelButtonText:'Cancelar'

        }).then(result=>{

            if(result.isConfirmed){

                this.router.navigate(['/login']);

            }

        });

    }

}