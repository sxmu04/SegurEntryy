import { Component } from '@angular/core';

import { CommonModule } from '@angular/common';

@Component({

    selector:'app-header',

    standalone:true,

    imports:[CommonModule],

    templateUrl:'./header.html',

    styleUrls:['./header.css']

})

export class HeaderComponent{

    pageTitle='Panel de Control';

    toggleSidebar(){

        // Más adelante se conectará con el Sidebar
        console.log('Toggle Sidebar');

    }

}