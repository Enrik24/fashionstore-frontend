import { TestBed } from '@angular/core/testing';
import { VoiceReportService, VoiceDictadoHandlers } from './voice-report.service';

/** Doble de la Web Speech API para pruebas. */
class FakeSpeechRecognition {
  static instances: FakeSpeechRecognition[] = [];

  lang = '';
  interimResults = false;
  continuous = false;
  maxAlternatives = 1;
  onresult: any = null;
  onerror: any = null;
  onend: any = null;
  started = false;
  aborted = false;

  constructor() {
    FakeSpeechRecognition.instances.push(this);
  }

  start(): void { this.started = true; }
  stop(): void { this.aborted = true; }
  abort(): void { this.aborted = true; }

  emitResult(transcript: string, isFinal: boolean): void {
    const results: any = [{ isFinal, 0: { transcript } }];
    results.length = 1;
    this.onresult?.({ results });
  }

  emitError(error: string): void { this.onerror?.({ error }); }
  emitEnd(): void { this.onend?.(); }
}

describe('VoiceReportService', () => {
  let service: VoiceReportService;
  let originalSR: any;
  let originalWebkit: any;

  const handlers = (spies: {
    onFinal?: jasmine.Spy;
    onInterim?: jasmine.Spy;
    onError?: jasmine.Spy;
  }): VoiceDictadoHandlers => ({
    onFinal: spies.onFinal ?? jasmine.createSpy('onFinal'),
    onInterim: spies.onInterim ?? jasmine.createSpy('onInterim'),
    onError: spies.onError ?? jasmine.createSpy('onError')
  });

  beforeEach(() => {
    originalSR = (window as any).SpeechRecognition;
    originalWebkit = (window as any).webkitSpeechRecognition;
    FakeSpeechRecognition.instances = [];
    (window as any).SpeechRecognition = FakeSpeechRecognition;
    delete (window as any).webkitSpeechRecognition;

    TestBed.configureTestingModule({ providers: [VoiceReportService] });
    service = TestBed.inject(VoiceReportService);
  });

  afterEach(() => {
    service.stop({ silent: true });
    (window as any).SpeechRecognition = originalSR;
    (window as any).webkitSpeechRecognition = originalWebkit;
  });

  it('se crea y detecta soporte de dictado', () => {
    expect(service).toBeTruthy();
    expect(service.isSupported()).toBeTrue();
  });

  it('informa error "unsupported" cuando el navegador no soporta dictado', () => {
    delete (window as any).SpeechRecognition;
    delete (window as any).webkitSpeechRecognition;
    const sinSoporte = new VoiceReportService();
    expect(sinSoporte.isSupported()).toBeFalse();

    const onError = jasmine.createSpy('onError');
    sinSoporte.start('es-ES', handlers({ onError }));
    expect(onError).toHaveBeenCalledWith('unsupported', jasmine.any(String));
  });

  it('entrega el texto final y deja de grabar', () => {
    const onFinal = jasmine.createSpy('onFinal');
    service.start('es-ES', handlers({ onFinal }), 1000);

    const rec = FakeSpeechRecognition.instances[0];
    expect(rec.lang).toBe('es-ES');
    expect(service.isRecording()).toBeTrue();

    rec.emitResult('Genera un reporte de inventarios', true);
    expect(onFinal).toHaveBeenCalledWith('Genera un reporte de inventarios');
    expect(service.isRecording()).toBeFalse();
  });

  it('usa el último texto parcial si el motor cierra sin resultado final', () => {
    const onFinal = jasmine.createSpy('onFinal');
    const onError = jasmine.createSpy('onError');
    service.start('es-ES', handlers({ onFinal, onError }), 1000);

    const rec = FakeSpeechRecognition.instances[0];
    rec.emitResult('reporte de inventarios', false);
    expect(service.interimText()).toBe('reporte de inventarios');

    rec.emitEnd();
    expect(onFinal).toHaveBeenCalledWith('reporte de inventarios');
    expect(onError).not.toHaveBeenCalled();
  });

  it('entrega lo escuchado al pulsar Detener sin emitir error', () => {
    const onFinal = jasmine.createSpy('onFinal');
    const onError = jasmine.createSpy('onError');
    service.start('es-ES', handlers({ onFinal, onError }), 1000);

    FakeSpeechRecognition.instances[0].emitResult('ventas del mes en excel', false);
    service.stop();

    expect(onFinal).toHaveBeenCalledWith('ventas del mes en excel');
    expect(onError).not.toHaveBeenCalled();
    expect(service.isRecording()).toBeFalse();
  });

  it('detiene la grabación limpiamente si se pulsa Detener sin haber escuchado voz', () => {
    const onFinal = jasmine.createSpy('onFinal');
    const onError = jasmine.createSpy('onError');
    service.start('es-ES', handlers({ onFinal, onError }), 1000);

    service.stop();

    expect(onFinal).not.toHaveBeenCalled();
    expect(onError).not.toHaveBeenCalled();
    expect(service.isRecording()).toBeFalse();
  });

  it('no emite error espurio cuando no hubo voz y no hubo texto', () => {
    const onFinal = jasmine.createSpy('onFinal');
    const onError = jasmine.createSpy('onError');
    service.start('es-ES', handlers({ onFinal, onError }), 1000);

    FakeSpeechRecognition.instances[0].emitError('aborted');
    expect(onError).not.toHaveBeenCalled();
    expect(service.isRecording()).toBeTrue();
  });

  it('notifica cuando el micrófono está denegado', () => {
    const onError = jasmine.createSpy('onError');
    service.start('es-ES', handlers({ onError }), 1000);

    FakeSpeechRecognition.instances[0].emitError('not-allowed');
    expect(onError).toHaveBeenCalledWith('not-allowed', jasmine.any(String));
    expect(service.isRecording()).toBeFalse();
  });

  it('reintenta con otro idioma cuando el motor no soporta el solicitado', () => {
    const onError = jasmine.createSpy('onError');
    service.start('es-ES', handlers({ onError }), 1000);

    FakeSpeechRecognition.instances[0].emitError('language-not-supported');
    expect(FakeSpeechRecognition.instances.length).toBe(2);
    expect(FakeSpeechRecognition.instances[1].lang).toBe('es-419');
    expect(onError).not.toHaveBeenCalled();
  });

  it('reutiliza el idioma que ya funcionó en un dictado anterior', () => {
    service.start('es-ES', handlers({}), 1000);
    FakeSpeechRecognition.instances[0].emitResult('reporte de ventas', true);

    service.start('es-ES', handlers({}), 1000);
    expect(FakeSpeechRecognition.instances[1].lang).toBe('es-ES');
  });
});