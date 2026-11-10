import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { AnaliticaApiService } from '../../../../core/services/analitica-api.service';
import { firstValueFrom } from 'rxjs';

/** [EXAMEN-2] CU12: KPIs por rol/sucursal, caché, datos insuficientes, ML. */
describe('CU12 - Dashboard y ML', () => {
  let api: AnaliticaApiService;
  let httpMock: HttpTestingController;
  beforeEach(() => { TestBed.configureTestingModule({ imports: [HttpClientTestingModule] }); api = TestBed.inject(AnaliticaApiService); httpMock = TestBed.inject(HttpTestingController); });
  afterEach(() => { httpMock.verify(); TestBed.resetTestingModule(); });
  it('dashboard con filtro sucursal y aviso caché', async () => {
    const p = firstValueFrom(api.obtenerDashboard({ sucursal_id: 1 }));
    httpMock.expectOne((r) => r.url.includes('/analitica/dashboard')).flush({ kpis: [], prendas_repuestas: 3, monto_compensaciones: 50, desde_cache: true });
    const d = await p;
    expect(d.prendas_repuestas).toBe(3);
    expect(d.monto_compensaciones).toBe(50);
  });
  it('datos insuficientes (<3 meses)', async () => {
    const p = firstValueFrom(api.obtenerDashboard());
    httpMock.expectOne((r) => r.url.includes('/analitica/dashboard')).flush({ kpis: [], datos_insuficientes: true, mensaje_datos_insuficientes: 'Se requiere mínimo 3 meses' });
    expect((await p).datos_insuficientes).toBeTrue();
  });
  it('entrena y predice con métricas', async () => {
    const e = firstValueFrom(api.entrenar({ tipo: 'SUPERVISADO' }));
    httpMock.expectOne((r) => r.url.includes('/ml/entrenar')).flush({ nombre: 'RF', tipo: 'SUPERVISADO', estado: 'ENTRENADO', metricas_json: { accuracy: 0.52, rmse: 10 } });
    expect((await e).estado).toBe('ENTRENADO');
    const pr = firstValueFrom(api.predecir({ modelo_id: 7, horizonte: 7 }));
    const peticionPrediccion = httpMock.expectOne((r) => r.url.includes('/ml/predecir'));
    expect(peticionPrediccion.request.body).toEqual({ modelo_id: 7, horizonte: 7 });
    peticionPrediccion.flush({ valores: [1, 2], rmse: 10, accuracy: 0.9 });
    expect((await pr).rmse).toBe(10);
  });
  it('segmenta con silhouette bajo', async () => {
    const s = firstValueFrom(api.segmentar());
    httpMock.expectOne((r) => r.url.includes('/ml/segmentar')).flush([{ segmento_id: 'a', silhouette: 0.1 }]);
    expect((await s)[0].silhouette).toBe(0.1);
  });
  it('detecta anomalías y lista modelos', async () => {
    const a = firstValueFrom(api.anomalias());
    httpMock.expectOne((r) => r.url.includes('/ml/anomalias')).flush([{ descripcion: 'pico' }]);
    expect((await a).length).toBe(1);
  });
  it('datos sintéticos generar/sembrar/eliminar', async () => {
    const d = firstValueFrom(api.generarDataset({ filas: 10 }));
    httpMock.expectOne((r) => r.url.includes('/datos-sinteticos/generar')).flush({ id: 1, nombre: 'demo', filas: 10 });
    expect((await d).id).toBe(1);
  });
});
