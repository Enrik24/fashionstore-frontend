import { Component, OnInit, inject, signal, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Observable, forkJoin, of, switchMap, catchError } from 'rxjs';
import { AiService, ChatMessage } from '../../../../core/services/ai.service';
import { AlertService } from '../../../../core/services/alert.service';
import { AuthService } from '../../../../core/services/auth.service';
import { CartService } from '../../../../core/services/cart.service';
import { ToastService } from '../../../../core/services/toast.service';
import { PublicCatalogService } from '../../../../core/services/public-catalog.service';

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
            @if (!authService.isAuthenticated()) {
              <!-- Pantalla de invitación / requerimiento de autenticación -->
              <div class="auth-required-box animate-fade-in">
                <div class="auth-lock-icon">
                  <i class="ri-user-star-line"></i>
                </div>
                <h3 class="auth-box-title">Inicia sesión con tu cuenta</h3>
                <p class="auth-box-desc">
                  Tu Asistente Virtual y Estilista de Moda con IA está disponible exclusivamente para clientes de <strong>FashionStore</strong>. Inicia sesión para recibir asesoría de outfits, recomendaciones a tu medida y agregar looks directamente a tu carrito.
                </p>
                <div class="auth-box-actions">
                  <a routerLink="/auth/login" class="btn btn-accent btn-block" (click)="isOpen.set(false)">
                    <i class="ri-login-box-line"></i> Iniciar Sesión
                  </a>
                  <a routerLink="/auth/register" class="btn btn-outline btn-block mt-2" (click)="isOpen.set(false)">
                    <i class="ri-user-add-line"></i> Registrarse Gratis
                  </a>
                </div>
              </div>
            } @else {
              <!-- Mensajes del chat para usuarios autenticados -->
              @for (msg of messages(); track $index) {
                <div class="message-row" [class.user-row]="msg.role === 'user'" [class.assistant-row]="msg.role === 'assistant'">
                  @if (msg.role === 'assistant') {
                    <div class="msg-avatar">
                      <i class="ri-sparkling-fill"></i>
                    </div>
                  }
                  <div class="msg-bubble" [class.user-bubble]="msg.role === 'user'" [class.assistant-bubble]="msg.role === 'assistant'">
                    <div class="msg-text">{{ msg.content }}</div>

                    <!-- Suggested Products inside AI response (visual cards) -->
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
                                <span class="outfit-price">Bs. {{ p.precio }}</span>
                              </a>
                            }
                          </div>
                          <div class="outfit-footer">
                            <div class="outfit-total">Total del look: <strong>Bs. {{ getOutfitTotal(msg.productos_sugeridos) }}</strong></div>
                            <button class="btn btn-sm btn-accent outfit-btn-cart" 
                                    [disabled]="isAddingToCart()"
                                    (click)="addOutfitToCart(msg.productos_sugeridos)">
                              @if (isAddingToCart()) {
                                <i class="ri-loader-4-line spin-icon"></i> Agregando...
                              } @else {
                                <i class="ri-shopping-cart-2-fill"></i> Agregar Outfit al Carrito
                              }
                            </button>
                          </div>
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
                              <div class="detail-actions-row">
                                <a [routerLink]="['/catalog', getFirstProduct(msg).id]" class="detail-action" (click)="isOpen.set(false)">Ver producto</a>
                                <button class="btn btn-sm btn-outline-accent" (click)="addProductToCart(getFirstProduct(msg), $event)">
                                  <i class="ri-shopping-cart-line"></i> + Carrito
                                </button>
                              </div>
                            </div>
                          }
                        </div>
                      } @else {
                        <div class="product-carousel mt-2">
                          @for (p of msg.productos_sugeridos; track p.id) {
                            <div class="product-card-view">
                              <a [routerLink]="['/catalog', p.id]" class="view-link" (click)="isOpen.set(false)">
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
                              <button class="btn-card-add-cart" (click)="addProductToCart(p, $event)" title="Agregar al Carrito">
                                <i class="ri-shopping-cart-line"></i> Añadir
                              </button>
                            </div>
                          }
                        </div>
                      }
                    }

                    <!-- Client Report Download Card -->
                    @if (msg.datos_reporte) {
                      <div class="report-box-card mt-2">
                        <div class="report-box-header">
                          <div class="report-box-title-group">
                            <i [class]="msg.datos_reporte.tipo === 'compras' ? 'ri-file-list-3-fill report-icon-badge' : 'ri-calendar-todo-fill report-icon-badge'"></i>
                            <div>
                              <div class="report-box-title">{{ msg.datos_reporte.titulo }}</div>
                              <div class="report-box-sub">{{ msg.datos_reporte.cliente_nombre }}</div>
                            </div>
                          </div>
                          <span class="badge" [class.badge-primary]="msg.datos_reporte.tipo === 'compras'" [class.badge-accent]="msg.datos_reporte.tipo === 'reservas'">
                            {{ msg.datos_reporte.tipo === 'compras' ? 'COMPRAS' : 'RESERVAS' }}
                          </span>
                        </div>

                        <!-- Mini KPI stats -->
                        <div class="report-kpi-grid">
                          @if (msg.datos_reporte.tipo === 'compras') {
                            <div class="report-kpi-item">
                              <span class="report-kpi-lbl">Total Pedidos</span>
                              <span class="report-kpi-val">{{ msg.datos_reporte.total_compras }}</span>
                            </div>
                            <div class="report-kpi-item">
                              <span class="report-kpi-lbl">Total Gastado</span>
                              <span class="report-kpi-val text-success font-bold">Bs. {{ msg.datos_reporte.total_gastado }}</span>
                            </div>
                          } @else {
                            <div class="report-kpi-item">
                              <span class="report-kpi-lbl">Total Reservas</span>
                              <span class="report-kpi-val">{{ msg.datos_reporte.total_reservas }}</span>
                            </div>
                            <div class="report-kpi-item">
                              <span class="report-kpi-lbl">Activas / Tienda</span>
                              <span class="report-kpi-val text-warning font-bold">{{ msg.datos_reporte.reservas_activas }}</span>
                            </div>
                          }
                        </div>

                        <!-- Action Download Buttons -->
                        <div class="report-actions-row">
                          <button type="button" class="btn btn-sm btn-accent report-btn-dl" 
                                  (click)="downloadClientReport(msg.datos_reporte.tipo, 'PDF')" 
                                  [disabled]="isDownloadingReport()">
                            <i class="ri-file-pdf-2-line"></i> Descargar PDF
                          </button>
                          <button type="button" class="btn btn-sm btn-outline-success report-btn-dl" 
                                  (click)="downloadClientReport(msg.datos_reporte.tipo, 'EXCEL')" 
                                  [disabled]="isDownloadingReport()">
                            <i class="ri-file-excel-2-line"></i> Descargar Excel
                          </button>
                          @if (msg.datos_reporte.tipo === 'compras') {
                            <a routerLink="/profile/orders" class="btn btn-sm btn-outline report-btn-link" (click)="isOpen.set(false)">
                              <i class="ri-external-link-line"></i> Mis Pedidos
                            </a>
                          } @else {
                            <a routerLink="/profile/reservations" class="btn btn-sm btn-outline report-btn-link" (click)="isOpen.set(false)">
                              <i class="ri-external-link-line"></i> Mis Reservas
                            </a>
                          }
                        </div>
                      </div>
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
            }
          </div>

          <!-- Quick Prompts / Chips (Solo si está autenticado) -->
          @if (authService.isAuthenticated()) {
            <div class="quick-prompts">
              <button class="prompt-chip" (click)="sendQuickPrompt('Genera un reporte de mis compras')">
                📄 Mis Compras
              </button>
              <button class="prompt-chip" (click)="sendQuickPrompt('Genera un reporte de mis reservas')">
                🗓️ Mis Reservas
              </button>
              <button class="prompt-chip" (click)="sendQuickPrompt('¿Qué tendencias de moda están de moda?')">
                ✨ Tendencias
              </button>
              <button class="prompt-chip" (click)="sendQuickPrompt('Crea un outfit para hombre para verano')">
                ☀️ Outfit Verano
              </button>
              <button class="prompt-chip" (click)="sendQuickPrompt('Recomiéndame un outfit para una fiesta elegante')">
                👗 Fiesta Elegante
              </button>
            </div>
          }

          <!-- Chat Input Footer -->
          <div class="chat-footer">
            @if (!authService.isAuthenticated()) {
              <div class="auth-footer-notice">
                <i class="ri-information-line text-accent"></i>
                <span>Inicia sesión para comenzar a chatear con tu estilista IA</span>
              </div>
            } @else {
              <div class="input-wrapper">
                <input type="text" 
                       class="chat-input" 
                       [(ngModel)]="userMessage" 
                       placeholder="Pregúntale a tu estilista IA..." 
                       (keyup.enter)="sendMessage()" 
                       [disabled]="isLoading() || isAddingToCart()" />

                <button class="btn-voice-input" 
                        [class.recording]="isRecording()" 
                        (click)="toggleSpeechRecognition()" 
                        title="Dictar por voz">
                  <i [class]="isRecording() ? 'ri-mic-fill text-danger' : 'ri-mic-line'"></i>
                </button>

                <button class="btn-send" 
                        [disabled]="!userMessage.trim() || isLoading() || isAddingToCart()" 
                        (click)="sendMessage()">
                  <i class="ri-send-plane-2-fill"></i>
                </button>
              </div>
            }
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
    .btn-glow {
      position: absolute;
      inset: -2px;
      background: linear-gradient(135deg, #ec4899, #8b5cf6, #3b82f6);
      border-radius: 99px;
      z-index: -1;
      opacity: 0.6;
      filter: blur(8px);
      animation: pulseGlow 3s infinite;
    }
    @keyframes pulseGlow {
      0%, 100% { opacity: 0.4; }
      50% { opacity: 0.8; }
    }
    .trigger-label { font-size: 0.9rem; letter-spacing: 0.02em; }

    .chat-window {
      width: 420px;
      max-width: calc(100vw - 32px);
      height: 600px;
      max-height: calc(100vh - 100px);
      background: #ffffff;
      border-radius: 20px;
      border: 1px solid rgba(226, 232, 240, 0.8);
      box-shadow: 0 20px 40px -15px rgba(0, 0, 0, 0.2), 0 0 0 1px rgba(0, 0, 0, 0.05);
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    .chat-header {
      background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%);
      color: #ffffff;
      padding: 1rem 1.25rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }
    .assistant-info { display: flex; align-items: center; gap: 0.75rem; }
    .assistant-avatar {
      width: 38px;
      height: 38px;
      border-radius: 12px;
      background: linear-gradient(135deg, #ec4899, #8b5cf6);
      display: flex;
      align-items: center;
      justify-content: center;
      color: #ffffff;
      font-size: 1.2rem;
      box-shadow: 0 4px 12px rgba(236, 72, 153, 0.35);
    }
    .assistant-name { margin: 0; font-size: 0.9375rem; font-weight: 700; color: #ffffff; }
    .assistant-status { font-size: 0.75rem; color: #94a3b8; display: flex; align-items: center; gap: 0.35rem; }
    .status-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #10b981;
      display: inline-block;
      box-shadow: 0 0 8px #10b981;
    }
    .header-actions { display: flex; gap: 0.25rem; }
    .btn-tool {
      background: rgba(255, 255, 255, 0.1);
      border: none;
      color: #cbd5e1;
      width: 32px;
      height: 32px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.2s;
    }
    .btn-tool:hover { background: rgba(255, 255, 255, 0.2); color: #ffffff; }

    .chat-body {
      flex: 1;
      padding: 1rem;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 1rem;
      background: #f8fafc;
    }

    /* Auth Box for Unauthenticated Visitors */
    .auth-required-box {
      margin: auto;
      text-align: center;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      padding: 1.5rem 1.25rem;
      box-shadow: 0 4px 16px rgba(15, 23, 42, 0.06);
    }
    .auth-lock-icon {
      width: 56px;
      height: 56px;
      margin: 0 auto 1rem;
      border-radius: 50%;
      background: linear-gradient(135deg, #fdf4ff, #fae8ff);
      color: #d946ef;
      font-size: 1.8rem;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .auth-box-title {
      font-size: 1.1rem;
      font-weight: 700;
      color: #0f172a;
      margin-bottom: 0.5rem;
    }
    .auth-box-desc {
      font-size: 0.8125rem;
      color: #64748b;
      line-height: 1.45;
      margin-bottom: 1.25rem;
    }
    .auth-box-actions {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    .auth-footer-notice {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.4rem;
      font-size: 0.8125rem;
      color: #64748b;
      padding: 0.5rem 0;
    }

    .message-row { display: flex; gap: 0.5rem; max-width: 88%; }
    .assistant-row { justify-content: flex-start; }
    .user-row { align-self: flex-end; }
    .msg-avatar {
      width: 28px;
      height: 28px;
      border-radius: 8px;
      background: linear-gradient(135deg, #8b5cf6, #ec4899);
      color: #ffffff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.85rem;
      flex-shrink: 0;
      margin-top: 2px;
    }
    .msg-bubble {
      padding: 0.75rem 1rem;
      border-radius: 16px;
      font-size: 0.875rem;
      line-height: 1.45;
      position: relative;
    }
    .user-bubble {
      background: linear-gradient(135deg, #0f172a, #1e1b4b);
      color: #ffffff;
      border-bottom-right-radius: 4px;
    }
    .assistant-bubble {
      background: #ffffff;
      color: #1e293b;
      border: 1px solid #e2e8f0;
      border-bottom-left-radius: 4px;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.03);
    }
    .msg-text { white-space: pre-line; }

    .product-carousel {
      display: flex;
      gap: 0.5rem;
      overflow-x: auto;
      padding-bottom: 4px;
    }
    .product-card-view {
      flex: 0 0 130px;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      transition: transform 0.15s, box-shadow 0.15s;
    }
    .product-card-view:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 16px rgba(15, 23, 42, 0.12);
    }
    .view-link { text-decoration: none; color: inherit; }
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
    .view-info { display: flex; flex-direction: column; gap: 2px; padding: 6px 8px; }
    .view-cat { font-size: 0.68rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; color: #ec4899; }
    .view-name { font-size: 0.78rem; font-weight: 600; color: #0f172a; line-height: 1.25; max-height: 2.4em; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
    .view-price { font-size: 0.8rem; font-weight: 800; color: #0f172a; }
    .btn-card-add-cart {
      margin: 4px 6px 6px;
      background: #f1f5f9;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 0.25rem 0.4rem;
      font-size: 0.7rem;
      font-weight: 700;
      color: #0f172a;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.25rem;
      transition: all 0.15s;
    }
    .btn-card-add-cart:hover {
      background: var(--primary, #0f172a);
      color: #ffffff;
      border-color: var(--primary, #0f172a);
    }

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
    .detail-info { display: flex; flex-direction: column; gap: 2px; min-width: 0; flex: 1; }
    .detail-cat { font-size: 0.68rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; color: #ec4899; }
    .detail-name { font-size: 0.82rem; font-weight: 700; color: #0f172a; }
    .detail-desc { font-size: 0.72rem; color: #64748b; line-height: 1.3; max-height: 3.2em; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
    .detail-price { font-size: 0.9rem; font-weight: 800; color: var(--primary, #0f172a); }
    .detail-actions-row {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      margin-top: 4px;
    }
    .detail-action {
      background: linear-gradient(135deg, #0f172a, #1e1b4b);
      color: #ffffff;
      border-radius: 8px;
      padding: 0.28rem 0.6rem;
      font-size: 0.72rem;
      font-weight: 700;
      text-decoration: none;
    }

    .outfit-card {
      border: 1px solid #e2e8f0;
      border-radius: 14px;
      background: linear-gradient(180deg, #ffffff 0%, #faf5ff 100%);
      padding: 0.75rem;
    }
    .outfit-header { display: flex; align-items: center; gap: 0.4rem; font-size: 0.75rem; font-weight: 700; color: #0f172a; margin-bottom: 0.5rem; }
    .outfit-header i { color: #a855f7; }
    .outfit-row { display: flex; gap: 0.5rem; overflow-x: auto; padding-bottom: 4px; }
    .outfit-mini { flex: 0 0 96px; display: flex; flex-direction: column; align-items: center; gap: 0.25rem; text-decoration: none; text-align: center; }
    .outfit-thumb { width: 64px; height: 64px; border-radius: 12px; border: 1px solid #e2e8f0; background: #ffffff; margin: 0 auto; overflow: hidden; display: flex; align-items: center; justify-content: center; }
    .outfit-thumb img { width: 100%; height: 100%; object-fit: cover; }
    .outfit-thumb i { font-size: 1.3rem; color: #94a3b8; }
    .outfit-name { font-size: 0.68rem; font-weight: 600; color: #334155; max-width: 96px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .outfit-price { font-size: 0.7rem; font-weight: 700; color: #0f172a; }
    .outfit-footer {
      margin-top: 0.65rem;
      padding-top: 0.65rem;
      border-top: 1px dashed #e2e8f0;
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
    }
    .outfit-total { font-size: 0.78rem; color: #64748b; }
    .outfit-total strong { color: #0f172a; }
    .outfit-btn-cart {
      width: 100%;
      font-size: 0.78rem;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.4rem;
      padding: 0.45rem 0.75rem;
    }

    .report-box-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 14px;
      padding: 0.75rem;
      display: flex;
      flex-direction: column;
      gap: 0.6rem;
    }
    .report-box-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.5rem;
    }
    .report-box-title-group {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .report-icon-badge {
      font-size: 1.35rem;
      color: var(--accent, #be123c);
    }
    .report-box-title {
      font-size: 0.8125rem;
      font-weight: 700;
      color: #0f172a;
    }
    .report-box-sub {
      font-size: 0.7rem;
      color: #64748b;
    }
    .report-kpi-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 0.5rem;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 0.5rem 0.75rem;
    }
    .report-kpi-item {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .report-kpi-lbl {
      font-size: 0.68rem;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .report-kpi-val {
      font-size: 0.95rem;
      font-weight: 700;
      color: #0f172a;
    }
    .report-actions-row {
      display: flex;
      flex-wrap: wrap;
      gap: 0.4rem;
      align-items: center;
    }
    .report-btn-dl {
      font-size: 0.72rem;
      font-weight: 600;
      padding: 0.3rem 0.6rem;
      border-radius: 8px;
      display: inline-flex;
      align-items: center;
      gap: 0.3rem;
    }
    .report-btn-link {
      font-size: 0.72rem;
      padding: 0.3rem 0.6rem;
      border-radius: 8px;
      text-decoration: none;
      color: #475569;
    }

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
  public authService = inject(AuthService);
  private aiService = inject(AiService);
  private cartService = inject(CartService);
  private toastService = inject(ToastService);
  private publicCatalogService = inject(PublicCatalogService);
  private alertService = inject(AlertService);

  @ViewChild('scrollContainer') private scrollContainer?: ElementRef;

  isOpen = signal<boolean>(false);
  isLoading = signal<boolean>(false);
  isAddingToCart = signal<boolean>(false);
  isDownloadingReport = signal<boolean>(false);
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
    if (!this.authService.isAuthenticated()) {
      this.toastService.warning('Por favor, inicia sesión para chatear con el asistente');
      return;
    }
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
    if (!this.authService.isAuthenticated()) {
      this.toastService.warning('Por favor, inicia sesión para utilizar el asistente virtual');
      return;
    }

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
      next: (res: any) => {
        const suggested = res.productos_mencionados ?? res.productos ?? [];
        this.messages.update(prev => [
          ...prev,
          {
            role: 'assistant',
            content: res.respuesta,
            productos_sugeridos: suggested,
            sugerencias_rapidas: res.sugerencias,
            tipo_respuesta: res.tipo_respuesta,
            accion: res.accion,
            datos_reporte: res.datos_reporte,
            formato_reporte: res.formato_reporte
          }
        ]);
        this.isLoading.set(false);

        // Si el usuario solicitó agregar al carrito en el mensaje y la IA lo identificó
        if (res.accion === 'agregar_carrito') {
          if (suggested.length > 0) {
            this.addOutfitToCart(suggested, true);
          } else {
            // Buscar el último outfit mencionado en el historial
            const lastOutfitMsg = [...this.messages()].reverse().find(m => m.productos_sugeridos && m.productos_sugeridos.length > 0);
            if (lastOutfitMsg && lastOutfitMsg.productos_sugeridos) {
              this.addOutfitToCart(lastOutfitMsg.productos_sugeridos, true);
            }
          }
        }
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

  /**
   * Descarga el reporte de compras o reservas del cliente
   */
  downloadClientReport(tipo: string, formato: 'PDF' | 'EXCEL' | 'CSV' = 'PDF') {
    if (!this.authService.isAuthenticated()) {
      this.toastService.warning('Por favor, inicia sesión para descargar tu reporte');
      return;
    }

    this.isDownloadingReport.set(true);
    const obs = tipo === 'compras'
      ? this.aiService.exportClientPurchasesReport(formato)
      : this.aiService.exportClientReservationsReport(formato);

    obs.subscribe({
      next: (blob: Blob) => {
        this.isDownloadingReport.set(false);
        const extension = formato.toLowerCase() === 'excel' ? 'xlsx' : formato.toLowerCase();
        const fileName = `reporte_${tipo}_${new Date().toISOString().slice(0, 10)}.${extension}`;
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        this.toastService.success(`Reporte de ${tipo} descargado en formato ${formato}`);
      },
      error: () => {
        this.isDownloadingReport.set(false);
        this.toastService.error(`No se pudo generar la descarga del reporte de ${tipo}. Intenta nuevamente.`);
      }
    });
  }

  /**
   * Agrega todas las prendas de un outfit al carrito
   */
  addOutfitToCart(products: any[], silent: boolean = false) {
    if (!this.authService.isAuthenticated()) {
      this.toastService.warning('Por favor, inicia sesión para agregar productos a tu carrito');
      return;
    }

    if (!products || products.length === 0) {
      if (!silent) this.toastService.warning('No hay prendas en este look para agregar.');
      return;
    }

    this.isAddingToCart.set(true);

    const addObservables: Observable<any>[] = [];

    for (const prod of products) {
      if (prod.variante_id) {
        addObservables.push(this.cartService.addItem(prod.variante_id, 1).pipe(catchError(() => of(null))));
      } else if (prod.id) {
        addObservables.push(
          this.publicCatalogService.getProductDetail(prod.id).pipe(
            switchMap((detail: any) => {
              const variantId = (detail.variantes && detail.variantes.length > 0) ? detail.variantes[0].id : null;
              if (variantId) {
                return this.cartService.addItem(variantId, 1);
              }
              return of(null);
            }),
            catchError(() => of(null))
          )
        );
      }
    }

    if (addObservables.length === 0) {
      this.isAddingToCart.set(false);
      return;
    }

    forkJoin(addObservables).subscribe({
      next: () => {
        this.isAddingToCart.set(false);
        this.toastService.success(`¡Se agregaron ${products.length} prendas a tu carrito!`);
        if (!silent) {
          this.messages.update(prev => [
            ...prev,
            {
              role: 'assistant',
              content: `🛍️ ¡Listo! He añadido las ${products.length} prendas de este look a tu carrito de compras.`
            }
          ]);
        }
      },
      error: () => {
        this.isAddingToCart.set(false);
        this.toastService.error('Ocurrió un error al agregar el outfit al carrito');
      }
    });
  }

  /**
   * Agrega un producto individual al carrito
   */
  addProductToCart(product: any, event?: Event) {
    if (event) event.stopPropagation();

    if (!this.authService.isAuthenticated()) {
      this.toastService.warning('Por favor, inicia sesión para agregar productos al carrito');
      return;
    }

    if (product.variante_id) {
      this.cartService.addItem(product.variante_id, 1).subscribe({
        next: () => {
          this.toastService.success(`"${product.nombre}" añadido al carrito`);
        }
      });
    } else if (product.id) {
      this.publicCatalogService.getProductDetail(product.id).subscribe({
        next: (detail: any) => {
          const variantId = (detail.variantes && detail.variantes.length > 0) ? detail.variantes[0].id : null;
          if (variantId) {
            this.cartService.addItem(variantId, 1).subscribe({
              next: () => {
                this.toastService.success(`"${product.nombre}" añadido al carrito`);
              }
            });
          } else {
            this.toastService.error('Producto sin stock disponible actualmente');
          }
        },
        error: () => {
          this.toastService.error('No se pudo obtener el detalle del producto');
        }
      });
    }
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
      this.alertService.warning('Reconocimiento de voz no soportado', 'Tu navegador no soporta reconocimiento de voz nativo.');
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
