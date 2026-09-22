import { RangePreset } from '../models/dashboard.model';

export function rangeFor(preset: RangePreset, ref: Date = new Date()): { fechaInicio: string; fechaFin: string } {
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  const at = (d: Date, days: number) => new Date(d.getTime() + days * 86400000);
  switch (preset) {
    case 'hoy': return { fechaInicio: iso(ref), fechaFin: iso(ref) };
    case '7d': return { fechaInicio: iso(at(ref, -6)), fechaFin: iso(ref) };
    case '30d': return { fechaInicio: iso(at(ref, -29)), fechaFin: iso(ref) };
    case 'mes': return { fechaInicio: iso(new Date(ref.getFullYear(), ref.getMonth(), 1)), fechaFin: iso(ref) };
    case 'trimestre': {
      const q = Math.floor(ref.getMonth() / 3) * 3;
      return { fechaInicio: iso(new Date(ref.getFullYear(), q, 1)), fechaFin: iso(ref) };
    }
    case 'anio': return { fechaInicio: iso(new Date(ref.getFullYear(), 0, 1)), fechaFin: iso(ref) };
    default: return { fechaInicio: iso(at(ref, -29)), fechaFin: iso(ref) };
  }
}
