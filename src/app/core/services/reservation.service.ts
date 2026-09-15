import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { 
  Reserva, 
  ReservaCreate, 
  CompletarReservaRequest 
} from '../models/reservation.model';

@Injectable({
  providedIn: 'root'
})
export class ReservationService {
  private http = inject(HttpClient);
  private readonly API_URL = `${environment.apiUrl}/reservas`;

  createReservation(data: ReservaCreate): Observable<Reserva> {
    return this.http.post<Reserva>(`${this.API_URL}/`, data);
  }

  getMyReservations(): Observable<Reserva[]> {
    return this.http.get<Reserva[]>(`${this.API_URL}/mis-reservas`);
  }

  getReservationById(id: number): Observable<Reserva> {
    return this.http.get<Reserva>(`${this.API_URL}/${id}`);
  }

  cancelReservation(id: number): Observable<Reserva> {
    return this.http.post<Reserva>(`${this.API_URL}/${id}/cancelar`, {});
  }

  // Branch Manager endpoints
  getBranchReservations(sucursalId?: number, estado?: string): Observable<Reserva[]> {
    let params = new HttpParams();
    if (sucursalId) params = params.set('sucursal_id', sucursalId.toString());
    if (estado) params = params.set('estado', estado);
    return this.http.get<Reserva[]>(`${this.API_URL}/`, { params });
  }

  prepareReservation(id: number): Observable<Reserva> {
    return this.http.patch<Reserva>(`${this.API_URL}/${id}/estado`, null, {
      params: { estado: 'PREPARADA' }
    });
  }

  startTrialReservation(id: number): Observable<Reserva> {
    return this.http.patch<Reserva>(`${this.API_URL}/${id}/estado`, null, {
      params: { estado: 'EN_PRUEBA' }
    });
  }

  completeReservation(id: number, data: CompletarReservaRequest): Observable<any> {
    return this.http.post<any>(`${this.API_URL}/${id}/completar`, data);
  }
}


