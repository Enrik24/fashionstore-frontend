import { Component, OnInit, inject, signal, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AiService, ChatMessage } from '../../../../core/services/ai.service';

@Component({
  selector: 'app-ai-chat-widget',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="ai-widget-container">
      <!-- Chat Floating Trigger Button -->
      @if (!isOpen()) {
        <button class="ai-trigger-btn animate-bounce-subtle" (click)="toggleOpen()" title="Asistente de Moda con IA">
          <div class="btn-glow"></div>
          <i class="ri-sparkling-fill"></i>
          <span class="trigger-label">Fashion IA</span>
        </button>
      }

      <!-- Chat Window Dialog -->
      @if (isOpen()) {
        <div class="chat-window card animate-slide-up">
          <!-- Chat Header -->
          <div class="chat-header">
            <div class="assistant-info">
              <div class="assistant-avatar">
                <i class="ri-sparkling-fill"></i>
              </div>
              <div>
                <h4 class="assistant-name">Asistente Virtual de Moda</h4>
                <div class="assistant-status">
                  <span class="status-dot"></span> Asesor de Estilo IA Online
                </div>
              </div>
            </div>
            <div class="header-actions">
              <button class="btn-tool" (click)="clearChat()" title="Reiniciar chat">
                <i class="ri-refresh-line"></i>
              </button>
              <button class="btn-tool" (click)="toggleOpen()" title="Cerrar">
                <i class="ri-close-line"></i>
              </button>
            </div>
          </div>

          <!-- Chat Body Messages -->
          <div class="chat-body" #scrollContainer>
            @for (msg of messages(); track $index) {
              <div class="message-row" [class.user-row]="msg.role === 'user'" [class.assistant-row]="msg.role === 'assistant'">
                @if (msg.role === 'assistant') {
                  <div class="msg-avatar">
                    <i class="ri-sparkling-fill"></i>
                  </div>
                }
                <div class="msg-bubble" [class.user-bubble]="msg.role === 'user'" [class.assistant-bubble]="msg.role === 'assistant'">
                  <div class="msg-text">{{ msg.content }}</div>

                  <!-- Suggested Products inside AI response (visual cards, sin IDs) -->
                  @if (msg.productos_sugeridos && msg.productos_sugeridos.length > 0) {
                    @if (msg.tipo_respuesta === 'outfit') {
                      <div class="outfit-card mt-2">
                        <div class="outfit-header">
                          <i class="ri-t-shirt-line"></i>
                          <span>Look completo sugerido por tu estilista</span>
                        </div>
                        <div class="outfit-row">
                          @for (p of msg.productos_sugeridos; track p.id) {
                            <a [routerLink]="['/catalog', p.id]" class="outfit-mini" (click)="isOpen.set(false)">
                              <div class="outfit-thumb">
                                @if (getProductImage(p)) {
                                  <img [src]="getProductImage(p)" [alt]="p.nombre" />
                                } @else {
                                  <i class="ri-t-shirt-line"></i>
                                }
                              </div>
                              <span class="outfit-name">{{ p.nombre }}</span>
                            </a>
                          }
                        </div>
                        <div class="outfit-total">Total del look: <strong>Bs. {{ getOutfitTotal(msg.productos_sugeridos) }}</strong></div>
                      </div>
                    } @else if (msg.productos_sugeridos.length === 1) {
                      <div class="product-detail-card mt-2">
                        @if (getFirstProduct(msg)) {
                          <div class="detail-img">
                            @if (getProductImage(getFirstProduct(msg))) {
                              <img [src]="getProductImage(getFirstProduct(msg))" [alt]="getFirstProduct(msg).nombre" />
                            } @else {
                              <i class="ri-t-shirt-line"></i>
                            }
                          </div>
                          <div class="detail-info">
                            @if (getFirstProduct(msg).categoria) {
                              <span class="detail-cat">{{ getFirstProduct(msg).categoria }}</span>
                            }
                            <span class="detail-name">{{ getFirstProduct(msg).nombre }}</span>
                            @if (getFirstProduct(msg).descripcion) {
                              <span class="detail-desc">{{ getFirstProduct(msg).descripcion }}</span>
                            }
                            <span class="detail-price">Bs. {{ getFirstProduct(msg).precio }}</span>
                            <a [routerLink]="['/catalog', getFirstProduct(msg).id]" class="detail-action" (click)="isOpen.set(false)">Ver producto</a>
                          </div>
                        }
                      </div>
                    } @else {
                      <div class="product-carousel mt-2">
                        @for (p of msg.productos_sugeridos; track p.id) {
                          <a [routerLink]="['/catalog', p.id]" class="product-card-view" (click)="isOpen.set(false)">
                            <div class="view-img">
                              @if (getProductImage(p)) {
                                <img [src]="getProductImage(p)" [alt]="p.nombre" />
                              } @else {
                                <i class="ri-t-shirt-line"></i>
                              }
                            </div>
                            <div class="view-info">
                              @if (p.categoria) {
                                <span class="view-cat">{{ p.categoria }}</span>
                              }
                              <span class="view-name">{{ p.nombre }}</span>
                              <span class="view-price">Bs. {{ p.precio }}</span>
                            </div>
                          </a>
                        }
                      </div>
                    }
                  }

                  <!-- Dynamic quick replies suggested by the assistant -->
                  @if (getQuickSuggestions(msg).length > 0) {
                    <div class="suggested-prompts mt-2">
                      @for (s of getQuickSuggestions(msg); track $index) {
                        <button class="prompt-chip" (click)="sendQuickPrompt(s)">{{ s }}</button>
                      }
                    </div>
                  }
                </div>
              </div>
            }

            @if (isLoading()) {
              <div class="message-row assistant-row">
                <div class="msg-avatar">
                  <i class="ri-sparkling-fill"></i>
                </div>
                <div class="msg-bubble assistant-bubble typing-bubble">
                  <div class="typing-dots">
                    <span></span><span></span><span></span>
                  </div>
                </div>
              </div>
            }
          </div>

          <!-- Quick Prompts / Chips -->
          <div class="quick-prompts">
            <button class="prompt-chip" (click)="sendQuickPrompt('¿Qué tendencias de moda están de moda?')">
              ✨ Tendencias
            </button>
            <button class="prompt-chip" (click)="sendQuickPrompt('Recomiéndame un outfit para una fiesta elegante')">
              👗 Fiesta Elegante
            </button>
            <button class="prompt-chip" (click)="sendQuickPrompt('Prendas frescas para clima cálido')">
              ☀️ Clima Cálido
            </button>
          </div>

          <!-- Chat Input Footer -->
          <div class="chat-footer">
            <div class="input-wrapper">
              <input type="text" 
                     class="chat-input" 
                     [(ngModel)]="userMessage" 
                     placeholder="Pregúntale a tu estilista IA..." 
                     (keyup.enter)="sendMessage()" 
                     [disabled]="isLoading()" />

              <button class="btn-voice-input" 
                      [class.recording]="isRecording()" 
                      (click)="toggleSpeechRecognition()" 
                      title="Dictar por voz">
                <i [class]="isRecording() ? 'ri-mic-fill text-danger' : 'ri-mic-line'"></i>
              </button>

              <button class="btn-send" 
                      [disabled]="!userMessage.trim() || isLoading()" 
                      (click)="sendMessage()">
                <i class="ri-send-plane-2-fill"></i>
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .ai-widget-container {
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 1040;
    }
    .ai-trigger-btn {
      position: relative;
      background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #d946ef 100%);
      color: #ffffff;
      border: none;
      padding: 0.75rem 1.25rem;
      border-radius: 99px;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-weight: 700;
      font-size: 0.9375rem;
      cursor: pointer;
      box-shadow: 0 8px 24px rgba(217, 70, 239, 0.35);
      transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
    }
    .ai-trigger-btn:hover {
      transform: translateY(-3px) scale(1.03);
      box-shadow: 0 12px 28px rgba(217, 70, 239, 0.45);
    }
    .ai-trigger-btn i { font-size: 1.2rem; color: #f472b6; }
    .chat-window {
      width: 380px;
      height: 540px;
      max-width: calc(100vw - 32px);
      max-height: calc(100vh - 100px);
      background: #ffffff;
      border-radius: 20px;
      border: 1px solid #e2e8f0;
      box-shadow: 0 20px 40px -10px rgba(15, 23, 42, 0.25);
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    .chat-header {
      background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%);
      color: #ffffff;
      padding: 1rem 1.25rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .assistant-info { display: flex; align-items: center; gap: 0.75rem; }
    .assistant-avatar {
      width: 38px;
      height: 38px;
      border-radius: 50%;
      background: linear-gradient(135deg, #ec4899 0%, #a855f7 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      color: #ffffff;
      font-size: 1.1rem;
    }
    .assistant-name { margin: 0; font-size: 0.9375rem; font-weight: 700; color: #ffffff; }
    .assistant-status { font-size: 0.75rem; color: #94a3b8; display: flex; align-items: center; gap: 0.35rem; }
    .status-dot { width: 7px; height: 7px; border-radius: 50%; background: #10b981; }
    .header-actions { display: flex; gap: 0.25rem; }
    .btn-tool {
      background: none;
      border: none;
      color: #94a3b8;
      font-size: 1.1rem;
      padding: 0.25rem;
      cursor: pointer;
      border-radius: 6px;
    }
    .btn-tool:hover { color: #ffffff; background: rgba(255,255,255,0.1); }
    .chat-body {
      flex: 1;
      overflow-y: auto;
      padding: 1rem;
      display: flex;
      flex-direction: column;
      gap: 0.875rem;
      background: #f8fafc;
    }
    .message-row { display: flex; gap: 0.5rem; align-items: flex-end; }
    .user-row { justify-content: flex-end; }
    .assistant-row { justify-content: flex-start; }
    .msg-avatar {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: #818cf8;
      color: #ffffff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.8rem;
      flex-shrink: 0;
    }
    .msg-bubble {
      max-width: 82%;
      padding: 0.75rem 1rem;
      border-radius: 16px;
      font-size: 0.875rem;
      line-height: 1.4;
    }
    .user-bubble {
      background: #0f172a;
      color: #ffffff;
      border-bottom-right-radius: 4px;
    }
    .assistant-bubble {
      background: #ffffff;
      color: #1e293b;
      border: 1px solid #e2e8f0;
      border-bottom-left-radius: 4px;
      box-shadow: 0 1px 2px rgba(0,0,0,0.03);
    }
    .product-carousel {
      display: flex;
      gap: 0.5rem;
      overflow-x: auto;
      padding-bottom: 4px;
      scroll-snap-type: x mandatory;
    }
    .product-card-view {
      flex: 0 0 172px;
      scroll-snap-align: start;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      overflow: hidden;
      text-decoration: none;
      transition: transform 0.15s, box-shadow 0.15s;
    }
    .product-card-view:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 16px rgba(15, 23, 42, 0.12);
    }
    .view-img {
      height: 96px;
      background: #f1f5f9;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .view-img img { width: 100%; height: 100%; object-fit: cover; }
    .view-img i { font-size: 1.6rem; color: #94a3b8; }
    .view-info { display: flex; flex-direction: column; gap: 2px; padding: 8px; }
    .view-cat { font-size: 0.68rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; color: #ec4899; }
    .view-name { font-size: 0.78rem; font-weight: 600; color: #0f172a; line-height: 1.25; max-height: 2.4em; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
    .view-price { font-size: 0.8rem; font-weight: 800; color: #0f172a; }

    .product-detail-card {
      display: flex;
      gap: 0.75rem;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 14px;
      padding: 0.6rem;
    }
    .detail-img {
      flex: 0 0 84px;
      height: 84px;
      border-radius: 10px;
      background: #f1f5f9;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .detail-img img { width: 100%; height: 100%; object-fit: cover; }
    .detail-img i { font-size: 1.6rem; color: #94a3b8; }
    .detail-info { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
    .detail-cat { font-size: 0.68rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; color: #ec4899; }
    .detail-name { font-size: 0.82rem; font-weight: 700; color: #0f172a; }
    .detail-desc { font-size: 0.72rem; color: #64748b; line-height: 1.3; max-height: 3.2em; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
    .detail-price { font-size: 0.9rem; font-weight: 800; color: var(--primary, #0f172a); }
    .detail-action {
      margin-top: 4px;
      align-self: flex-start;
      background: linear-gradient(135deg, #0f172a, #1e1b4b);
      color: #ffffff;
      border-radius: 8px;
      padding: 0.28rem 0.7rem;
      font-size: 0.72rem;
      font-weight: 700;
      text-decoration: none;
    }

    .outfit-card {
      border: 1px solid #e2e8f0;
      border-radius: 14px;
      background: linear-gradient(180deg, #ffffff 0%, #faf5ff 100%);
      padding: 0.7rem;
    }
    .outfit-header { display: flex; align-items: center; gap: 0.4rem; font-size: 0.75rem; font-weight: 700; color: #0f172a; margin-bottom: 0.5rem; }
    .outfit-header i { color: #a855f7; }
    .outfit-row { display: flex; gap: 0.5rem; overflow-x: auto; }
    .outfit-mini { flex: 0 0 96px; display: flex; flex-direction: column; align-items: center; gap: 0.25rem; text-decoration: none; text-align: center; }
    .outfit-thumb { width: 64px; height: 64px; border-radius: 12px; border: 1px solid #e2e8f0; background: #ffffff; margin: 0 auto; overflow: hidden; display: flex; align-items: center; justify-content: center; }
    .outfit-thumb img { width: 100%; height: 100%; object-fit: cover; }
    .outfit-thumb i { font-size: 1.3rem; color: #94a3b8; }
    .outfit-name { font-size: 0.68rem; font-weight: 600; color: #334155; max-width: 96px; }
    .outfit-total { margin-top: 0.5rem; font-size: 0.75rem; color: #64748b; }
    .outfit-total strong { color: #0f172a; }

    .suggested-prompts { display: flex; flex-wrap: wrap; gap: 0.35rem; }
    .typing-dots { display: flex; gap: 4px; padding: 4px 2px; }
    .typing-dots span {
      width: 6px;
      height: 6px;
      background: #94a3b8;
      border-radius: 50%;
      animation: dotPulse 1.4s infinite ease-in-out both;
    }
    .typing-dots span:nth-child(1) { animation-delay: -0.32s; }
    .typing-dots span:nth-child(2) { animation-delay: -0.16s; }
    @keyframes dotPulse {
      0%, 80%, 100% { transform: scale(0); }
      40% { transform: scale(1); }
    }
    .quick-prompts {
      display: flex;
      gap: 0.4rem;
      padding: 0.5rem 0.75rem;
      background: #ffffff;
      border-top: 1px solid #f1f5f9;
      overflow-x: auto;
    }
    .prompt-chip {
      background: #f1f5f9;
      border: 1px solid #e2e8f0;
      border-radius: 99px;
      padding: 0.25rem 0.6rem;
      font-size: 0.75rem;
      font-weight: 600;
      color: #475569;
      white-space: nowrap;
      cursor: pointer;
      transition: all 0.15s;
    }
    .prompt-chip:hover { background: #e2e8f0; color: #0f172a; }
    .chat-footer {
      padding: 0.75rem;
      background: #ffffff;
      border-top: 1px solid #e2e8f0;
    }
    .input-wrapper {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 99px;
      padding: 0.3rem 0.6rem;
    }
    .chat-input {
      flex: 1;
      border: none;
      background: transparent;
      outline: none;
      font-size: 0.875rem;
      padding: 0.25rem 0.5rem;
    }
    .btn-voice-input, .btn-send {
      background: none;
      border: none;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      color: #64748b;
      transition: all 0.2s;
    }
    .btn-voice-input:hover { background: #e2e8f0; color: #0f172a; }
    .btn-voice-input.recording { background: #fee2e2; color: #dc2626; animation: pulse 1.5s infinite; }
    .btn-send { background: var(--primary, #0f172a); color: #ffffff; }
    .btn-send:hover:not(:disabled) { background: #1e293b; }
    .btn-send:disabled { background: #cbd5e1; cursor: not-allowed; }
  `]
})
export class AiChatWidgetComponent implements OnInit, AfterViewChecked {
  private aiService = inject(AiService);

  @ViewChild('scrollContainer') private scrollContainer?: ElementRef;

  isOpen = signal<boolean>(false);
  isLoading = signal<boolean>(false);
  isRecording = signal<boolean>(false);
  userMessage: string = '';

  messages = signal<ChatMessage[]>([
    {
      role: 'assistant',
      content: '¡Hola! Soy tu Asistente Personal de Moda con Inteligencia Artificial. ¿En qué estilo u ocasión puedo inspirarte hoy?'
    }
  ]);

  private recognition: any;

  ngOnInit(): void {
    this.initSpeechRecognition();
  }

  ngAfterViewChecked(): void {
    this.scrollToBottom();
  }

  toggleOpen() {
    this.isOpen.update(v => !v);
  }

  clearChat() {
    this.messages.set([
      {
        role: 'assistant',
        content: '¡Conversación reiniciada! ¿Qué prenda o look te gustaría explorar hoy?'
      }
    ]);
  }

  sendQuickPrompt(prompt: string) {
    this.userMessage = prompt;
    this.sendMessage();
  }

  /** Devuelve la primera imagen disponible de un producto (compat: imagenes[] | imagen_principal | imagen). */
  getProductImage(p: any): string {
    if (p && Array.isArray(p.imagenes) && p.imagenes.length > 0) return p.imagenes[0];
    if (p && p.imagen_principal) return p.imagen_principal;
    if (p && p.imagen) return p.imagen;
    return '';
  }

  getFirstProduct(msg: ChatMessage): any {
    return (msg.productos_sugeridos && msg.productos_sugeridos.length > 0) ? msg.productos_sugeridos[0] : null;
  }

  /** Suma el total de un look completo y lo formatea en Bs. */
  getOutfitTotal(products: any[]): string {
    const total = (products || []).reduce((acc, p) => acc + (Number(p.precio) || 0), 0);
    return total.toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  getQuickSuggestions(msg: ChatMessage): string[] {
    return (msg.sugerencias_rapidas || []).slice(0, 3);
  }

  sendMessage() {
    if (!this.userMessage.trim() || this.isLoading()) return;
    const text = this.userMessage.trim();
    this.userMessage = '';

    // Add user message
    this.messages.update(prev => [...prev, { role: 'user', content: text }]);
    this.isLoading.set(true);

    const history = this.messages()
      .filter(m => m.role === 'user' || m.role === 'assistant')
      .map(m => ({ role: m.role, content: m.content }));

    this.aiService.chat(text, history).subscribe({
      next: (res) => {
        this.messages.update(prev => [
          ...prev,
          {
            role: 'assistant',
            content: res.respuesta,
            productos_sugeridos: res.productos_mencionados ?? res.productos,
            sugerencias_rapidas: res.sugerencias,
            tipo_respuesta: res.tipo_respuesta
          }
        ]);
        this.isLoading.set(false);
      },
      error: () => {
        this.messages.update(prev => [
          ...prev,
          {
            role: 'assistant',
            content: 'Lo siento, tuve un problema conectando con el servicio de IA. ¿Podrías intentar nuevamente?'
          }
        ]);
        this.isLoading.set(false);
      }
    });
  }

  initSpeechRecognition() {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      this.recognition = new SpeechRecognition();
      this.recognition.lang = 'es-BO';
      this.recognition.continuous = false;
      this.recognition.interimResults = false;

      this.recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        this.userMessage = transcript;
        this.isRecording.set(false);
        this.sendMessage();
      };

      this.recognition.onerror = () => {
        this.isRecording.set(false);
      };

      this.recognition.onend = () => {
        this.isRecording.set(false);
      };
    }
  }

  toggleSpeechRecognition() {
    if (!this.recognition) {
      alert('Tu navegador no soporta reconocimiento de voz nativo.');
      return;
    }
    if (this.isRecording()) {
      this.recognition.stop();
      this.isRecording.set(false);
    } else {
      this.recognition.start();
      this.isRecording.set(true);
    }
  }

  private scrollToBottom(): void {
    if (this.scrollContainer) {
      this.scrollContainer.nativeElement.scrollTop = this.scrollContainer.nativeElement.scrollHeight;
    }
  }
}
