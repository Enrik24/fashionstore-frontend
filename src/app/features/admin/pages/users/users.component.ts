import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { UserApiService } from '../../../../core/services/user-api.service';
import { RoleApiService } from '../../../../core/services/role-api.service';
import { ToastService } from '../../../../core/services/toast.service';
import { User, UserCreateDto, UserUpdateDto } from '../../../../core/models/user.model';
import { Rol } from '../../../../core/models/role.model';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { StatusBadgePipe } from '../../../../shared/pipes/status-badge.pipe';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ModalComponent, StatusBadgePipe],
  template: `
    <div class="page-container animate-fade-in">
      <!-- Action Toolbar -->
      <div class="toolbar-card card">
        <div class="toolbar-left">
          <div class="search-input-box">
            <i class="ri-search-line search-icon"></i>
            <input 
              type="text" 
              class="form-control with-icon" 
              placeholder="Buscar por nombre o correo..."
              [value]="searchQuery()"
              (input)="onSearchChange($event)"
            />
          </div>

          <div class="filter-group">
            <select class="form-control select-filter" [value]="selectedRoleFilter()" (change)="onRoleFilterChange($event)">
              <option value="">Todos los Roles</option>
              <option value="Administrador">Administrador</option>
              <option value="Encargado">Encargado</option>
              <option value="Cajero">Cajero</option>
              <option value="Cliente">Cliente</option>
            </select>

            <select class="form-control select-filter" [value]="selectedStatusFilter()" (change)="onStatusFilterChange($event)">
              <option value="">Todos los Estados</option>
              <option value="ACTIVO">Activos</option>
              <option value="INACTIVO">Inactivos</option>
              <option value="BLOQUEADO">Bloqueados</option>
            </select>
          </div>
        </div>

        <div class="toolbar-right">
          <button class="btn btn-accent" (click)="openCreateModal()">
            <i class="ri-user-add-line"></i> Nuevo Usuario
          </button>
        </div>
      </div>

      <!-- Users Table Card -->
      <div class="card table-card">
        <div class="table-card-header">
          <div class="header-count">
            <h3 class="table-title">Usuarios Registrados (CU03)</h3>
            <span class="count-badge">{{ filteredUsers().length }} usuarios</span>
          </div>
          <button class="btn btn-secondary btn-sm" (click)="loadUsers()" [disabled]="isLoading()">
            <i class="ri-refresh-line" [class.spin-icon]="isLoading()"></i> Actualizar
          </button>
        </div>

        <div class="table-responsive">
          <table class="table-custom">
            <thead>
              <tr>
                <th>Usuario</th>
                <th>Contacto</th>
                <th>Rol Asignado</th>
                <th>Estado</th>
                <th>Fecha Registro</th>
                <th class="text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              @if (isLoading()) {
                <tr>
                  <td colspan="6" class="text-center py-8">
                    <i class="ri-loader-4-line spin-icon text-2xl text-accent"></i>
                    <p class="text-muted mt-2">Cargando lista de usuarios...</p>
                  </td>
                </tr>
              } @else if (filteredUsers().length === 0) {
                <tr>
                  <td colspan="6" class="text-center py-8 text-muted">
                    <i class="ri-user-search-line text-3xl mb-2"></i>
                    <p>No se encontraron usuarios con los filtros aplicados.</p>
                  </td>
                </tr>
              } @else {
                @for (user of filteredUsers(); track user.id) {
                  <tr>
                    <td>
                      <div class="user-cell">
                        <div class="user-avatar-small">
                          {{ getInitials(user.nombre, user.apellido) }}
                        </div>
                        <div>
                          <div class="user-cell-name">{{ user.nombre }} {{ user.apellido }}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div class="contact-cell">
                        <span class="cell-email">{{ user.correo }}</span>
                        <span class="cell-phone text-muted">{{ user.telefono || 'Sin teléfono' }}</span>
                      </div>
                    </td>
                    <td>
                      @if (user.roles && user.roles.length > 0) {
                        @for (rol of user.roles; track rol.id) {
                          <span class="badge badge-primary">{{ rol.nombre }}</span>
                        }
                      } @else {
                        <span class="badge badge-primary">Cliente</span>
                      }
                    </td>
                    <td>
                      <span class="badge" [ngClass]="(user.estado | statusBadge).class">
                        {{ (user.estado | statusBadge).label }}
                      </span>
                    </td>
                    <td>
                      <span class="text-muted text-xs">{{ user.fecha_registro | date:'dd/MM/yyyy HH:mm' }}</span>
                    </td>
                    <td>
                      <div class="action-buttons-flex">
                        <button class="btn-action-icon" title="Editar Usuario" (click)="openEditModal(user)">
                          <i class="ri-edit-line"></i>
                        </button>
                        <button class="btn-action-icon" title="Asignar Rol" (click)="openRoleAssignModal(user)">
                          <i class="ri-shield-user-line"></i>
                        </button>
                        <button 
                          class="btn-action-icon" 
                          [class.btn-action-danger]="user.estado === 'ACTIVO'"
                          [class.btn-action-success]="user.estado !== 'ACTIVO'"
                          [title]="user.estado === 'ACTIVO' ? 'Deshabilitar Usuario' : 'Activar Usuario'" 
                          (click)="toggleUserStatus(user)"
                        >
                          <i [class]="user.estado === 'ACTIVO' ? 'ri-user-unfollow-line' : 'ri-user-follow-line'"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                }
              }
            </tbody>
          </table>
        </div>
      </div>

      <!-- Create / Edit User Modal -->
      <app-modal 
        [isOpen]="isUserModalOpen()" 
        [title]="isEditing() ? 'Editar Usuario' : 'Nuevo Usuario Interno'"
        [subtitle]="isEditing() ? 'Actualiza los datos del usuario seleccionado' : 'Registra un usuario interno (Admin, Encargado, Cajero, Cliente)'"
        icon="ri-user-settings-line"
        (closeEvent)="closeUserModal()"
      >
        <form [formGroup]="userForm" (ngSubmit)="saveUser()" class="modal-form">
          <div class="grid grid-cols-2 form-row">
            <div class="form-group">
              <label class="form-label" for="m-nombre">Nombres <span class="required">*</span></label>
              <input id="m-nombre" type="text" formControlName="nombre" class="form-control" placeholder="Ej. Carlos">
            </div>

            <div class="form-group">
              <label class="form-label" for="m-apellido">Apellidos <span class="required">*</span></label>
              <input id="m-apellido" type="text" formControlName="apellido" class="form-control" placeholder="Ej. Mendoza">
            </div>
          </div>

          <div class="grid grid-cols-2 form-row">
            <div class="form-group">
              <label class="form-label" for="m-correo">Correo Electrónico <span class="required">*</span></label>
              <input id="m-correo" type="email" formControlName="correo" class="form-control" placeholder="carlos@fashionstore.com">
            </div>

            <div class="form-group">
              <label class="form-label" for="m-telefono">Teléfono</label>
              <input id="m-telefono" type="tel" formControlName="telefono" class="form-control" placeholder="+591 71234567">
            </div>
          </div>

          @if (!isEditing()) {
            <div class="grid grid-cols-2 form-row">
              <div class="form-group">
                <label class="form-label" for="m-contrasena">Contraseña Inicial <span class="required">*</span></label>
                <input id="m-contrasena" type="password" formControlName="contrasena" class="form-control" placeholder="Mínimo 8 caracteres">
              </div>

              <div class="form-group">
                <label class="form-label" for="m-rol">Rol Inicial <span class="required">*</span></label>
                <select id="m-rol" formControlName="rol" class="form-control">
                  <option value="Administrador">Administrador</option>
                  <option value="Encargado">Encargado de Sucursal</option>
                  <option value="Cajero">Cajero POS</option>
                  <option value="Cliente">Cliente</option>
                </select>
              </div>
            </div>
          } @else {
            <div class="form-group">
              <label class="form-label" for="m-estado">Estado de la Cuenta</label>
              <select id="m-estado" formControlName="estado" class="form-control">
                <option value="ACTIVO">ACTIVO</option>
                <option value="INACTIVO">INACTIVO</option>
                <option value="BLOQUEADO">BLOQUEADO</option>
              </select>
            </div>
          }

          <div class="modal-actions-box">
            <button type="button" class="btn btn-outline" (click)="closeUserModal()">Cancelar</button>
            <button type="submit" class="btn btn-accent" [disabled]="userForm.invalid || isSaving()">
              @if (isSaving()) {
                <i class="ri-loader-4-line spin-icon"></i> Guardando...
              } @else {
                <i class="ri-save-line"></i> {{ isEditing() ? 'Guardar Cambios' : 'Crear Usuario' }}
              }
            </button>
          </div>
        </form>
      </app-modal>

      <!-- Assign Role Modal -->
      <app-modal
        [isOpen]="isRoleModalOpen()"
        title="Asignar Rol a Usuario"
        subtitle="Selecciona el rol que deseas otorgar al usuario"
        icon="ri-shield-user-line"
        (closeEvent)="closeRoleModal()"
      >
        @if (selectedUserForRole()) {
          <div class="role-assign-content">
            <p class="mb-4">Usuario: <strong>{{ selectedUserForRole()?.nombre }} {{ selectedUserForRole()?.apellido }}</strong> ({{ selectedUserForRole()?.correo }})</p>
            
            <div class="form-group">
              <label class="form-label">Seleccionar Rol:</label>
              <select class="form-control" #roleSelect>
                @for (role of availableRoles(); track role.id) {
                  <option [value]="role.id">{{ role.nombre }} - {{ role.descripcion }}</option>
                }
              </select>
            </div>

            <div class="modal-actions-box mt-6">
              <button type="button" class="btn btn-outline" (click)="closeRoleModal()">Cancelar</button>
              <button type="button" class="btn btn-accent" (click)="assignRoleToUser(+roleSelect.value)">
                Asignar Rol
              </button>
            </div>
          </div>
        }
      </app-modal>
    </div>
  `,
  styles: [`
    .page-container {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .toolbar-card {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1.25rem 1.5rem;
      flex-wrap: wrap;
      gap: 1rem;
    }

    .toolbar-left {
      display: flex;
      align-items: center;
      gap: 1rem;
      flex: 1;
      flex-wrap: wrap;
    }

    .search-input-box {
      position: relative;
      min-width: 280px;
    }

    .search-icon {
      position: absolute;
      left: 1rem;
      top: 50%;
      transform: translateY(-50%);
      color: var(--text-muted);
      font-size: 1.1rem;
    }

    .filter-group {
      display: flex;
      gap: 0.75rem;
    }

    .select-filter {
      padding: 0.625rem 1rem;
      min-width: 160px;
    }

    .table-card {
      padding: 0;
      overflow: hidden;
    }

    .table-card-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1.25rem 1.5rem;
      border-bottom: 1px solid var(--border-color);
      background: white;
    }

    .header-count {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .table-title {
      font-size: 1.15rem;
      font-weight: 700;
      color: var(--primary);
      margin: 0;
    }

    .count-badge {
      background: #f1f5f9;
      color: var(--secondary);
      font-size: 0.75rem;
      font-weight: 600;
      padding: 0.25rem 0.6rem;
      border-radius: var(--radius-full);
    }

    .user-cell {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .user-avatar-small {
      width: 34px;
      height: 34px;
      border-radius: 50%;
      background: linear-gradient(135deg, var(--primary) 0%, var(--primary-light) 100%);
      color: var(--accent);
      font-weight: 700;
      font-size: 0.8125rem;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .user-cell-name {
      font-weight: 600;
      color: var(--primary);
    }

    .user-cell-sub {
      font-size: 0.75rem;
      color: var(--text-muted);
    }

    .contact-cell {
      display: flex;
      flex-direction: column;
    }

    .cell-email {
      font-weight: 500;
    }

    .cell-phone {
      font-size: 0.75rem;
    }

    .action-buttons-flex {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 0.4rem;
    }

    .btn-action-icon {
      width: 32px;
      height: 32px;
      border-radius: var(--radius-sm);
      border: 1px solid var(--border-color);
      background: white;
      color: var(--secondary);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all var(--transition-fast);

      &:hover {
        background: #f8fafc;
        color: var(--primary);
        border-color: var(--primary);
      }

      &.btn-action-danger:hover {
        background: var(--error-bg);
        color: var(--error);
        border-color: var(--error);
      }

      &.btn-action-success:hover {
        background: var(--success-bg);
        color: var(--success);
        border-color: var(--success);
      }
    }

    .modal-form {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .form-row {
      gap: 1rem;
    }

    .modal-actions-box {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 0.75rem;
      margin-top: 1rem;
      padding-top: 1rem;
      border-top: 1px solid var(--border-light);
    }

    .spin-icon {
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      100% { transform: rotate(360deg); }
    }
  `]
})
export class UsersComponent implements OnInit {
  private userApi = inject(UserApiService);
  private roleApi = inject(RoleApiService);
  private toast = inject(ToastService);
  private fb = inject(FormBuilder);

  public users = signal<User[]>([]);
  public availableRoles = signal<Rol[]>([]);
  public isLoading = signal<boolean>(true);
  public isSaving = signal<boolean>(false);
  
  public searchQuery = signal<string>('');
  public selectedRoleFilter = signal<string>('');
  public selectedStatusFilter = signal<string>('');

  // Modals
  public isUserModalOpen = signal<boolean>(false);
  public isEditing = signal<boolean>(false);
  public selectedUserId = signal<number | null>(null);

  public isRoleModalOpen = signal<boolean>(false);
  public selectedUserForRole = signal<User | null>(null);

  public userForm: FormGroup = this.fb.group({
    nombre: ['', [Validators.required, Validators.minLength(2)]],
    apellido: ['', [Validators.required, Validators.minLength(2)]],
    correo: ['', [Validators.required, Validators.email]],
    telefono: [''],
    contrasena: [''],
    rol: ['Cliente'],
    estado: ['ACTIVO']
  });

  public filteredUsers = computed(() => {
    let result = this.users();
    const query = this.searchQuery().toLowerCase().trim();
    const roleFilter = this.selectedRoleFilter().toLowerCase();
    const statusFilter = this.selectedStatusFilter();

    if (query) {
      result = result.filter(u => 
        u.nombre.toLowerCase().includes(query) || 
        u.apellido.toLowerCase().includes(query) || 
        u.correo.toLowerCase().includes(query)
      );
    }

    if (roleFilter) {
      result = result.filter(u => 
        u.roles && u.roles.some(r => r.nombre.toLowerCase() === roleFilter)
      );
    }

    if (statusFilter) {
      result = result.filter(u => u.estado === statusFilter);
    }

    return result;
  });

  ngOnInit(): void {
    this.loadUsers();
    this.loadRoles();
  }

  loadUsers(): void {
    this.isLoading.set(true);
    this.userApi.getUsers(0, 100).subscribe({
      next: (data) => {
        this.users.set(data);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }

  loadRoles(): void {
    this.roleApi.getRoles().subscribe({
      next: (roles) => this.availableRoles.set(roles),
      error: () => {}
    });
  }

  onSearchChange(event: Event): void {
    const val = (event.target as HTMLInputElement).value;
    this.searchQuery.set(val);
  }

  onRoleFilterChange(event: Event): void {
    const val = (event.target as HTMLSelectElement).value;
    this.selectedRoleFilter.set(val);
  }

  onStatusFilterChange(event: Event): void {
    const val = (event.target as HTMLSelectElement).value;
    this.selectedStatusFilter.set(val);
  }

  getInitials(name: string, surname: string): string {
    return `${name?.charAt(0) || ''}${surname?.charAt(0) || ''}`.toUpperCase() || 'U';
  }

  openCreateModal(): void {
    this.isEditing.set(false);
    this.selectedUserId.set(null);
    this.userForm.reset({
      nombre: '',
      apellido: '',
      correo: '',
      telefono: '',
      contrasena: 'Fashion123*',
      rol: 'Cliente',
      estado: 'ACTIVO'
    });
    this.userForm.get('contrasena')?.setValidators([Validators.required, Validators.minLength(8)]);
    this.userForm.get('contrasena')?.updateValueAndValidity();
    this.isUserModalOpen.set(true);
  }

  openEditModal(user: User): void {
    this.isEditing.set(true);
    this.selectedUserId.set(user.id);
    this.userForm.patchValue({
      nombre: user.nombre,
      apellido: user.apellido,
      correo: user.correo,
      telefono: user.telefono || '',
      estado: user.estado
    });
    this.userForm.get('contrasena')?.clearValidators();
    this.userForm.get('contrasena')?.updateValueAndValidity();
    this.isUserModalOpen.set(true);
  }

  closeUserModal(): void {
    this.isUserModalOpen.set(false);
  }

  saveUser(): void {
    if (this.userForm.invalid || this.isSaving()) return;

    this.isSaving.set(true);
    const formVal = this.userForm.value;

    if (this.isEditing() && this.selectedUserId()) {
      const updateData: UserUpdateDto = {
        nombre: formVal.nombre,
        apellido: formVal.apellido,
        correo: formVal.correo,
        telefono: formVal.telefono,
        estado: formVal.estado
      };

      this.userApi.updateUser(this.selectedUserId()!, updateData).subscribe({
        next: () => {
          this.toast.success('Usuario actualizado correctamente.');
          this.isSaving.set(false);
          this.closeUserModal();
          this.loadUsers();
        },
        error: () => this.isSaving.set(false)
      });
    } else {
      const createData: UserCreateDto = {
        nombre: formVal.nombre,
        apellido: formVal.apellido,
        correo: formVal.correo,
        telefono: formVal.telefono,
        contrasena: formVal.contrasena,
        estado: 'ACTIVO'
      };

      this.userApi.createUser(createData, formVal.rol).subscribe({
        next: () => {
          this.toast.success('Usuario creado exitosamente.');
          this.isSaving.set(false);
          this.closeUserModal();
          this.loadUsers();
        },
        error: () => this.isSaving.set(false)
      });
    }
  }

  toggleUserStatus(user: User): void {
    const nextStatus = user.estado === 'ACTIVO' ? 'INACTIVO' : 'ACTIVO';
    this.userApi.updateUser(user.id, { estado: nextStatus }).subscribe({
      next: () => {
        this.toast.info(`Estado de usuario cambiado a ${nextStatus}`);
        this.loadUsers();
      }
    });
  }

  openRoleAssignModal(user: User): void {
    this.selectedUserForRole.set(user);
    this.isRoleModalOpen.set(true);
  }

  closeRoleModal(): void {
    this.isRoleModalOpen.set(false);
    this.selectedUserForRole.set(null);
  }

  assignRoleToUser(roleId: number): void {
    const user = this.selectedUserForRole();
    if (!user || !roleId) return;

    this.userApi.assignRole(user.id, roleId).subscribe({
      next: () => {
        this.toast.success('Rol asignado correctamente.');
        this.closeRoleModal();
        this.loadUsers();
      }
    });
  }
}
