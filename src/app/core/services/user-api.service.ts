import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { User, UserCreateDto, UserUpdateDto } from '../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class UserApiService {
  private http = inject(HttpClient);
  private readonly API_URL = `${environment.apiUrl}/users`;

  getUsers(skip: number = 0, limit: number = 100, estado?: string, rol?: string): Observable<User[]> {
    let params = new HttpParams()
      .set('skip', skip.toString())
      .set('limit', limit.toString());

    if (estado) params = params.set('estado', estado);
    if (rol) params = params.set('rol', rol);

    return this.http.get<User[]>(`${this.API_URL}/`, { params });
  }

  getUser(id: number): Observable<User> {
    return this.http.get<User>(`${this.API_URL}/${id}`);
  }

  createUser(user: UserCreateDto, rol: string = 'Cliente'): Observable<User> {
    const params = new HttpParams().set('rol', rol);
    return this.http.post<User>(`${this.API_URL}/`, user, { params });
  }

  updateUser(id: number, user: UserUpdateDto): Observable<User> {
    return this.http.put<User>(`${this.API_URL}/${id}`, user);
  }

  deleteUser(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.API_URL}/${id}`);
  }

  assignRole(userId: number, roleId: number): Observable<User> {
    return this.http.post<User>(`${this.API_URL}/${userId}/roles`, { rol_id: roleId });
  }

  removeRole(userId: number, roleId: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.API_URL}/${userId}/roles/${roleId}`);
  }
}
