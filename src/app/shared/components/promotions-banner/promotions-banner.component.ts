import { Component, OnDestroy, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ActivePromotionsService } from '../../../core/services/active-promotions.service';
import { PromocionPublica } from '../../../core/models/promotion.model';

/**
 * [EXAMEN-2] Banner de campaña promocional para home y catálogo.
 * Consume `GET /public/promociones/activas` a través de ActivePromotionsService
 * y muestra la promoción PORCENTAJE vigente con mayor descuento: texto
 * grande, countdown al cierre, CTA al catálogo y cierre (X) persistido por
 * promoción en localStorage.
 */
@Component({
  selector: 'app-promotions-banner',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    @if (mostrar() && promo(); as p) {
      <section class="promo-banner" role="region" aria-label="Promoción vigente">
        <div class="banner-glow" aria-hidden="true"></div>
        <div class="banner-inner">
          <button type="button" class="banner-close" (click)="cerrar()" aria-label="Cerrar banner">
            <i class="ri-close-line"></i>
          </button>

          <div class="banner-badge">
            <i class="ri-fire-line"></i> ¡OFERTA LIMITADA!
          </div>

          <div class="banner-main">
            <h2 class="banner-title">
              {{ p.valor }}% <span class="banner-off">OFF</span>
            </h2>
            <div class="banner-copy">
              <span class="banner-name">{{ p.nombre }}</span>
              @if (p.descripcion) {
                <span class="banner-desc">{{ p.descripcion }}</span>
              }
              @if (p.condiciones) {
                <span class="banner-cond">{{ p.condiciones }}</span>
              }
            </div>
          </div>

          @if (restante(); as r) {
            <div class="countdown" aria-label="Tiempo restante de la promoción">
              <span class="countdown-label">Termina el {{ p.fecha_fin | date: 'dd/MM' }}</span>
              <div class="countdown-boxes">
                <span class="cd-box"><b>{{ r.d }}</b>d</span>
                <span class="cd-box"><b>{{ r.h }}</b>h</span>
                <span class="cd-box"><b>{{ r.m }}</b>m</span>
                <span class="cd-box"><b>{{ r.s }}</b>s</span>
              </div>
            </div>
          }

          <a routerLink="/catalog" class="banner-cta">
            Ver ofertas <i class="ri-arrow-right-line"></i>
          </a>
        </div>
      </section>
    }
  `,
  styles: [`
    .promo-banner {
      position: relative;
      overflow: hidden;
      background: linear-gradient(120deg, #020617 0%, #0f172a 45%, #1e0a1c 100%);
      border-bottom: 2px solid rgba(225, 29, 72, 0.55);
      color: #fff;
      animation: bannerIn 0.5s ease-out;
    }
    /* Halo rosa/oro animado detrás del contenido */
    .banner-glow {
      position: absolute;
      inset: 0;
      background:
        radial-gradient(420px 130px at 12% 120%, var(--accent-glow, rgba(225,29,72,.25)), transparent 70%),
        radial-gradient(380px 120px at 88% -40%, rgba(245, 158, 11, 0.28), transparent 70%);
      animation: glowPulse 3.2s ease-in-out infinite alternate;
      pointer-events: none;
    }
    .banner-inner {
      position: relative;
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 1rem 1.5rem;
      padding: 0.9rem clamp(1rem, 4vw, 2rem);
      max-width: 1280px;
      margin: 0 auto;
      padding-right: 3rem;
    }
    .banner-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      background: var(--accent, #e11d48);
      color: #fff;
      font-weight: 800;
      font-size: 0.72rem;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      padding: 0.35rem 0.7rem;
      border-radius: 999px;
      box-shadow: 0 0 18px var(--accent-glow, rgba(225,29,72,.25));
      animation: glowPulse 2.2s ease-in-out infinite alternate;
    }
    .banner-main { display: flex; align-items: center; gap: 0.9rem; flex: 1 1 320px; }
    .banner-title {
      margin: 0;
      font-size: clamp(1.6rem, 4vw, 2.4rem);
      line-height: 1;
      font-weight: 900;
      background: linear-gradient(90deg, #fff, var(--accent-light, #fb7185));
      -webkit-background-clip: text;
      background-clip: text;
      color: transparent;
    }
    .banner-off { font-size: 0.55em; vertical-align: super; letter-spacing: 0.06em; }
    .banner-copy { display: flex; flex-direction: column; gap: 0.15rem; min-width: 0; }
    .banner-name { font-weight: 800; text-transform: uppercase; letter-spacing: 0.12em; font-size: 0.85rem; color: var(--gold-light, #f59e0b); }
    .banner-desc { font-size: 0.95rem; color: rgba(255, 255, 255, 0.92); }
    .banner-cond { font-size: 0.72rem; color: rgba(255, 255, 255, 0.55); }
    .countdown { display: flex; flex-direction: column; align-items: center; gap: 0.25rem; }
    .countdown-label { font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.08em; color: rgba(255,255,255,.65); }
    .countdown-boxes { display: flex; gap: 0.4rem; }
    .cd-box {
      display: inline-flex;
      align-items: baseline;
      gap: 2px;
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.18);
      border-radius: 8px;
      padding: 0.35rem 0.55rem;
      font-size: 0.75rem;
      color: rgba(255,255,255,.7);
      min-width: 2.6rem;
      justify-content: center;
      font-variant-numeric: tabular-nums;
    }
    .cd-box b { color: #fff; font-size: 1.05rem; }
    .banner-cta {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      background: linear-gradient(90deg, var(--accent, #e11d48), var(--accent-dark, #be123c));
      color: #fff;
      font-weight: 800;
      text-decoration: none;
      padding: 0.65rem 1.4rem;
      border-radius: 999px;
      box-shadow: 0 6px 22px var(--accent-glow, rgba(225,29,72,.25));
      transition: transform 0.18s ease, box-shadow 0.18s ease, filter 0.18s ease;
      white-space: nowrap;
    }
    .banner-cta:hover { transform: translateY(-2px) scale(1.03); filter: brightness(1.08); box-shadow: 0 10px 28px rgba(225,29,72,.4); }
    .banner-close {
      position: absolute;
      top: 0.5rem;
      right: 0.5rem;
      background: transparent;
      border: none;
      color: rgba(255, 255, 255, 0.6);
      font-size: 1.25rem;
      cursor: pointer;
      padding: 0.25rem 0.45rem;
      border-radius: 8px;
      transition: color 0.15s ease, background 0.15s ease;
    }
    .banner-close:hover { color: #fff; background: rgba(255, 255, 255, 0.12); }

    @keyframes bannerIn { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: none; } }
    @keyframes glowPulse { from { opacity: 0.75; } to { opacity: 1; } }

    @media (max-width: 760px) {
      .banner-inner { padding-right: 2.2rem; }
      .banner-cta { width: 100%; justify-content: center; }
    }
  `]
})
export class PromotionsBannerComponent implements OnDestroy {
  private promotionsService = inject(ActivePromotionsService);

  /** Promo destacada (mayor % vigente). */
  promo = computed<PromocionPublica | null>(() => this.promotionsService.getPromocionDestacada());

  /** Banderas reactivas de visibilidad y countdown. */
  mostrar = signal(false);
  restante = signal<{ d: number; h: number; m: number; s: number } | null>(null);

  private timer: ReturnType<typeof setInterval> | null = null;
  private timerFin: string | null = null;

  constructor() {
    // Carga el endpoint público `/public/promociones/activas` (idempotente).
    this.promotionsService.load();

    // Visibilidad: respeta el cierre persistido por promoción (localStorage).
    effect(() => {
      const p = this.promo();
      if (!p) {
        this.mostrar.set(false);
        return;
      }
      const oculto = localStorage.getItem(`promo-banner-oculto-${p.id}`);
      this.mostrar.set(oculto !== '1');
      this.programarCountdown(p);
    }, { allowSignalWrites: true });
  }

  ngOnDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  cerrar(): void {
    const p = this.promo();
    if (p) localStorage.setItem(`promo-banner-oculto-${p.id}`, '1');
    this.mostrar.set(false);
  }

  /** Countdown al `fecha_fin` de la promoción vigente. */
  private programarCountdown(promo: PromocionPublica): void {
    if (this.timerFin === promo.fecha_fin && this.timer) return;
    if (this.timer) clearInterval(this.timer);
    this.timerFin = promo.fecha_fin;

    const objetivo = new Date(promo.fecha_fin).getTime();
    const tick = () => {
      const diff = Math.max(0, objetivo - Date.now());
      if (diff <= 0) {
        // La campaña terminó: el backend dejará de devolverla y el banner
        // desaparece con el refresco; entretanto se oculta y se detiene.
        this.restante.set(null);
        this.mostrar.set(false);
        if (this.timer) clearInterval(this.timer);
        return;
      }
      const d = Math.floor(diff / 86_400_000);
      const h = Math.floor((diff % 86_400_000) / 3_600_000);
      const m = Math.floor((diff % 3_600_000) / 60_000);
      const s = Math.floor((diff % 60_000) / 1000);
      this.restante.set({ d, h, m, s });
    };
    tick();
    this.timer = setInterval(tick, 1000);
  }
}
