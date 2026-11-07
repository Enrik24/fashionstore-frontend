import { TestBed } from '@angular/core/testing';
import { IndexedDbService } from './indexed-db.service';
import { environment } from '../../../environments/environment';

/**
 * [EXAMEN-2] Pruebas de la capa IndexedDB (capítulo 9.2).
 * Usa la implementación nativa de IndexedDB de Chrome/Karma; no se requiere
 * `fake-indexeddb` porque el navegador de pruebas ya la expone.
 */
describe('IndexedDbService', () => {
  let servicio: IndexedDbService;

  interface ProductoLocal {
    id: number;
    tenant_id: number;
    nombre: string;
    updated_at?: string;
    categoria_id?: number | null;
  }

  async function sembrarProductos(): Promise<void> {
    await servicio.guardarLote<ProductoLocal>('productos', [
      { id: 1, tenant_id: 10, nombre: 'Blusa', updated_at: '2026-11-01', categoria_id: 2 },
      { id: 2, tenant_id: 10, nombre: 'Pantalón', updated_at: '2026-11-02', categoria_id: 2 },
      { id: 3, tenant_id: 20, nombre: 'Chaqueta', updated_at: '2026-11-02', categoria_id: 3 }
    ]);
  }

  beforeEach(async () => {
    TestBed.configureTestingModule({});
    servicio = TestBed.inject(IndexedDbService);
    await servicio.reiniciarBase();
  });

  afterEach(async () => {
    await servicio.reiniciarBase();
  });

  it('crea todos los almacenes del esquema offline', () => {
    const almacenes = servicio.listarAlmacenes();

    expect(almacenes).toContain('productos');
    expect(almacenes).toContain('sesion');
    expect(almacenes).toContain('operaciones');
    expect(almacenes).toContain('comprobantes');
    expect(almacenes).toContain('bitacora_local');
    expect(almacenes.length).toBe(16);
  });

  it('guarda y recupera un registro por su clave', async () => {
    await servicio.guardar('meta', { clave: 'dispositivo_id', valor: 'uuid-123' });

    const registro = await servicio.obtener<{ clave: string; valor: string }>('meta', 'dispositivo_id');

    expect(registro?.valor).toBe('uuid-123');
  });

  it('guarda un lote y lo recupera completo', async () => {
    await sembrarProductos();

    const todos = await servicio.obtenerTodos<ProductoLocal>('productos');

    expect(todos.length).toBe(3);
    expect(await servicio.contar('productos')).toBe(3);
  });

  it('consulta por índice y devuelve vacío para un índice inexistente', async () => {
    await sembrarProductos();

    const delTenant = await servicio.obtenerPorIndice<ProductoLocal>('productos', 'tenant_id', 10);
    const inexistente = await servicio.obtenerPorIndice<ProductoLocal>('productos', 'no_existe', 10);

    expect(delTenant.length).toBe(2);
    expect(delTenant.every((producto) => producto.tenant_id === 10)).toBeTrue();
    expect(inexistente).toEqual([]);
  });

  it('elimina un registro por clave', async () => {
    await sembrarProductos();

    await servicio.eliminar('productos', 2);

    expect(await servicio.obtener<ProductoLocal>('productos', 2)).toBeNull();
    expect(await servicio.contar('productos')).toBe(2);
  });

  it('borra solo los datos del tenant indicado y limpia la sesión', async () => {
    await sembrarProductos();
    await servicio.guardar('sesion', { clave: 'sesion', tenant_id: 10, pin_hash: 'hash' });
    await servicio.guardar('configuracion', { clave: 'configuracion', tenant_id: 10 });

    await servicio.eliminarPorTenant(10);

    const restantes = await servicio.obtenerTodos<ProductoLocal>('productos');
    expect(restantes.length).toBe(1);
    expect(restantes[0].tenant_id).toBe(20);
    expect(await servicio.contar('sesion')).toBe(0);
    expect(await servicio.contar('configuracion')).toBe(0);
  });

  it('vacía todos los almacenes sin borrar la base', async () => {
    await sembrarProductos();
    await servicio.guardar('meta', { clave: 'dispositivo_id', valor: 'uuid-123' });

    await servicio.vaciar();

    expect(await servicio.contar('productos')).toBe(0);
    expect(await servicio.contar('meta')).toBe(0);
    expect(servicio.listarAlmacenes().length).toBe(16);
  });

  it('estima el uso local con los almacenes del esquema', async () => {
    await sembrarProductos();

    const uso = await servicio.usoEstimado();

    expect(uso.limiteBytes).toBe(environment.offlineMaxMbLocal * 1024 * 1024);
    expect(uso.porcentaje).toBeGreaterThanOrEqual(0);
    expect(uso.porcentaje).toBeLessThanOrEqual(100);
    expect(uso.almacenes.find((almacen) => almacen.nombre === 'productos')?.registros).toBe(3);
  });

  it('reabre la base después de reiniciarla', async () => {
    await servicio.guardar('meta', { clave: 'temporal', valor: true });

    await servicio.reiniciarBase();

    expect(await servicio.obtener('meta', 'temporal')).toBeNull();
    await servicio.guardar('meta', { clave: 'nuevo', valor: 1 });
    expect((await servicio.obtener<{ valor: number }>('meta', 'nuevo'))?.valor).toBe(1);
  });
});
