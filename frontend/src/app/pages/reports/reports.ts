import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { DashboardService } from '../../core/services/dashboard.service';

@Component({selector:'app-reports',standalone:true,imports:[CommonModule,FormsModule],template:`
<main class="shell">
<header><div><span>SegurEntry · Analítica</span><h1>Reportes</h1><p>Resumen operativo basado en la información disponible en el backend.</p></div><div class="header-actions"><button class="secondary" (click)="printReport()">Imprimir / Guardar PDF</button><button (click)="router.navigate(['/operaciones'])">Centro operativo</button></div></header>
<section class="segurentry-report-brand"><img src="/logo-segurentry.png" alt="Logo SegurEntry"><div><strong>SegurEntry</strong><span>Reporte operativo institucional</span></div></section>
<section class="grid"><article><b>{{ total }}</b><small>Registros de reporte</small></article><article><b>{{ accesses.length }}</b><small>Accesos consultados</small></article><article><b>{{ allowed }}</b><small>Accesos permitidos</small></article><article><b>{{ denied }}</b><small>Accesos denegados</small></article></section>
<section class="panel controls"><input [(ngModel)]="query" placeholder="Buscar en reportes"><button (click)="reload()">Actualizar</button></section>
<section class="panel"><div class="state" *ngIf="loading">Cargando reportes...</div><div class="state error" *ngIf="error">{{error}}</div><div class="cards" *ngIf="!loading"><article class="report" *ngFor="let item of filtered"><div><strong>{{ item.title || item.name || item.type || 'Reporte' }}</strong><p>{{ item.description || item.summary || 'Registro generado por el sistema' }}</p></div><time>{{ format(item.created_at || item.date || item.createdAt) }}</time></article><div class="state" *ngIf="filtered.length===0">No hay reportes disponibles con este filtro.</div></div></section>
</main>`,styles:[`:host{display:block;min-height:100vh;background:#f4f7f5;color:#17211b;font-family:Inter,system-ui}.shell{max-width:1450px;margin:auto;padding:clamp(18px,3vw,38px)}header{display:flex;justify-content:space-between;gap:20px;align-items:flex-start;margin-bottom:22px}header span{color:#08783a;font-weight:800;font-size:.78rem;text-transform:uppercase;letter-spacing:.1em}h1{font-size:clamp(2rem,4vw,3.2rem);margin:.35rem 0}p{color:#68756d}button{border:0;border-radius:12px;padding:12px 16px;background:#08783a;color:#fff;font-weight:800;cursor:pointer}.header-actions{display:flex;gap:10px;flex-wrap:wrap}.secondary{background:#fff;color:#08783a;border:1px solid #b9d8c5}.segurentry-report-brand{display:flex;align-items:center;gap:14px;padding:16px 18px;margin-bottom:18px;background:#fff;border:1px solid #dce5df;border-radius:18px}.segurentry-report-brand img{width:58px;height:58px;object-fit:contain}.segurentry-report-brand div{display:grid;gap:3px}.segurentry-report-brand strong{font-size:1.05rem}.segurentry-report-brand span{font-size:.8rem;color:#66736b}.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:18px}.grid article,.panel,.report{background:#fff;border:1px solid #dce5df;border-radius:18px}.grid article{padding:22px}.grid b{display:block;font-size:2rem}.grid small{color:#6c786f}.panel{padding:18px;margin-bottom:18px}.controls{display:flex;gap:10px}.controls input{flex:1;min-width:0;border:1px solid #d0dad4;border-radius:12px;padding:12px}.report{padding:18px;display:flex;justify-content:space-between;gap:18px;margin-bottom:10px}.report p{margin:.4rem 0 0}.report time{color:#66736b;white-space:nowrap}.state{text-align:center;padding:30px;color:#66736b}.error{color:#a82525}@media(max-width:850px){.grid{grid-template-columns:repeat(2,1fr)}header,.report{flex-direction:column}.report time{white-space:normal}}@media(max-width:480px){.grid{grid-template-columns:1fr}.controls,.header-actions{flex-direction:column;width:100%}.header-actions button{width:100%}}@media print{:host{background:#fff}.shell{max-width:none;padding:0}header{margin-bottom:16px}.header-actions,.controls{display:none!important}.panel,.grid article,.report,.segurentry-report-brand{box-shadow:none;break-inside:avoid}.segurentry-report-brand{border-width:0 0 2px;border-radius:0;padding-left:0;padding-right:0}}`]})
export class Reports implements OnInit{
  reports:any[]=[];
  accesses:any[]=[];
  loading=true;
  error='';
  query='';

  constructor(public router:Router,private dashboard:DashboardService){}

  ngOnInit(){this.reload()}

  reload(){
    this.loading=true;
    this.error='';
    this.dashboard.getReports().subscribe({next:(r:any)=>{this.reports=Array.isArray(r)?r:(r?.reports||r?.results||[]);this.loading=false},error:()=>{this.error='El endpoint de reportes no respondió. La vista está lista y se conectará automáticamente cuando esté disponible.';this.loading=false}});
    this.dashboard.getAccesses().subscribe({next:(r:any)=>this.accesses=Array.isArray(r)?r:(r?.accesses||r?.results||[]),error:()=>this.accesses=[]})
  }

  get filtered(){const q=this.query.trim().toLowerCase();return !q?this.reports:this.reports.filter(x=>JSON.stringify(x).toLowerCase().includes(q))}
  get total(){return this.reports.length}
  isAllowed(a:any){return a?.allowed===true||String(a?.status||a?.result||'').toLowerCase().includes('permit')}
  get allowed(){return this.accesses.filter(a=>this.isAllowed(a)).length}
  get denied(){return this.accesses.length-this.allowed}

  format(v:any){
    if(!v)return 'Sin fecha';
    const d=new Date(v);
    if(isNaN(d.getTime()))return String(v);
    const date=d.toLocaleDateString('es-CO',{day:'2-digit',month:'2-digit',year:'numeric'});
    const time=d.toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit',hour12:true});
    return `${date}, ${time}`;
  }

  printReport(){window.print()}
}