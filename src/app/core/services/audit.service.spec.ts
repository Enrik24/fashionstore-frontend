import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { AuditService } from './audit.service';
import { environment } from '../../../environments/environment';

describe('AuditService', () => {
  let service: AuditService;
  let httpMock: HttpTestingController;
  const API_URL = environment.apiUrl;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [AuditService]
    });
    service = TestBed.inject(AuditService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should fetch audit logs with filter', () => {
    service.getLogs({ accion: 'LOGIN', limit: 50 }).subscribe(logs => {
      expect(logs.length).toBe(1);
      expect(logs[0].accion).toBe('LOGIN');
    });

    const req = httpMock.expectOne(r => r.url === `${API_URL}/bitacora/`);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('accion')).toBe('LOGIN');
    expect(req.request.params.get('limit')).toBe('50');
    req.flush([
      { id: 1, usuario_id: 2, accion: 'LOGIN', created_at: '2026-09-11T12:00:00Z' }
    ]);
  });
});
