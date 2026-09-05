import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Rol, RolCreateDto, RolUpdateDto, Permiso, AsignarPermisosDto } from '../models/role.model';

@Injectable({
  providedIn: 'root'
})
export class RoleApiService {
  private http = inject(HttpClient);
  private readonly API_ROLES_URL = `${environment.apiUrl}/roles`;
  private readonly API_PERMS_URL = `${environment.apiUrl}/permissions`;

  getRoles(): Observable<Rol[]> {
    return this.http.get<Rol[]>(`${this.API_ROLES_URL}/`);
  }

  getRole(id: number): Observable<Rol> {
    return this.http.get<Rol>(`${this.API_ROLES_URL}/${id}`);
  }

  createRole(role: RolCreateDto): Observable<Rol> {
    return this.http.post<Rol>(`${this.API_ROLES_URL}/`, role);
  }

  updateRole(id: number, role: RolUpdateDto): Observable<Rol> {
    return this.http.put<Rol>(`${this.API_ROLES_URL}/${id}`, role);
  }

  deleteRole(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.API_ROLES_URL}/${id}`);
  }

  assignPermissions(roleId: number, permissionsIds: number[]): Observable<Rol> {
    return this.http.post<Rol>(`${this.API_ROLES_URL}/${roleId}/permissions`, { permisos_ids: permissionsIds });
  }

  getPermissions(): Observable<Permiso[]> {
    return this.http.get<Permiso[]>(`${this.API_PERMS_URL}/`);
  }
}
