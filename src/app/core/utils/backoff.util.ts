/**
 * [EXAMEN-2] CU08 / RNF-18: retroceso exponencial con jitter.
 */

export function calcularBackoffSegundos(
  intento: number,
  baseSegundos: number,
  maxSegundos: number,
  aleatorio: () => number = Math.random
): number {
  const intentoNormalizado = Math.max(1, Math.trunc(intento));
  const base = Math.max(1, baseSegundos);
  const maximo = Math.max(base, maxSegundos);
  const exponencial = Math.min(maximo, base * Math.pow(2, intentoNormalizado - 1));
  // Jitter de hasta el 25 % para evitar tormentas de reintentos simultáneos.
  const jitter = exponencial * 0.25 * Math.max(0, Math.min(1, aleatorio()));
  return Math.max(1, Math.round(exponencial + jitter));
}

export function calcularProximoIntento(
  intento: number,
  baseSegundos: number,
  maxSegundos: number,
  ahora: Date = new Date(),
  aleatorio: () => number = Math.random
): string {
  const segundos = calcularBackoffSegundos(intento, baseSegundos, maxSegundos, aleatorio);
  return new Date(ahora.getTime() + segundos * 1000).toISOString();
}

export function puedeReintentar(intentos: number, maximo: number): boolean {
  return intentos < maximo;
}
