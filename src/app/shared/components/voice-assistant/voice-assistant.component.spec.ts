import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { VoiceAssistantComponent } from './voice-assistant.component';
import { VoiceReportService, VoiceDictadoHandlers } from '../../../core/services/voice-report.service';
import { ToastService } from '../../../core/services/toast.service';
import { environment } from '../../../../environments/environment';

describe('VoiceAssistantComponent', () => {
  let fixture: ComponentFixture<VoiceAssistantComponent>;
  let component: any;
  let httpMock: HttpTestingController;
  let voiceMock: any;
  let dictado: VoiceDictadoHandlers | null = null;

  beforeEach(async () => {
    dictado = null;
    voiceMock = {
      isRecording: signal(false),
      isProcessing: signal(false),
      interimText: signal(''),
      isSupported: signal(true),
      workingLang: signal<string | null>(null),
      start: jasmine.createSpy('start').and.callFake((_lang: string, handlers: VoiceDictadoHandlers) => { dictado = handlers; }),
      stop: jasmine.createSpy('stop'),
      describeError: (code: string) => code
    };

    await TestBed.configureTestingModule({
      imports: [VoiceAssistantComponent, HttpClientTestingModule],
      providers: [
        { provide: VoiceReportService, useValue: voiceMock },
        {
          provide: ToastService,
          useValue: { show: () => {}, success: () => {}, error: () => {}, warning: () => {}, info: () => {} }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(VoiceAssistantComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  });

  afterEach(() => httpMock.verify());

  it('se crea y muestra el comando de ejemplo del reporte de inventarios', () => {
    expect(component).toBeTruthy();
    expect(component.ejemplos).toContain('Genera un reporte de inventarios');
  });

  it('el botón de micrófono inicia el dictado en español', () => {
    component.toggleMic();
    expect(voiceMock.start).toHaveBeenCalledWith('es-ES', jasmine.any(Object));
    expect(dictado).not.toBeNull();
  });

  it('envía el texto dictado al endpoint de reporte por voz y muestra la interpretación', () => {
    component.toggleMic();
    dictado!.onFinal!('Genera un reporte de inventarios');

    const req = httpMock.expectOne(`${environment.apiUrl}/inteligencia/reporte-voz`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ transcripcion: 'Genera un reporte de inventarios' });

    req.flush({
      comando_original: 'Genera un reporte de inventarios',
      tipo_reporte: 'INVENTARIO',
      interpretacion: 'Se generó un reporte de inventario con los productos y su stock actual.',
      datos: { total_items_registrados: 10 },
      reporte_guardado_id: 7,
      formato_sugerido: 'JSON'
    });

    expect(component.loading()).toBeFalse();
    expect(component.resultado().tipo_reporte).toBe('INVENTARIO');
    expect(component.rangoTexto()).toBe('Todas las fechas');
  });

  it('muestra un mensaje cuando el backend falla', () => {
    component.prompt.set('Genera un reporte de inventarios');
    component.ejecutar();

    httpMock.expectOne(`${environment.apiUrl}/inteligencia/reporte-voz`)
      .flush({ detail: 'error interno' }, { status: 500, statusText: 'Server Error' });

    expect(component.error()).toContain('No se pudo generar el reporte');
    expect(component.loading()).toBeFalse();
  });

  it('avisa cuando el navegador no soporta dictado sin llamar al servicio de voz', () => {
    voiceMock.isSupported.set(false);
    component.toggleMic();

    expect(voiceMock.start).not.toHaveBeenCalled();
    expect(component.error()).toContain('no soporta dictado');
  });

  it('habilita la exportación con el tipo y filtros correctos al tener resultado', () => {
    component.prompt.set('Genera un reporte de inventarios');
    component.ejecutar();

    httpMock.expectOne(`${environment.apiUrl}/inteligencia/reporte-voz`)
      .flush({
        tipo_reporte: 'INVENTARIO',
        interpretacion: 'ok',
        datos: {},
        reporte_guardado_id: 7,
        fecha_inicio: '2026-09-01',
        fecha_fin: '2026-09-18'
      });

    expect(component.exportTipo()).toBe('inventario');
    expect(component.exportFiltros()).toEqual({ fechaInicio: '2026-09-01', fechaFin: '2026-09-18', sucursalId: undefined });
    expect(component.resultado().reporte_guardado_id).toBe(7);
  });

  it('un comando de ejemplo ejecuta la generación del reporte', () => {
    component.usarEjemplo('Reporte financiero del mes');

    const req = httpMock.expectOne(`${environment.apiUrl}/inteligencia/reporte-voz`);
    expect(req.request.body).toEqual({ transcripcion: 'Reporte financiero del mes' });
    req.flush({ tipo_reporte: 'FINANCIERO', interpretacion: 'ok', datos: {}, reporte_guardado_id: 8 });
    expect(component.resultado().tipo_reporte).toBe('FINANCIERO');
  });
});