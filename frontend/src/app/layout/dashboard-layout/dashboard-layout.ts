import { Component } from '@angular/core';

import { RouterOutlet } from '@angular/router';

import { SidebarComponent } from '../sidebar/sidebar';
import { HeaderComponent } from '../header/header';
import { FooterComponent } from '../footer/footer';

@Component({

    selector:'app-dashboard-layout',

    standalone:true,

    imports:[

        RouterOutlet,

        SidebarComponent,

        HeaderComponent,

        FooterComponent

    ],

    templateUrl:'./dashboard-layout.html',

    styleUrls:['./dashboard-layout.css']

})

export class DashboardLayoutComponent{

}