import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AnaliticaApiService } from '../../../../core/services/analitica-api.service';
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
  templateUrl: './ai-reports.component.html',
  styleUrls: ['./ai-reports.component.scss'],
})
export class AiReportsComponent implements OnInit {
  private api = inject(AnaliticaApiService);
  private voice = inject(VoiceReportService);
  planFeature = inject(PlanFeatureService);

  prompt = '';
  ejemplos = [
    'ventas de septiembre por sucursal',
    'inventario con bajo stock',
    'clientes que más compran',
  ];

  cargando = signal(false);
  cargandoHistorial = signal(false);
  errorHistorial = signal('');
  resultado = signal<SolicitudReporteIA | null>(null);
  historial = signal<SolicitudReporteIA[]>([]);
  plantillas = signal<PlantillaReporte[]>([]);

  permite(): boolean {
    return this.planFeature.puedeReportesIA();
  }

  // ===== Estados visibles del dictado por voz (UX) =====
  grabando = computed(() => this.voice.isRecording());
  procesando = computed(() => this.voice.isProcessing());
  soportado = computed(() => this.voice.isSupported());
  /** Texto parcial que el navegador reconoce mientras el usuario habla. */
  textoParcial = signal('');

  ngOnInit(): void {
    if (!this.permite()) return;
    this.cargarPlantillas();
    this.cargarHistorial();
  }

  dictar(): void {
    // Clic mientras ya está escuchando = detener y usar lo dicho hasta ahora.
    if (this.voice.isRecording()) {
      this.voice.stopVoice();
      return;
    }
    if (this.cargando() || this.procesando()) return;

    if (!this.voice.isSupported()) {
      this.resultado.set({
        prompt_original: this.prompt,
        estado: 'ERROR',
        error_detalle:
          'Este navegador no soporta dictado por voz nativo. '
          + 'Usa Chrome, Edge o Safari, o escribe el comando en el cuadro de texto.',
      } as SolicitudReporteIA);
      return;
    }

    this.textoParcial.set('');
    this.voice.solicitarPorVoz(
      (texto) => {
        this.prompt = texto;
        this.textoParcial.set('');
        this.generar();
      },
      (_codigo, mensaje) => {
        this.textoParcial.set('');
        this.resultado.set({
          prompt_original: this.prompt,
          estado: 'ERROR',
          error_detalle: mensaje,
        } as SolicitudReporteIA);
      },
      'es-BO',
      (parcial) => this.textoParcial.set(parcial),
    );
  }

  generar(): void {
    if (!this.permite() || !this.prompt.trim() || this.cargando()) return;

    this.cargando.set(true);
    this.api.solicitar({ prompt: this.prompt, origen: 'TEXTO' }).subscribe({
      next: (reporte) => {
        this.resultado.set({
          ...reporte,
          prompt_original: reporte.prompt_original || this.prompt,
        });
        this.cargando.set(false);
        this.cargarHistorial();
      },
      error: () => {
        this.cargando.set(false);
        this.resultado.set({
          prompt_original: this.prompt,
          estado: 'ERROR',
          error_detalle: 'No se pudo generar el reporte. Intenta nuevamente.',
        } as SolicitudReporteIA);
      },
    });
  }

  private cargarHistorial(): void {
    this.cargandoHistorial.set(true);
    this.errorHistorial.set('');
    this.api.historial().subscribe({
      next: (reportes) => {
        this.historial.set(Array.isArray(reportes) ? reportes : []);
        this.cargandoHistorial.set(false);
      },
      error: () => {
        this.historial.set([]);
        this.errorHistorial.set('No se pudo cargar el historial de reportes.');
        this.cargandoHistorial.set(false);
      },
    });
  }

  private cargarPlantillas(): void {
    this.api.plantillas().subscribe({
      next: (plantillas) => this.plantillas.set(Array.isArray(plantillas) ? plantillas : []),
      error: () => this.plantillas.set([]),
    });
  }
}
