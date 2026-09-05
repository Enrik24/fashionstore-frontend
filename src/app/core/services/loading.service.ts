import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class LoadingService {
  private activeRequests = signal<number>(0);
  public isLoading = signal<boolean>(false);

  show(): void {
    this.activeRequests.update(count => {
      const next = count + 1;
      this.isLoading.set(next > 0);
      return next;
    });
  }

  hide(): void {
    this.activeRequests.update(count => {
      const next = Math.max(0, count - 1);
      this.isLoading.set(next > 0);
      return next;
    });
  }
}
