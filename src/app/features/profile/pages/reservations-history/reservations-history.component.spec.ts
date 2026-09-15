import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { ReservationsHistoryComponent } from './reservations-history.component';
import { ProfileService } from '../../../../core/services/profile.service';
import { of } from 'rxjs';

describe('ReservationsHistoryComponent', () => {
  let component: ReservationsHistoryComponent;
  let fixture: ComponentFixture<ReservationsHistoryComponent>;
  let profileServiceMock: any;

  beforeEach(async () => {
    profileServiceMock = {
      getReservationsHistory: jasmine.createSpy('getReservationsHistory').and.returnValue(of([
        {
          id: 1,
          codigo_reserva: 'RES-12345',
          fecha_reserva: '2026-09-11',
          estado: 'PENDIENTE',
          sucursal_nombre: 'Sucursal Equipetrol',
          detalles: [
            { id: 1, nombre_producto: 'Camisa Lino', cantidad: 1, precio_unitario: 150 }
          ]
        }
      ]))
    };

    await TestBed.configureTestingModule({
      imports: [ReservationsHistoryComponent, HttpClientTestingModule, RouterTestingModule],
      providers: [
        { provide: ProfileService, useValue: profileServiceMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ReservationsHistoryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create and load reservations list', () => {
    expect(component).toBeTruthy();
    expect(profileServiceMock.getReservationsHistory).toHaveBeenCalled();
    expect(component.reservations().length).toBe(1);
    expect(component.reservations()[0].codigo_reserva).toBe('RES-12345');
  });

  it('should return correct badge class for status', () => {
    expect(component.getStatusClass('CONFIRMADA')).toBe('badge-success');
    expect(component.getStatusClass('PENDIENTE')).toBe('badge-warning');
    expect(component.getStatusClass('CANCELADA')).toBe('badge-danger');
  });
});
