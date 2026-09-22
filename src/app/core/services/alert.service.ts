import { Injectable } from '@angular/core';
import Swal, { SweetAlertIcon, SweetAlertResult } from 'sweetalert2';

@Injectable({
  providedIn: 'root'
})
export class AlertService {
  /**
   * Muestra un cuadro de alerta informativo básico o con icono
   */
  alert(title: string, text?: string, icon: SweetAlertIcon = 'info'): Promise<SweetAlertResult> {
    return Swal.fire({
      title,
      text,
      icon,
      confirmButtonText: 'Entendido',
      confirmButtonColor: '#0f172a',
      customClass: {
        popup: 'fs-swal-popup',
        confirmButton: 'fs-swal-confirm-btn'
      }
    });
  }

  success(title: string, text?: string): Promise<SweetAlertResult> {
    return Swal.fire({
      title,
      text,
      icon: 'success',
      confirmButtonText: 'Aceptar',
      confirmButtonColor: '#0f172a',
      customClass: {
        popup: 'fs-swal-popup',
        confirmButton: 'fs-swal-confirm-btn'
      }
    });
  }

  error(title: string, text?: string): Promise<SweetAlertResult> {
    return Swal.fire({
      title,
      text,
      icon: 'error',
      confirmButtonText: 'Cerrar',
      confirmButtonColor: '#e11d48',
      customClass: {
        popup: 'fs-swal-popup',
        confirmButton: 'fs-swal-confirm-btn'
      }
    });
  }

  warning(title: string, text?: string): Promise<SweetAlertResult> {
    return Swal.fire({
      title,
      text,
      icon: 'warning',
      confirmButtonText: 'Entendido',
      confirmButtonColor: '#d97706',
      customClass: {
        popup: 'fs-swal-popup',
        confirmButton: 'fs-swal-confirm-btn'
      }
    });
  }

  info(title: string, text?: string): Promise<SweetAlertResult> {
    return this.alert(title, text, 'info');
  }

  /**
   * Modal de confirmación para acciones comunes
   */
  async confirm(
    title: string,
    text?: string,
    confirmButtonText: string = 'Sí, continuar',
    cancelButtonText: string = 'Cancelar'
  ): Promise<boolean> {
    const result = await Swal.fire({
      title,
      text,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#0f172a',
      cancelButtonColor: '#64748b',
      confirmButtonText,
      cancelButtonText,
      reverseButtons: true,
      customClass: {
        popup: 'fs-swal-popup',
        confirmButton: 'fs-swal-confirm-btn',
        cancelButton: 'fs-swal-cancel-btn'
      }
    });

    return result.isConfirmed;
  }

  /**
   * Modal de confirmación para eliminación o acciones destructivas
   */
  async deleteConfirm(
    title: string = '¿Estás seguro?',
    text: string = 'Esta acción no se puede deshacer.',
    confirmButtonText: string = 'Sí, eliminar',
    cancelButtonText: string = 'Cancelar'
  ): Promise<boolean> {
    const result = await Swal.fire({
      title,
      text,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#e11d48',
      cancelButtonColor: '#64748b',
      confirmButtonText,
      cancelButtonText,
      reverseButtons: true,
      customClass: {
        popup: 'fs-swal-popup',
        confirmButton: 'fs-swal-confirm-btn',
        cancelButton: 'fs-swal-cancel-btn'
      }
    });

    return result.isConfirmed;
  }
}
