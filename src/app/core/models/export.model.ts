export type FormatoExport = 'CSV' | 'EXCEL' | 'HTML' | 'PDF';
export type TipoReporteExport = 'ventas' | 'inventario' | 'reservas' | 'clientes' | 'financiero' | 'kpis' | 'bitacora';

export interface ExportFiltros {
  fechaInicio?: string;
  fechaFin?: string;
  sucursalId?: number;
}

export function exportFilename(tipo: TipoReporteExport, formato: FormatoExport): string {
  const d = new Date();
  const tag = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  const ext = formato === 'EXCEL' ? 'xlsx' : formato.toLowerCase();
  return `reporte_${tipo}_${tag}.${ext}`;
}
