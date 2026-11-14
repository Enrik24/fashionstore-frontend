// [EXAMEN-2] Genera el manifiesto de assets que sw.js precachea en install.
// Se ejecuta como postbuild: sin él, las rutas lazy nunca visitadas con conexión
// no cargan offline porque sus chunks no están en caché.
import { readdir, writeFile, stat } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const browserDir = join(root, 'dist', 'fashionstore-frontend', 'browser');

async function listar(dir) {
  const entradas = await readdir(dir, { withFileTypes: true });
  const archivos = [];
  for (const entrada of entradas) {
    const ruta = join(dir, entrada.name);
    if (entrada.isDirectory()) {
      archivos.push(...await listar(ruta));
    } else if (/\.(js|css|woff2?)$/.test(entrada.name)) {
      archivos.push(ruta);
    }
  }
  return archivos;
}

try {
  await stat(browserDir);
} catch {
  console.warn('[sw-precache] No existe el directorio de build; se omite el manifiesto.');
  process.exit(0);
}

const archivos = await listar(browserDir);
const urls = archivos.map((ruta) => '/' + relative(browserDir, ruta).split('\\').join('/')).sort();
await writeFile(join(browserDir, 'sw-precache.json'), JSON.stringify(urls, null, 2));
console.log(`[sw-precache] ${urls.length} assets listados en sw-precache.json`);