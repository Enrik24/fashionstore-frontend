import { Component, Input, Output, EventEmitter, HostListener, OnInit, OnDestroy, ElementRef, Renderer2, inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, DOCUMENT, isPlatformBrowser } from '@angular/common';

@Component({
  selector: 'app-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (isOpen) {
      <div class="modal-backdrop animate-fade-in" (click)="onBackdropClick($event)">
        <div class="modal-dialog animate-slide-down" [style.max-width]="maxWidth" (click)="$event.stopPropagation()">
          <!-- Header -->
          <div class="modal-header">
            <div class="modal-title-box">
              @if (icon) {
                <div class="modal-icon-box">
                  <i [class]="icon"></i>
                </div>
              }
              <div>
                <h3 class="modal-title">{{ title }}</h3>
                @if (subtitle) {
                  <p class="modal-subtitle">{{ subtitle }}</p>
                }
              </div>
            </div>
            <button class="modal-close-btn" (click)="close()" aria-label="Cerrar modal">
              <i class="ri-close-line"></i>
            </button>
          </div>

          <!-- Body Content -->
          <div class="modal-body">
            <ng-content></ng-content>
          </div>

          <!-- Optional Footer Projection -->
          <div class="modal-footer" *ngIf="showFooter">
            <ng-content select="[modal-footer]"></ng-content>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    :host {
      display: contents;
    }

    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.6);
      backdrop-filter: blur(4px);
      -webkit-backdrop-filter: blur(4px);
      z-index: 9999;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1.5rem;
      overflow-y: auto;
    }

    .modal-dialog {
      width: 100%;
      background: #ffffff;
      border-radius: 16px;
      box-shadow: 0 20px 25px -5px rgba(0,0,0,0.15), 0 8px 10px -6px rgba(0,0,0,0.08);
      border: 1px solid #e2e8f0;
      display: flex;
      flex-direction: column;
      max-height: calc(100vh - 3rem);
      overflow: hidden;
      position: relative;
      z-index: 10000;
    }

    .modal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1.25rem 1.5rem;
      border-bottom: 1px solid #e2e8f0;
      background: #f8fafc;
      flex-shrink: 0;
    }

    .modal-title-box {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .modal-icon-box {
      width: 38px;
      height: 38px;
      border-radius: 6px;
      background: rgba(225, 29, 72, 0.1);
      color: #e11d48;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.25rem;
      flex-shrink: 0;
    }

    .modal-title {
      font-size: 1.15rem;
      font-weight: 700;
      color: #0f172a;
      margin: 0;
    }

    .modal-subtitle {
      font-size: 0.8125rem;
      color: #64748b;
      margin: 0;
    }

    .modal-close-btn {
      background: none;
      border: none;
      color: #64748b;
      font-size: 1.35rem;
      cursor: pointer;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 150ms ease;
      flex-shrink: 0;

      &:hover {
        background: #e2e8f0;
        color: #0f172a;
      }
    }

    .modal-body {
      padding: 1.5rem;
      overflow-y: auto;
      flex: 1;
      background: #ffffff;
      color: #0f172a;
    }

    .modal-footer {
      padding: 1rem 1.5rem;
      border-top: 1px solid #e2e8f0;
      background: #f8fafc;
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 0.75rem;
      flex-shrink: 0;
    }
  `]
})
export class ModalComponent implements OnInit, OnDestroy {
  @Input() isOpen = false;
  @Input() title = '';
  @Input() subtitle?: string;
  @Input() icon?: string;
  @Input() maxWidth = '600px';
  @Input() showFooter = false;

  @Output() closeEvent = new EventEmitter<void>();

  private el = inject(ElementRef);
  private renderer = inject(Renderer2);
  private document = inject(DOCUMENT);
  private platformId = inject(PLATFORM_ID);

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      // Move host element to document.body to escape any CSS stacking context
      this.renderer.appendChild(this.document.body, this.el.nativeElement);
    }
  }

  ngOnDestroy(): void {
    if (isPlatformBrowser(this.platformId) && this.el.nativeElement.parentNode === this.document.body) {
      this.renderer.removeChild(this.document.body, this.el.nativeElement);
    }
  }

  close(): void {
    this.closeEvent.emit();
  }

  onBackdropClick(event: MouseEvent): void {
    this.close();
  }

  @HostListener('document:keydown.escape')
  onEscapePress(): void {
    if (this.isOpen) {
      this.close();
    }
  }
}
