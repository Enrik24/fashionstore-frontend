/**
 * [EXAMEN-2] CU08 / RNF-16: secuencia local monotónica por dispositivo.
 * Nunca se usa la hora del cliente para ordenar la cola FIFO.
 */

export function siguienteSecuencia(actual: number): number {
  const valor = Number.isFinite(actual) ? Math.max(0, Math.trunc(actual)) : 0;
  return valor + 1;
}

export function normalizarSecuencia(valor: unknown): number {
  const numero = Number(valor);
  return Number.isFinite(numero) && numero >= 0 ? Math.trunc(numero) : 0;
}

export interface OrdenablePorSecuencia {
  secuencia_local: number;
  fecha_registro_local?: string;
}

/** Orden FIFO: secuencia ascendente y, a igualdad, fecha local ascendente. */
export function compararPorSecuencia<T extends OrdenablePorSecuencia>(a: T, b: T): number {
  if (a.secuencia_local !== b.secuencia_local) return a.secuencia_local - b.secuencia_local;
  const fechaA = a.fecha_registro_local ? Date.parse(a.fecha_registro_local) : 0;
  const fechaB = b.fecha_registro_local ? Date.parse(b.fecha_registro_local) : 0;
  return fechaA - fechaB;
}
