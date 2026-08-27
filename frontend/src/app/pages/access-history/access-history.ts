import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { DashboardService } from '../../core/services/dashboard.service';

@Component({
  selector: 'app-access-history',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <main class="page-shell">
      <header class="page-header">
        <div>
          <span class="eyebrow">SegurEntry · Seguridad</span>
          <h1>Historial de accesos</h1>
          <p>Consulta, filtra y revisa los movimientos registrados por el sistema.</p>
        </div>
        <button class="secondary" (click)="back()">Volver al panel</button>
      </header>

      <section class="stats-grid">
        <article class="stat"><strong>{{ filtered.length }}</strong><span>Registros visibles</span></article>
        <article class="stat"><strong>{{ allowedCount }}</strong><span>Permitidos</span></article>
        <article class="stat"><strong>{{ deniedCount }}</strong><span>Denegados</span></article>
        <article class="stat"><strong>{{ todayCount }}</strong><span>Movimientos hoy</span></article>
      </section>

      <section class="panel filters">
        <input [(ngModel)]="search" (ngModelChange)="applyFilters()" placeholder="Buscar usuario, correo, documento, rol o dispositivo">
        <select [(ngModel)]="status" (ngModelChange)="applyFilters()">
          <option value="all">Todos los resultados</option>
          <option value="allowed">Permitidos</option>
          <option value="denied">Denegados</option>
        </select>
        <select [(ngModel)]="type" (ngModelChange)="applyFilters()">
          <option value="all">Entrada y salida</option>
          <option value="entrada">Entradas</option>
          <option value="salida">Salidas</option>
        </select>
        <button class="secondary" (click)="clearFilters()">Limpiar</button>
      </section>

      <section class="panel">
        <div class="loading" *ngIf="loading">Cargando registros...</div>
        <div class="error" *ngIf="error">{{ error }}</div>
        <div class="table-wrap" *ngIf="!loading">
          <table>
            <thead><tr><th>Usuario</th><th>Fecha</th><th>Tipo</th><th>Método</th><th>Dispositivo</th><th>Resultado</th><th></th></tr></thead>
            <tbody>
              <tr *ngFor="let access of filtered">
                <td><strong>{{ access.user || access.name || 'Usuario' }}</strong><small>{{ access.email || access.document || 'Sin identificación' }}</small></td>
                <td>{{ formatDate(access.date || access.created_at || access.createdAt) }}</td>
                <td><span class="badge neutral">{{ access.type || 'movimiento' }}</span></td>
                <td>{{ access.method || 'No reportado' }}</td>
                <td>{{ access.device || 'No reportado' }}</td>
                <td><span class="badge" [class.ok]="isAllowed(access)" [class.bad]="!isAllowed(access)">{{ isAllowed(access) ? 'Permitido' : 'Denegado' }}</span></td>
                <td><button class="link" (click)="openDetail(access)">Ver detalle</button></td>
              </tr>
              <tr *ngIf="filtered.length === 0"><td colspan="7" class="empty">No hay registros que coincidan con los filtros.</td></tr>
            </tbody>
          </table>
        </div>
      </section>
    </main>
  `,
  styles: [`
    :host{display:block;min-height:100vh;background:#f4f7f5;color:#17211b;font-family:Inter,system-ui,sans-serif}.page-shell{max-width:1500px;margin:auto;padding:32px}.page-header{display:flex;justify-content:space-between;gap:24px;align-items:flex-start;margin-bottom:24px}.eyebrow{color:#00843d;font-weight:800;font-size:.78rem;text-transform:uppercase;letter-spacing:.12em}h1{font-size:clamp(2rem,4vw,3rem);margin:.35rem 0}.page-header p{margin:0;color:#607066}.stats-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:20px}.stat,.panel{background:#fff;border:1px solid #dce5df;border-radius:18px;box-shadow:0 10px 30px rgba(20,55,35,.06)}.stat{padding:22px}.stat strong{display:block;font-size:2rem}.stat span{color:#66736b}.panel{padding:18px;margin-bottom:18px}.filters{display:grid;grid-template-columns:2fr 1fr 1fr auto;gap:12px}.filters input,.filters select{width:100%;border:1px solid #cfdad3;border-radius:12px;padding:12px;background:#fff}.secondary,.link{border:0;border-radius:12px;padding:11px 15px;font-weight:700;cursor:pointer}.secondary{background:#e9f3ed;color:#006b32}.link{background:#00843d;color:white}.table-wrap{overflow:auto}table{width:100%;border-collapse:collapse;min-width:950px}th,td{text-align:left;padding:14px;border-bottom:1px solid #edf1ee}th{font-size:.8rem;text-transform:uppercase;color:#607066}td small{display:block;color:#79847d;margin-top:4px}.badge{display:inline-flex;border-radius:999px;padding:6px 10px;font-size:.78rem;font-weight:800}.ok{background:#e4f6e9;color:#087332}.bad{background:#fde8e8;color:#a82525}.neutral{background:#eef2ef;color:#47544c}.empty,.loading,.error{text-align:center;padding:28px;color:#66736b}.error{color:#a82525}@media(max-width:900px){.stats-grid{grid-template-columns:repeat(2,1fr)}.filters{grid-template-columns:1fr}.page-header{flex-direction:column}}@media(max-width:520px){.page-shell{padding:18px}.stats-grid{grid-template-columns:1fr}}
  `]
})
export class AccessHistory implements OnInit {
  accesses: any[] = [];
  filtered: any[] = [];
  search = '';
  status = 'all';
  type = 'all';
  loading = true;
  error = '';

  constructor(private dashboardService: DashboardService, private router: Router) {}

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading = true;
    this.dashboardService.getAccesses().subscribe({
      next: (res: any) => {
        this.accesses = Array.isArray(res) ? res : (res?.accesses || res?.results || []);
        this.applyFilters();
        this.loading = false;
      },
      error: () => { this.error = 'No fue posible cargar los accesos. Verifica que el backend esté disponible.'; this.loading = false; }
    });
  }

  applyFilters(): void {
    const term = this.search.trim().toLowerCase();
    this.filtered = this.accesses.filter(a => {
      const haystack = [a.user,a.name,a.email,a.document,a.role,a.device,a.method].filter(Boolean).join(' ').toLowerCase();
      const matchesText = !term || haystack.includes(term);
      const matchesStatus = this.status === 'all' || (this.status === 'allowed' ? this.isAllowed(a) : !this.isAllowed(a));
      const matchesType = this.type === 'all' || String(a.type || '').toLowerCase() === this.type;
      return matchesText && matchesStatus && matchesType;
    });
  }

  clearFilters(): void { this.search=''; this.status='all'; this.type='all'; this.applyFilters(); }
  isAllowed(a:any): boolean { return a.allowed === true || String(a.status || a.result || '').toLowerCase().includes('permit'); }
  formatDate(value:any): string { if(!value) return 'Sin fecha'; const d=new Date(value); return isNaN(d.getTime()) ? String(value) : d.toLocaleString('es-CO'); }
  openDetail(access:any): void { const id=access.id || access.uid || access.access_id; if(id) this.router.navigate(['/accesos', id]); }
  back(): void { this.router.navigate(['/dashboard/administrador']); }

  get allowedCount(): number { return this.filtered.filter(a=>this.isAllowed(a)).length; }
  get deniedCount(): number { return this.filtered.length-this.allowedCount; }
  get todayCount(): number { const today=new Date().toDateString(); return this.filtered.filter(a=>{const d=new Date(a.date||a.created_at||a.createdAt); return !isNaN(d.getTime())&&d.toDateString()===today;}).length; }
}
