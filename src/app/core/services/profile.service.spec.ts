import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ProfileService } from './profile.service';
import { environment } from '../../../environments/environment';
import { ClientProfile } from '../models/profile.model';

describe('ProfileService', () => {
  let service: ProfileService;
  let httpMock: HttpTestingController;
  const API_URL = environment.apiUrl;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [ProfileService]
    });
    service = TestBed.inject(ProfileService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should get client profile', () => {
    const mockProfile: ClientProfile = {
      id: 1,
      email: 'test@fashionstore.com',
      nombre: 'Juan',
      apellido: 'Perez'
    };

    service.getProfile().subscribe(res => {
      expect(res.nombre).toBe('Juan');
      expect(res.email).toBe('test@fashionstore.com');
    });

    const req = httpMock.expectOne(`${API_URL}/cliente/perfil`);
    expect(req.request.method).toBe('GET');
    req.flush(mockProfile);
  });

  it('should update client profile', () => {
    const updateDto = { nombre: 'Juan Carlos', apellido: 'Perez' };
    const mockProfile: ClientProfile = {
      id: 1,
      email: 'test@fashionstore.com',
      nombre: 'Juan Carlos',
      apellido: 'Perez'
    };

    service.updateProfile(updateDto).subscribe(res => {
      expect(res.nombre).toBe('Juan Carlos');
    });

    const req = httpMock.expectOne(`${API_URL}/cliente/perfil`);
    expect(req.request.method).toBe('PUT');
    req.flush(mockProfile);
  });

  it('should get purchase history', () => {
    service.getPurchaseHistory().subscribe(orders => {
      expect(orders.length).toBe(1);
    });

    const req = httpMock.expectOne(`${API_URL}/cliente/historial-compras`);
    expect(req.request.method).toBe('GET');
    req.flush([{ id: 101, total: 350, estado: 'PAGADO' }]);
  });

  it('should get reservations history', () => {
    service.getReservationsHistory().subscribe(res => {
      expect(res.length).toBe(1);
      expect(res[0].codigo_reserva).toBe('RES-001');
    });

    const req = httpMock.expectOne(`${API_URL}/cliente/historial-reservas`);
    expect(req.request.method).toBe('GET');
    req.flush([{ id: 1, codigo_reserva: 'RES-001', fecha_reserva: '2026-09-11', estado: 'CONFIRMADA' }]);
  });
});
