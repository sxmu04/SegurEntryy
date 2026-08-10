import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-stat-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './stat-card.html',
  styleUrls: ['./stat-card.css']
})
export class StatCardComponent {

  @Input() title: string = '';

  @Input() value: number | string = 0;

  @Input() subtitle: string = '';

  @Input() icon: string = 'fa-chart-bar';

  @Input() color: string = '#2563EB';

  @Input() trendPositive: boolean = true;
  
  @Input() trend: string = '';


}