/**
 * [EXAMEN-2] CU08 / RN-005: huella estable de un payload para detectar
 * reenvíos sin depender del orden de las claves.
 */

export function hashPayload(payload: unknown): string {
  const normalizado = JSON.stringify(ordenar(payload));
  return fnv1a(normalizado);
}

function ordenar(valor: unknown): unknown {
  if (Array.isArray(valor)) return valor.map(ordenar);
  if (valor !== null && typeof valor === 'object') {
    const objeto = valor as Record<string, unknown>;
    return Object.keys(objeto)
      .sort()
      .reduce<Record<string, unknown>>((acumulado, clave) => {
        acumulado[clave] = ordenar(objeto[clave]);
        return acumulado;
      }, {});
  }
  return valor;
}

function fnv1a(texto: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < texto.length; i++) {
    hash ^= texto.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}
