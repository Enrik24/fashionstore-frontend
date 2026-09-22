
import { Injectable, signal } from '@angular/core';

export type VoiceErrorCode = 'unsupported' | 'not-allowed' | 'no-speech' | 'network' | 'language' | 'busy' | 'unknown';

const LANG_FALLBACKS = ['es-ES', 'es-419', 'es-MX', 'es-US'];
/** Máximo de tiempo escuchando antes de cerrar el dictado automáticamente. */
const DEFAULT_TIMEOUT_MS = 15000;

/** Callbacks del dictado por voz. */
export interface VoiceDictadoHandlers {
  /** Texto definitivo del comando (final o, si el motor no lo entrega, el último parcial). */
  onFinal: (text: string) => void;
  /** Texto parcial mientras el usuario habla (feedback en vivo). */
  onInterim?: (text: string) => void;
  onError?: (code: VoiceErrorCode, message: string) => void;
  /** Se llamó a start() pero ya había una grabación en curso; se ignoró el segundo inicio. */
  onBusy?: () => void;
}

@Injectable({ providedIn: 'root' })
export class VoiceReportService {
  readonly isRecording = signal(false);
  readonly isProcessing = signal(false);
  readonly interimText = signal('');
  readonly isSupported = signal(false);
  /** Idioma que funcionó la última vez (se reutiliza para no reintentar en vano). */
  readonly workingLang = signal<string | null>(null);

  private rec: any = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private stopGraceTimer: ReturnType<typeof setTimeout> | null = null;
  private handler: VoiceDictadoHandlers | null = null;
  private lastInterim = '';
  private finalDelivered = false;
  private errorEmitted = false;
  private manualStop = false;

  constructor() {
    const hasSR = typeof window !== 'undefined' && !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
    console.log('[VOZ] service constructor -> isSupported (Web Speech API):', hasSR);
    console.log('[VOZ] service constructor -> SpeechRecognition:', !!(window as any).SpeechRecognition, '| webkitSpeechRecognition:', !!(window as any).webkitSpeechRecognition);
    this.isSupported.set(hasSR);

    if (typeof navigator !== 'undefined' && navigator?.mediaDevices?.enumerateDevices) {
      navigator.mediaDevices.enumerateDevices().then(devices => {
        const mics = devices.filter(d => d.kind === 'audioinput');
        console.log('[VOZ] Micrófonos detectados por el navegador:', mics.length, mics.map(m => m.label || '(permiso no otorgado o sin etiqueta)'));
      }).catch(err => console.warn('[VOZ] No se pudieron enumerar micrófonos:', err));
    }
  }

  /**
   * Inicia el dictado con la Web Speech API nativa del navegador.
   * El texto reconocido se entrega por `onFinal`; los parciales en tiempo real por `onInterim`.
   */
  start(lang = 'es-ES', handlers: VoiceDictadoHandlers, timeoutMs = DEFAULT_TIMEOUT_MS): void {
    console.log('[VOZ] start() -> lang pedido:', lang, '| timeoutMs:', timeoutMs);
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SR) {
      handlers.onError?.('unsupported', 'Este navegador no soporta dictado por voz nativo. Usa Chrome, Edge o Safari, o escribe el comando en el cuadro de texto.');
      return;
    }

    if (this.isRecording() || this.isProcessing()) {
      this.handler?.onBusy?.();
      return;
    }

    this.abort();
    this.interimText.set('');
    this.lastInterim = '';
    this.finalDelivered = false;
    this.errorEmitted = false;
    this.manualStop = false;
    this.isProcessing.set(false);
    this.handler = handlers;

    const first = this.workingLang() ?? lang;
    const queue = [first, ...LANG_FALLBACKS.filter(l => l !== first)];
    this.tryLang(SR, queue, timeoutMs);

    this.timer = setTimeout(() => {
      if (this.isRecording()) this.finish();
    }, timeoutMs);
  }

  private tryLang(SR: any, queue: string[], timeoutMs = DEFAULT_TIMEOUT_MS): void {
    const lang = queue[0];
    console.log('[VOZ] tryLang() -> intentando idioma:', lang, '| cola:', queue);
    this.rec = new SR();
    this.rec.lang = lang;
    this.rec.interimResults = true;
    this.rec.continuous = false; // continuous = false detecta automáticamente el fin de la frase
    this.rec.maxAlternatives = 1;

    this.rec.onstart = () => {
      console.log('[VOZ] onstart -> reconocimiento iniciado');
    };
    this.rec.onaudiostart = () => {
      console.log('[VOZ] onaudiostart -> captura de audio del micrófono INICIADA');
    };
    this.rec.onsoundstart = () => {
      console.log('[VOZ] onsoundstart -> sonido detectado');
    };
    this.rec.onspeechstart = () => {
      console.log('[VOZ] onspeechstart -> voz humana detectada');
    };
    this.rec.onspeechend = () => {
      console.log('[VOZ] onspeechend -> fin de voz humana detectada');
    };
    this.rec.onsoundend = () => {
      console.log('[VOZ] onsoundend -> fin de sonido');
    };
    this.rec.onaudioend = () => {
      console.log('[VOZ] onaudioend -> captura de audio del micrófono finalizada');
    };

    this.rec.onresult = (e: any) => {
      console.log('[VOZ] onresult -> evento:', e);
      let interim = '';
      let final = '';

      for (let i = e.resultIndex || 0; i < e.results.length; i++) {
        const item = e.results[i];
        if (item.isFinal) {
          final += item[0].transcript;
        } else {
          interim += item[0].transcript;
        }
      }

      console.log('[VOZ] onresult -> final:', JSON.stringify(final), '| interim:', JSON.stringify(interim));
      const parcial = (final || interim).trim();

      if (parcial) {
        this.lastInterim = parcial;
        this.interimText.set(parcial);
        this.handler?.onInterim?.(parcial);
      }

      if (final.trim() && final.trim().length >= 2) {
        this.workingLang.set(lang);
        console.log('[VOZ] onresult -> texto final confirmado:', final.trim());
        this.deliver(final.trim());
      }
    };

    this.rec.onerror = (e: any) => {
      const code: string = e?.error ?? 'unknown';
      console.log('[VOZ] onerror -> code:', code, '| lastInterim:', JSON.stringify(this.lastInterim), '| manualStop:', this.manualStop);

      if (code === 'aborted') return;
      this.clearTimer();

      if ((code === 'language-not-supported' || code === 'not-supported') && queue.length > 1) {
        this.abort();
        this.tryLang(SR, queue.slice(1), timeoutMs);
        return;
      }

      // Si se produjo un silencio/corte pero ya se había capturado texto parcial
      if ((code === 'no-speech' || code === 'audio-capture') && this.lastInterim && this.lastInterim.length >= 2) {
        this.deliver(this.lastInterim);
        return;
      }

      // Si el usuario detuvo manualmente y no hubo voz, no alertar como error de sistema
      if (this.manualStop && (code === 'no-speech' || code === 'audio-capture')) {
        this.abort();
        return;
      }

      this.fail(code);
    };

    this.rec.onend = () => {
      console.log('[VOZ] onend -> fin de reconocimiento | lastInterim:', JSON.stringify(this.lastInterim), '| finalDelivered:', this.finalDelivered, '| manualStop:', this.manualStop);
      this.clearTimer();
      if (this.stopGraceTimer) {
        clearTimeout(this.stopGraceTimer);
        this.stopGraceTimer = null;
      }
      this.isRecording.set(false);

      if (this.finalDelivered || this.errorEmitted) return;

      if (this.lastInterim && this.lastInterim.length >= 2) {
        this.deliver(this.lastInterim);
      } else if (this.manualStop) {
        // El usuario detuvo la grabación sin texto
        this.abort();
      } else {
        this.fail('no-speech');
      }
    };

    try {
      this.rec.start();
      this.isRecording.set(true);
    } catch (err) {
      console.warn('[VOZ] Error al iniciar reconocimiento:', err);
      this.fail('busy');
    }
  }

  /** Cierra el dictado por timeout entregando lo escuchado o avisando si no hubo voz. */
  private finish(): void {
    if (this.finalDelivered || this.errorEmitted) return;
    if (this.lastInterim && this.lastInterim.length >= 2) {
      this.deliver(this.lastInterim);
    } else {
      this.fail('no-speech');
    }
  }

  /** Entrega el texto como resultado final una sola vez. */
  private deliver(text: string): void {
    console.log('[VOZ] deliver() -> entregando texto final:', text);
    if (this.finalDelivered) return;
    const cleanText = (text || '').trim();
    if (cleanText.length < 2) {
      this.fail('no-speech');
      return;
    }
    this.finalDelivered = true;
    this.interimText.set(cleanText);
    this.abort();
    this.handler?.onFinal(cleanText);
  }

  private fail(code: string): void {
    console.log('[VOZ] fail() -> code:', code, '| lastInterim:', JSON.stringify(this.lastInterim));
    if (this.errorEmitted || this.finalDelivered) return;

    this.errorEmitted = true;
    const mapped = this.mapError(code);
    const message = this.describeError(code);
    this.abort();
    this.handler?.onError?.(mapped, message);
  }

  /** Botón Detener: cierra el dictado y entrega el texto capturado. */
  stop(opts: { silent?: boolean } = {}): void {
    console.log('[VOZ] stop() -> isRecording:', this.isRecording(), '| lastInterim:', JSON.stringify(this.lastInterim));
    if (this.finalDelivered || this.errorEmitted) return;

    this.manualStop = true;
    this.clearTimer();

    // Si ya tenemos texto suficiente, entregar inmediatamente
    if (this.lastInterim && this.lastInterim.length >= 2) {
      this.deliver(this.lastInterim);
      return;
    }

    // Si está grabando, solicitar a la API que detenga la escucha y procese el buffer pendiente
    if (this.rec && this.isRecording()) {
      try {
        console.log('[VOZ] stop() -> solicitando rec.stop() para procesar buffer de audio en el servidor...');
        this.isRecording.set(false);
        this.isProcessing.set(true);
        this.rec.stop();
        // Margen prudente de 4 segundos para que Google Speech API devuelva la transcripción
        this.stopGraceTimer = setTimeout(() => {
          if (!this.finalDelivered && !this.errorEmitted) {
            console.log('[VOZ] stop() -> timeout de espera de transcripción final alcanzado');
            this.abort();
          }
        }, 4000);
        return;
      } catch (e) {
        console.warn('[VOZ] Error al llamar rec.stop():', e);
      }
    }

    this.abort();
  }

  private clearTimer(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  private abort(): void {
    this.clearTimer();
    if (this.stopGraceTimer) {
      clearTimeout(this.stopGraceTimer);
      this.stopGraceTimer = null;
    }
    if (this.rec) {
      try {
        this.rec.onresult = null;
        this.rec.onerror = null;
        this.rec.onend = null;
      } catch { /* noop */ }
      try { this.rec.abort?.(); } catch { /* noop */ }
      this.rec = null;
    }
    this.isRecording.set(false);
    this.isProcessing.set(false);
  }

  private mapError(code: string): VoiceErrorCode {
    if (code === 'not-allowed' || code === 'service-not-allowed') return 'not-allowed';
    if (code === 'no-speech' || code === 'audio-capture') return 'no-speech';
    if (code === 'network') return 'network';
    if (code === 'language-not-supported' || code === 'not-supported') return 'language';
    return 'unknown';
  }

  describeError(code: string): string {
    switch (code) {
      case 'not-allowed':
      case 'service-not-allowed':
        return 'Permiso de micrófono denegado. Haz clic en el candado de la barra de dirección y permite el micrófono, luego intenta de nuevo.';
      case 'no-speech':
      case 'audio-capture':
        return 'No se detectó voz. Habla más cerca del micrófono y verifica que no esté en uso por otra app; si no, escribe el comando en el cuadro de texto.';
      case 'network':
        return 'El dictado necesita conexión a internet y un contexto seguro (HTTPS o localhost).';
      case 'language-not-supported':
      case 'not-supported':
        return 'Idioma de dictado no soportado por este navegador. Prueba con Chrome o Edge, o escribe el comando.';
      case 'busy':
        return 'No se pudo iniciar el micrófono. Espera un momento e intenta de nuevo.';
      default:
        return `Error de dictado (${code}). Puedes escribir el comando manualmente.`;
    }
  }
}
