import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RoleApiService } from '../../../../core/services/role-api.service';
import { ToastService } from '../../../../core/services/toast.service';
import { Rol, Permiso, RolCreateDto, RolUpdateDto } from '../../../../core/models/role.model';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';

@Component({
  selector: 'app-roles',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ModalComponent],
  template: `
    <div class="page-container animate-fade-in">
      <!-- Toolbar -->
      <div class="toolbar-card card">
        <div class="toolbar-left">
          <h3 class="page-title"><i class="ri-key-2-line text-accent"></i> Gestión de Roles y Permisos (CU04)</h3>
          <p class="text-muted text-sm">Define políticas de control de acceso basadas en roles (RBAC) y asigna permisos por módulos.</p>
        </div>
        <div class="toolbar-right">
          <button class="btn btn-accent" (click)="openCreateRoleModal()">
            <i class="ri-add-line"></i> Crear Nuevo Rol
          </button>
        </div>
      </div>

      <!-- Roles Grid / Cards -->
      <div class="grid grid-cols-3 roles-grid">
        @if (isLoading()) {
          <div class="col-span-3 text-center py-12 card">
            <i class="ri-loader-4-line spin-icon text-2xl text-accent"></i>
            <p class="text-muted mt-2">Cargando roles y permisos...</p>
          </div>
        } @else {
          @for (role of roles(); track role.id) {
            <div class="role-card card card-hover">
              <div class="role-card-top">
                <div class="role-icon-box">
                  <i class="ri-shield-user-line"></i>
                </div>
                <div class="role-card-header">
                  <h4 class="role-name">{{ role.nombre }}</h4>
                </div>
              </div>

              <p class="role-description">{{ role.descripcion || 'Sin descripción asignada para este rol.' }}</p>

              <div class="role-perms-summary">
                <div class="perms-count">
                  <i class="ri-lock-unlock-line text-accent"></i>
                  <span>{{ role.permisos?.length || 0 }} permisos asignados</span>
                </div>
              </div>

              <div class="role-card-actions">
                <button class="btn btn-primary btn-sm flex-1" (click)="openPermissionsMatrixModal(role)">
                  <i class="ri-shield-keyhole-line"></i> Configurar Permisos
                </button>
                <button class="btn btn-outline btn-sm btn-icon" title="Editar Rol" (click)="openEditRoleModal(role)">
                  <i class="ri-edit-line"></i>
                </button>
              </div>
            </div>
          }
        }
      </div>

      <!-- Create / Edit Role Modal -->
      <app-modal
        [isOpen]="isRoleModalOpen()"
        [title]="isEditingRole() ? 'Editar Rol' : 'Crear Nuevo Rol'"
        subtitle="Ingresa el nombre y descripción del rol para el sistema"
        icon="ri-key-2-line"
        (closeEvent)="closeRoleModal()"
      >
        <form [formGroup]="roleForm" (ngSubmit)="saveRole()" class="modal-form">
          <div class="form-group">
            <label class="form-label" for="r-nombre">Nombre del Rol <span class="required">*</span></label>
            <input id="r-nombre" type="text" formControlName="nombre" class="form-control" placeholder="Ej. Supervisor de Tienda">
          </div>

          <div class="form-group">
            <label class="form-label" for="r-desc">Descripción</label>
            <textarea id="r-desc" rows="3" formControlName="descripcion" class="form-control" placeholder="Describe las responsabilidades del rol..."></textarea>
          </div>

          <div class="modal-actions-box">
            <button type="button" class="btn btn-outline" (click)="closeRoleModal()">Cancelar</button>
            <button type="submit" class="btn btn-accent" [disabled]="roleForm.invalid || isSaving()">
              {{ isEditingRole() ? 'Guardar Cambios' : 'Crear Rol' }}
            </button>
          </div>
        </form>
      </app-modal>

      <!-- Permissions Matrix Modal -->
      <app-modal
        [isOpen]="isMatrixModalOpen()"
        [title]="'Matriz de Permisos: ' + (activeRoleForMatrix()?.nombre || '')"
        subtitle="Marca o desmarca los permisos que deseas autorizar para este rol"
        icon="ri-shield-keyhole-line"
        maxWidth="750px"
        (closeEvent)="closeMatrixModal()"
      >
        @if (activeRoleForMatrix()) {
          <div class="permissions-matrix-container">
            <div class="matrix-header-bar">
              <span class="text-sm font-semibold">Seleccionados: {{ selectedPermissionIds().length }} de {{ allPermissions().length }} permisos</span>
              <div class="matrix-quick-btns">
                <button type="button" class="btn btn-secondary btn-sm" (click)="selectAllPermissions()">Seleccionar Todos</button>
                <button type="button" class="btn btn-outline btn-sm" (click)="deselectAllPermissions()">Desmarcar Todos</button>
              </div>
            </div>

            <!-- Group permissions by Module if available or display checklist -->
            <div class="permissions-grid">
              @for (perm of allPermissions(); track perm.id) {
                <label class="permission-item" [class.selected]="isPermissionSelected(perm.id)">
                  <input 
                    type="checkbox" 
                    [checked]="isPermissionSelected(perm.id)"
                    (change)="togglePermission(perm.id)"
                  />
                  <div class="perm-info">
                    <span class="perm-name">{{ perm.nombre }}</span>
                    <span class="perm-desc">{{ perm.descripcion || 'Acción permitida en el sistema' }}</span>
                  </div>
                </label>
              }
            </div>

            <div class="modal-actions-box mt-6">
              <button type="button" class="btn btn-outline" (click)="closeMatrixModal()">Cancelar</button>
              <button type="button" class="btn btn-accent" (click)="savePermissionsMatrix()" [disabled]="isSaving()">
                @if (isSaving()) {
                  <i class="ri-loader-4-line spin-icon"></i> Guardando Matriz...
                } @else {
                  <i class="ri-save-line"></i> Guardar Políticas de Acceso
                }
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

    .page-title {
      font-size: 1.2rem;
      font-weight: 700;
      color: var(--primary);
      margin-bottom: 0.2rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .roles-grid {
      gap: 1.5rem;
    }

    .role-card {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      padding: 1.5rem;
      justify-content: space-between;
    }

    .role-card-top {
      display: flex;
      align-items: center;
      gap: 0.875rem;
    }

    .role-icon-box {
      width: 44px;
      height: 44px;
      border-radius: var(--radius-md);
      background: rgba(225, 29, 72, 0.1);
      color: var(--accent);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.35rem;
      flex-shrink: 0;
    }

    .role-card-header {
      display: flex;
      flex-direction: column;
    }

    .role-name {
      font-size: 1.1rem;
      font-weight: 700;
      color: var(--primary);
      margin: 0;
    }

    .role-description {
      font-size: 0.875rem;
      color: var(--text-muted);
      line-height: 1.5;
      min-height: 40px;
    }

    .role-perms-summary {
      padding: 0.75rem;
      border-radius: var(--radius-sm);
      background: #f8fafc;
      border: 1px solid var(--border-light);
    }

    .perms-count {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.8125rem;
      font-weight: 600;
      color: var(--secondary);
    }

    .role-card-actions {
      display: flex;
      gap: 0.5rem;
      margin-top: 0.5rem;
    }

    .permissions-matrix-container {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .matrix-header-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding-bottom: 0.75rem;
      border-bottom: 1px solid var(--border-light);
    }

    .matrix-quick-btns {
      display: flex;
      gap: 0.5rem;
    }

    .permissions-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 0.75rem;
      max-height: 380px;
      overflow-y: auto;
      padding: 0.25rem;
    }

    .permission-item {
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
      padding: 0.75rem;
      border-radius: var(--radius-md);
      background: #f8fafc;
      border: 1.5px solid var(--border-color);
      cursor: pointer;
      transition: all var(--transition-fast);

      &:hover {
        background: #f1f5f9;
        border-color: #cbd5e1;
      }

      &.selected {
        background: rgba(225, 29, 72, 0.04);
        border-color: var(--accent);
      }

      input[type="checkbox"] {
        margin-top: 3px;
        accent-color: var(--accent);
        width: 16px;
        height: 16px;
      }
    }

    .perm-info {
      display: flex;
      flex-direction: column;
    }

    .perm-name {
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--primary);
    }

    .perm-desc {
      font-size: 0.75rem;
      color: var(--text-muted);
    }

    .modal-actions-box {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 0.75rem;
      padding-top: 1rem;
      border-top: 1px solid var(--border-light);
    }

    .spin-icon {
      animation: spin 1s linear infinite;
    }

    @media (max-width: 992px) {
      .roles-grid {
        grid-template-columns: repeat(2, 1fr);
      }
      .permissions-grid {
        grid-template-columns: 1fr;
      }
    }

    @media (max-width: 600px) {
      .roles-grid {
        grid-template-columns: 1fr;
      }
    }

    @keyframes spin {
      100% { transform: rotate(360deg); }
    }
  `]
})
export class RolesComponent implements OnInit {
  private roleApi = inject(RoleApiService);
  private toast = inject(ToastService);
  private fb = inject(FormBuilder);

  public roles = signal<Rol[]>([]);
  public allPermissions = signal<Permiso[]>([]);
  public isLoading = signal<boolean>(true);
  public isSaving = signal<boolean>(false);

  // Role Form Modal
  public isRoleModalOpen = signal<boolean>(false);
  public isEditingRole = signal<boolean>(false);
  public selectedRoleId = signal<number | null>(null);

  public roleForm: FormGroup = this.fb.group({
    nombre: ['', [Validators.required, Validators.minLength(2)]],
    descripcion: ['']
  });

  // Matrix Modal
  public isMatrixModalOpen = signal<boolean>(false);
  public activeRoleForMatrix = signal<Rol | null>(null);
  public selectedPermissionIds = signal<number[]>([]);

  ngOnInit(): void {
    this.loadRolesAndPermissions();
  }

  loadRolesAndPermissions(): void {
    this.isLoading.set(true);

    this.roleApi.getRoles().subscribe({
      next: (roles) => {
        this.roles.set(roles);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });

    this.roleApi.getPermissions().subscribe({
      next: (perms) => this.allPermissions.set(perms),
      error: () => {}
    });
  }

  openCreateRoleModal(): void {
    this.isEditingRole.set(false);
    this.selectedRoleId.set(null);
    this.roleForm.reset({ nombre: '', descripcion: '' });
    this.isRoleModalOpen.set(true);
  }

  openEditRoleModal(role: Rol): void {
    this.isEditingRole.set(true);
    this.selectedRoleId.set(role.id);
    this.roleForm.patchValue({
      nombre: role.nombre,
      descripcion: role.descripcion || ''
    });
    this.isRoleModalOpen.set(true);
  }

  closeRoleModal(): void {
    this.isRoleModalOpen.set(false);
  }

  saveRole(): void {
    if (this.roleForm.invalid || this.isSaving()) return;

    this.isSaving.set(true);
    const formVal = this.roleForm.value;

    if (this.isEditingRole() && this.selectedRoleId()) {
      this.roleApi.updateRole(this.selectedRoleId()!, formVal).subscribe({
        next: () => {
          this.toast.success('Rol actualizado con éxito.');
          this.isSaving.set(false);
          this.closeRoleModal();
          this.loadRolesAndPermissions();
        },
        error: () => this.isSaving.set(false)
      });
    } else {
      this.roleApi.createRole(formVal).subscribe({
        next: () => {
          this.toast.success('Rol creado exitosamente.');
          this.isSaving.set(false);
          this.closeRoleModal();
          this.loadRolesAndPermissions();
        },
        error: () => this.isSaving.set(false)
      });
    }
  }

  openPermissionsMatrixModal(role: Rol): void {
    this.activeRoleForMatrix.set(role);
    // Fetch full role with permissions
    this.roleApi.getRole(role.id).subscribe({
      next: (fullRole) => {
        const assignedIds = fullRole.permisos ? fullRole.permisos.map(p => p.id) : [];
        this.selectedPermissionIds.set(assignedIds);
        this.isMatrixModalOpen.set(true);
      },
      error: () => {
        this.selectedPermissionIds.set([]);
        this.isMatrixModalOpen.set(true);
      }
    });
  }

  closeMatrixModal(): void {
    this.isMatrixModalOpen.set(false);
    this.activeRoleForMatrix.set(null);
  }

  isPermissionSelected(permId: number): boolean {
    return this.selectedPermissionIds().includes(permId);
  }

  togglePermission(permId: number): void {
    this.selectedPermissionIds.update(ids => {
      if (ids.includes(permId)) {
        return ids.filter(id => id !== permId);
      } else {
        return [...ids, permId];
      }
    });
  }

  selectAllPermissions(): void {
    this.selectedPermissionIds.set(this.allPermissions().map(p => p.id));
  }

  deselectAllPermissions(): void {
    this.selectedPermissionIds.set([]);
  }

  savePermissionsMatrix(): void {
    const role = this.activeRoleForMatrix();
    if (!role || this.isSaving()) return;

    this.isSaving.set(true);
    const permIds = this.selectedPermissionIds();

    this.roleApi.assignPermissions(role.id, permIds).subscribe({
      next: () => {
        this.toast.success(`Matriz de permisos actualizada para el rol ${role.nombre}.`);
        this.isSaving.set(false);
        this.closeMatrixModal();
        this.loadRolesAndPermissions();
      },
      error: () => this.isSaving.set(false)
    });
  }
}
