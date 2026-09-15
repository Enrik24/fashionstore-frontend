import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  ClientProfile,
  UpdateProfileDto,
  ChangePasswordDto,
  OrderHistoryItem,
  ReservationHistoryItem,
  PreferenciasCliente,
  DireccionCliente
} from '../models/profile.model';

@Injectable({
  providedIn: 'root'
})
export class ProfileService {
  private http = inject(HttpClient);
  private readonly API_URL = environment.apiUrl;

  getProfile(): Observable<ClientProfile> {
    return this.http.get<ClientProfile>(`${this.API_URL}/cliente/perfil`);
  }

  updateProfile(data: UpdateProfileDto): Observable<ClientProfile> {
    return this.http.put<ClientProfile>(`${this.API_URL}/cliente/perfil`, data);
  }

  updateAddress(data: Partial<DireccionCliente>): Observable<any> {
    return this.http.put(`${this.API_URL}/cliente/direccion`, data);
  }

  updatePreferences(preferences: PreferenciasCliente): Observable<any> {
    return this.http.put(`${this.API_URL}/cliente/preferencias`, preferences);
  }

  changePassword(data: ChangePasswordDto): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.API_URL}/cliente/change-password`, data);
  }

  getPurchaseHistory(): Observable<OrderHistoryItem[]> {
    return this.http.get<OrderHistoryItem[]>(`${this.API_URL}/cliente/historial-compras`);
  }

  getReservationsHistory(): Observable<ReservationHistoryItem[]> {
    return this.http.get<ReservationHistoryItem[]>(`${this.API_URL}/cliente/historial-reservas`);
  }
}
