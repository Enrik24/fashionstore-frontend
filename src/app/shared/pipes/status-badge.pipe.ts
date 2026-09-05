import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'statusBadge',
  standalone: true
})
export class StatusBadgePipe implements PipeTransform {
  transform(status: string | null | undefined): { label: string; class: string } {
    if (!status) return { label: 'Desconocido', class: 'badge-primary' };

    switch (status.toUpperCase()) {
      case 'ACTIVO':
      case 'DISPONIBLE':
        return { label: 'Activo', class: 'badge-success' };
      case 'INACTIVO':
        return { label: 'Inactivo', class: 'badge-danger' };
      case 'BLOQUEADO':
        return { label: 'Bloqueado', class: 'badge-danger' };
      case 'AGOTADO':
        return { label: 'Agotado', class: 'badge-danger' };
      case 'BAJO_STOCK':
        return { label: 'Bajo Stock', class: 'badge-warning' };
      case 'PROXIMO_INGRESO':
        return { label: 'Próximo Ingreso', class: 'badge-info' };
      default:
        return { label: status, class: 'badge-primary' };
    }
  }
}
