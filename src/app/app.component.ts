import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs';
import { NavbarComponent } from './shared/components/navbar/navbar.component';
import { FooterComponent } from './shared/components/footer/footer.component';
import { ToastComponent } from './shared/components/toast/toast.component';
import { LoadingComponent } from './shared/components/loading/loading.component';
import { AiChatWidgetComponent } from './features/ai-assistant/components/chat-widget/chat-widget.component';

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
    AiChatWidgetComponent
  ],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  public router = inject(Router);
  public isAdminRoute = false;

  constructor() {
    // Initial check
    const currentUrl = window.location.pathname;
    this.isAdminRoute = this.checkIsPanelRoute(currentUrl);

    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: any) => {
        const url = event.urlAfterRedirects || event.url;
        this.isAdminRoute = this.checkIsPanelRoute(url);
      });
  }

  private checkIsPanelRoute(url: string): boolean {
    return url.startsWith('/admin') || url.startsWith('/branch') || url.startsWith('/pos');
  }
}
