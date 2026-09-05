import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <footer class="footer-wrapper">
      <div class="container footer-container">
        <!-- Brand & Info -->
        <div class="footer-column brand-col">
          <div class="footer-logo">
            <div class="logo-icon">
              <i class="ri-t-shirt-2-line"></i>
            </div>
            <span class="logo-text">Fashion<span class="text-accent">Store</span></span>
          </div>
          <p class="footer-description">
            Plataforma inteligente de comercio electrónico de moda. Experiencia omnicanal con vestidor virtual de realidad aumentada, reserva de prendas y atención personalizada en múltiples sucursales.
          </p>
          <div class="social-links">
            <a href="javascript:void(0)" class="social-link" aria-label="Instagram"><i class="ri-instagram-line"></i></a>
            <a href="javascript:void(0)" class="social-link" aria-label="Facebook"><i class="ri-facebook-fill"></i></a>
            <a href="javascript:void(0)" class="social-link" aria-label="TikTok"><i class="ri-tiktok-fill"></i></a>
            <a href="javascript:void(0)" class="social-link" aria-label="Twitter"><i class="ri-twitter-x-line"></i></a>
          </div>
        </div>

        <!-- Quick Links -->
        <div class="footer-column">
          <h4 class="footer-heading">Colecciones</h4>
          <ul class="footer-links">
            <li><a routerLink="/home/hombre">Moda Hombre</a></li>
            <li><a routerLink="/home/mujer">Moda Mujer</a></li>
            <li><a routerLink="/home">Tendencias Primavera-Verano</a></li>
            <li><a routerLink="/home">Accesorios & Calzado</a></li>
            <li><a routerLink="/home">Vestidor Virtual RA</a></li>
          </ul>
        </div>

        <!-- Customer Support -->
        <div class="footer-column">
          <h4 class="footer-heading">Servicio al Cliente</h4>
          <ul class="footer-links">
            <li><a href="javascript:void(0)">Preguntas Frecuentes</a></li>
            <li><a href="javascript:void(0)">Envíos y Devoluciones</a></li>
            <li><a href="javascript:void(0)">Políticas de Reserva</a></li>
            <li><a href="javascript:void(0)">Guía de Tallas</a></li>
            <li><a href="javascript:void(0)">Términos y Condiciones</a></li>
          </ul>
        </div>

        <!-- Contact & Branches -->
        <div class="footer-column">
          <h4 class="footer-heading">Sucursales y Contacto</h4>
          <div class="contact-info">
            <div class="contact-item">
              <i class="ri-map-pin-2-line"></i>
              <span>Cochabamba, Santa Cruz, La Paz</span>
            </div>
            <div class="contact-item">
              <i class="ri-phone-line"></i>
              <span>+591 (4) 456-7890</span>
            </div>
            <div class="contact-item">
              <i class="ri-mail-line"></i>
              <span>contacto&#64;fashionstore.com</span>
            </div>
            <div class="contact-item">
              <i class="ri-time-line"></i>
              <span>Lun - Sáb: 09:00 - 20:00</span>
            </div>
          </div>
        </div>
      </div>

      <div class="footer-bottom">
        <div class="container bottom-container">
          <p>&copy; 2026 FashionStore Inc. Todos los derechos reservados. Proyecto Sistemas de Información II.</p>
          <div class="payment-methods">
            <i class="ri-visa-line" title="Visa"></i>
            <i class="ri-mastercard-line" title="Mastercard"></i>
            <i class="ri-paypal-line" title="PayPal"></i>
            <i class="ri-qr-code-line" title="QR Simple"></i>
          </div>
        </div>
      </div>
    </footer>
  `,
  styles: [`
    .footer-wrapper {
      background-color: var(--primary-dark);
      color: #94a3b8;
      border-top: 1px solid rgba(255, 255, 255, 0.08);
      margin-top: auto;
    }

    .footer-container {
      display: grid;
      grid-template-columns: 2fr 1fr 1fr 1.5fr;
      gap: 3rem;
      padding-top: 4rem;
      padding-bottom: 3.5rem;
    }

    .footer-logo {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin-bottom: 1.25rem;
    }

    .logo-icon {
      width: 38px;
      height: 38px;
      border-radius: var(--radius-sm);
      background: var(--accent);
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.25rem;
    }

    .logo-text {
      font-family: 'Outfit', sans-serif;
      font-size: 1.4rem;
      font-weight: 800;
      color: white;
    }

    .footer-description {
      font-size: 0.875rem;
      line-height: 1.6;
      margin-bottom: 1.5rem;
      max-width: 360px;
    }

    .social-links {
      display: flex;
      gap: 0.75rem;
    }

    .social-link {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.06);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 1.1rem;
      transition: all var(--transition-fast);

      &:hover {
        background: var(--accent);
        transform: translateY(-2px);
      }
    }

    .footer-heading {
      color: white;
      font-size: 1.05rem;
      font-weight: 700;
      margin-bottom: 1.25rem;
      position: relative;
      padding-bottom: 0.5rem;

      &::after {
        content: '';
        position: absolute;
        bottom: 0;
        left: 0;
        width: 24px;
        height: 2px;
        background: var(--accent);
      }
    }

    .footer-links {
      list-style: none;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;

      a {
        font-size: 0.875rem;
        color: #cbd5e1;
        transition: all var(--transition-fast);

        &:hover {
          color: var(--accent-light);
          padding-left: 4px;
        }
      }
    }

    .contact-info {
      display: flex;
      flex-direction: column;
      gap: 0.875rem;
    }

    .contact-item {
      display: flex;
      align-items: center;
      gap: 0.625rem;
      font-size: 0.875rem;
      color: #cbd5e1;

      i {
        font-size: 1.1rem;
        color: var(--accent);
        flex-shrink: 0;
      }
    }

    .footer-bottom {
      border-top: 1px solid rgba(255, 255, 255, 0.06);
      padding: 1.5rem 0;
      background: rgba(0, 0, 0, 0.2);
    }

    .bottom-container {
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 0.8125rem;
    }

    .payment-methods {
      display: flex;
      align-items: center;
      gap: 1rem;
      font-size: 1.5rem;
      color: #94a3b8;
    }

    @media (max-width: 992px) {
      .footer-container {
        grid-template-columns: repeat(2, 1fr);
        gap: 2.5rem;
      }
    }

    @media (max-width: 576px) {
      .footer-container {
        grid-template-columns: 1fr;
        gap: 2rem;
      }
      .bottom-container {
        flex-direction: column;
        gap: 1rem;
        text-align: center;
      }
    }
  `]
})
export class FooterComponent {}
