import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { AiService } from './ai.service';
import { environment } from '../../../environments/environment';

describe('AiService', () => {
  let service: AiService;
  let httpMock: HttpTestingController;
  const API_URL = environment.apiUrl;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [AiService]
    });
    service = TestBed.inject(AiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should send chat prompt and receive response', () => {
    service.chat('¿Qué me recomiendas para fiesta?', []).subscribe(res => {
      expect(res.respuesta).toBe('Te sugiero un vestido de gala');
    });

    const req = httpMock.expectOne(`${API_URL}/inteligencia/asistente-chat`);
    expect(req.request.method).toBe('POST');
    req.flush({ respuesta: 'Te sugiero un vestido de gala', sugerencias: ['Ver vestidos'], productos: [] });
  });

  it('should get trend analysis', () => {
    service.getTrends().subscribe(res => {
      expect(res.tendencias_destacadas?.length).toBe(1);
    });

    const req = httpMock.expectOne(`${API_URL}/inteligencia/tendencias`);
    expect(req.request.method).toBe('GET');
    req.flush({
      tendencias_destacadas: [{ nombre: 'Estilo Urbano', categoria: 'Ropa', popularidad_score: 95, descripcion: 'Moda juvenil' }]
    });
  });

  it('should generate voice report from speech transcription', () => {
    service.generateVoiceReport('Resumen de ventas del día').subscribe(res => {
      expect(res.tipo_reporte).toBe('VENTAS');
    });

    const req = httpMock.expectOne(`${API_URL}/inteligencia/reporte-voz`);
    expect(req.request.method).toBe('POST');
    req.flush({ tipo_reporte: 'VENTAS', resumen: 'Ventas de hoy: Bs. 4500', datos: {} });
  });
});
