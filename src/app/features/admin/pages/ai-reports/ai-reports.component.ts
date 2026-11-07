import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AnaliticaApiService } from '../../../../core/services/analitica-api.service';
import { ReportsService } from '../../../../core/services/reports.service';
import { VoiceReportService } from '../../../../core/services/voice-report.service';
import { PlanFeatureService } from '../../../../core/services/plan-feature.service';
import { PlanFeatureLockComponent } from '../../../../shared/components/plan-feature-lock/plan-feature-lock.component';
import { StatusBadgePipe } from '../../../../shared/pipes/status-badge.pipe';
import { SolicitudReporteIA, PlantillaReporte } from '../../../../core/models/analitica.model';

/**
 * [EXAMEN-2] CU10/CU11: reportes IA por texto/voz con historial y plantillas.
 */
@Component({
  selector: 'app-ai-reports',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, PlanFeatureLockComponent, StatusBadgePipe],
  template: `
    <section>
      <header><span class="eyebrow">CU10 · Reportes IA</span><h1>Reportes con lenguaje natural</h1><p>Pide ventas por sucursal, compara periodos o consulta inventarios en palabras.</p></header>
      <app-plan-feature-lock funcionalidad="reportes_ia" titulo="Reportes IA no incluidos en tu plan">
        <div class="card">
          <label for="prompt">Tu solicitud</label>
          <textarea id="prompt" [(ngModel)]="prompt" rows="3" placeholder="Ejemplo: ventas de septiembre por sucursal"></textarea>
          <div class="acciones">
            <button type="button" class="btn btn-outline btn-sm" (click)="dictar()"><i class="ri-mic-line"></i> Micrófono</button>
            <button type="button" class="btn btn-accent btn-sm" [disabled]="cargando() || !prompt.trim()" (click)="generar()">{{ cargando() ? 'Generando…' : 'Generar reporte' }}</button>
          </div>
          <div class="ejemplos"><span>Ejemplos:</span> @for (e of ejemplos; track e) { <button type="button" class="chip" (click)="prompt = e">{{ e }}</button> }</div>
          <div class="plantillas"><span>Plantillas:</span> @for (p of plantillas(); track p.nombre) { <button type="button" class="chip" (click)="prompt = p.ejemplo_prompt || p.nombre">{{ p.nombre }}</button> }</div>
          @if (resultado(); as r) {
            <div class="resultado">
              <h2>Resultado</h2>
              <span class="badge" [ngClass]="(r.estado | statusBadge).class">{{ (r.estado | statusBadge).label }}</span>
              <span>Generado en {{ r.tiempo_ms ?? 0 }} ms</span>
              @if (r.preguntas_aclaracion?.length) { <div class="aviso"><strong>¿Puedes aclarar?</strong> @for (p of r.preguntas_aclaracion; track p) { <p>{{ p }}</p> } </div> }
              @if (r.error_detalle) { <p class="error">{{ r.error_detalle }}</p> }
              <a class="btn btn-outline btn-sm" [routerLink]="['/admin/reportes-ia', r.id]">Ver detalle y exportar</a>
            </div>
          }
        </div>
        <div class="card">
          <h2>Historial</h2>
          @for (h of historial(); track h.id) { <div class="fila"><a [routerLink]="['/admin/reportes-ia', h.id]">“{{ h.prompt_original }}”</a><span>{{ h.estado }}</span><span>{{ h.fecha_ejecucion }}</span></div> } @empty { <p>Sin solicitudes.</p> }
        </div>
      </app-plan-feature-lock>
    </section>
  `,
  styles: [`textarea{width:100%} .card{background:#fff;border:1px solid var(--border-color);border-radius:12px;padding:1rem;margin:.8rem 0} .chip{border:1px solid var(--border-color);border-radius:9999px;padding:.15rem .5rem;background:#f8fafc} .acciones{display:flex;gap:.5rem;margin-top:.5rem} .fila{display:flex;gap:.8rem;border-top:1px solid #eee;padding:.4rem 0} .aviso{background:#fffbeb;border:1px solid #fcd34d;padding:.5rem} .error{color:#991b1b}`]
})
export class AiReportsComponent implements OnInit {
  private api = inject(AnaliticaApiService);
  private reports = inject(ReportsService);
  private voice = inject(VoiceReportService);
  planFeature = inject(PlanFeatureService);
  prompt = '';
  ejemplos = ['ventas de septiembre por sucursal', 'inventario con bajo stock', 'clientes que más compran'];
  cargando = signal(false);
  resultado = signal<SolicitudReporteIA | null>(null);
  historial = signal<SolicitudReporteIA[]>([]);
  plantillas = signal<PlantillaReporte[]>([]);
  permite(): boolean { return this.planFeature.puedeReportesIA(); }
  ngOnInit(): void { if (!this.permite()) return; this.api.plantillas().subscribe({ next: (x) => this.plantillas.set(x), error: () => undefined }); this.api.historial().subscribe({ next: (x) => this.historial.set(x), error: () => undefined }); }
  dictar(): void { this.voice.solicitarPorVoz((t) => { this.prompt = t; this.generar(); }, (_c, m) => { this.resultado.set({ prompt_original: this.prompt, estado: 'ERROR', error_detalle: m } as SolicitudReporteIA); }); }
  generar(): void { if (!this.permite() || !this.prompt.trim()) return; this.cargando.set(true); this.reports.solicitarPorTexto(this.prompt).subscribe({ next: (r) => { this.resultado.set(r); this.cargando.set(false); }, error: () => { this.cargando.set(false); this.resultado.set({ prompt_original: this.prompt, estado: 'ERROR', error_detalle: 'No se pudo generar el reporte.' } as SolicitudReporteIA); } }); }
}
