import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs';
import { NavbarComponent } from './shared/components/navbar/navbar.component';
import { FooterComponent } from './shared/components/footer/footer.component';
import { ToastComponent } from './shared/components/toast/toast.component';
import { LoadingComponent } from './shared/components/loading/loading.component';
import { ConnectivityBannerComponent } from './shared/components/connectivity-banner/connectivity-banner.component'; // [EXAMEN-2]
import { AiChatWidgetComponent } from './features/ai-assistant/components/chat-widget/chat-widget.component';
// [EXAMEN-2] CU08 / CU16: indicadores globales de sincronización y pagos (RF-030).
import { SyncEngineService } from './core/offline/sync-engine.service';
import { PendingPaymentService } from './core/offline/pending-payment.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule, 
    RouterOutlet, 
    NavbarComponent, 
    FooterComponent, 
    ToastComponent, 
    LoadingComponent,
    ConnectivityBannerComponent,
    AiChatWidgetComponent
  ],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  public router = inject(Router);
  private syncEngine = inject(SyncEngineService); // [EXAMEN-2]
  private pendingPayments = inject(PendingPaymentService); // [EXAMEN-2]
  public isAdminRoute = false;
  // [EXAMEN-2] El panel de plataforma tiene su propio marco; no muestra navbar,
  // footer, asistente ni banner global de conectividad.
  public isPlatformRoute = false;

  constructor() {
    // Initial check
    const currentUrl = window.location.pathname;
    this.isAdminRoute = this.checkIsPanelRoute(currentUrl);
    this.isPlatformRoute = currentUrl.startsWith('/plataforma');

    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: any) => {
        const url = event.urlAfterRedirects || event.url;
        this.isAdminRoute = this.checkIsPanelRoute(url);
        this.isPlatformRoute = url.startsWith('/plataforma');
      });

    // [EXAMEN-2] RF-030: arrancar el motor de sincronización y la escucha de
    // pagos diferidos una sola vez por sesión; los contadores alimentan los badges.
    this.syncEngine.iniciar();
    this.pendingPayments.activarEscuchaPagos();
    void this.pendingPayments.refrescarContadores();
  }

  private checkIsPanelRoute(url: string): boolean {
    return url.startsWith('/admin') || url.startsWith('/branch') || url.startsWith('/pos') ||
      url.startsWith('/plataforma');
  }
}
