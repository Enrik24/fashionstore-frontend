import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { SupplierApiService } from '../../../../core/services/supplier-api.service';
import { ToastService } from '../../../../core/services/toast.service';
import { AlertService } from '../../../../core/services/alert.service';
import { Proveedor, ProveedorCreateDto, ProveedorUpdateDto } from '../../../../core/models/supplier.model';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';

@Component({
  selector: 'app-suppliers',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, ModalComponent],
  template: `
    <div class="page-container animate-fade-in">
      <!-- Toolbar -->
      <div class="toolbar-card card">
        <div class="toolbar-left">
          <div class="search-input-box">
            <i class="ri-search-line search-icon"></i>
            <input 
              type="text" 
              class="form-control with-icon" 
              placeholder="Buscar proveedor por nombre o NIT..."
              [value]="searchQuery()"
              (input)="onSearchChange($event)"
            />
          </div>
        </div>

        <div class="toolbar-right">
          <button class="btn btn-accent" (click)="openCreateSupplierModal()">
            <i class="ri-truck-line"></i> Nuevo Proveedor
          </button>
        </div>
      </div>

      <!-- Suppliers Table -->
      <div class="card table-card">
        <div class="table-card-header">
          <div class="header-count">
            <h3 class="table-title">Proveedores de Confección & Textiles (CU08)</h3>
            <span class="count-badge">{{ filteredSuppliers().length }} proveedores</span>
          </div>
          <button class="btn btn-secondary btn-sm" (click)="loadSuppliers()" [disabled]="isLoading()">
            <i class="ri-refresh-line" [class.spin-icon]="isLoading()"></i> Actualizar
          </button>
        </div>

        <div class="table-responsive">
          <table class="table-custom">
            <thead>
              <tr>
                <th>Proveedor</th>
                <th>NIT</th>
                <th>Persona de Contacto</th>
                <th>Teléfono</th>
                <th>Correo Electrónico</th>
                <th>Dirección</th>
                <th class="text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              @if (isLoading()) {
                <tr>
                  <td colspan="7" class="text-center py-8">
                    <i class="ri-loader-4-line spin-icon text-2xl text-accent"></i>
                    <p class="text-muted mt-2">Cargando proveedores...</p>
                  </td>
                </tr>
              } @else if (filteredSuppliers().length === 0) {
                <tr>
                  <td colspan="7" class="text-center py-8 text-muted">
                    <i class="ri-truck-line text-3xl mb-2"></i>
                    <p>No se encontraron proveedores registrados.</p>
                  </td>
                </tr>
              } @else {
                @for (supplier of filteredSuppliers(); track supplier.id) {
                  <tr>
                    <td>
                      <div class="supplier-cell">
                        <div class="supplier-icon-box"><i class="ri-building-4-line"></i></div>
                        <strong>{{ supplier.nombre }}</strong>
                      </div>
                    </td>
                    <td>
                      <span class="nit-badge">{{ supplier.nit }}</span>
                    </td>
                    <td>
                      <span class="text-sm">{{ supplier.contacto }}</span>
                    </td>
                    <td>
                      <span class="text-sm font-medium">{{ supplier.telefono }}</span>
                    </td>
                    <td>
                      <span class="text-xs text-muted">{{ supplier.correo }}</span>
                    </td>
                    <td>
                      <span class="text-xs text-muted">{{ supplier.direccion || 'No especificada' }}</span>
                    </td>
                    <td>
                      <div class="action-buttons-flex">
                        <a class="btn-action-icon" title="Historial de recepciones" [routerLink]="['/admin/receptions']" [queryParams]="{proveedorId: supplier.id}">
                          <i class="ri-file-list-3-line"></i>
                        </a>
                        <button class="btn-action-icon" title="Editar Proveedor" (click)="openEditSupplierModal(supplier)">
                          <i class="ri-edit-line"></i>
                        </button>
                        <button class="btn-action-icon btn-action-danger" title="Eliminar Proveedor" (click)="deleteSupplier(supplier.id)">
                          <i class="ri-delete-bin-line"></i>
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

      <!-- Create / Edit Supplier Modal -->
      <app-modal
        [isOpen]="isSupplierModalOpen()"
        [title]="isEditingSupplier() ? 'Editar Proveedor' : 'Nuevo Proveedor'"
        subtitle="Registra información de empresas textiles y fabricantes aliados"
        icon="ri-truck-line"
        (closeEvent)="closeSupplierModal()"
      >
        <form [formGroup]="supplierForm" (ngSubmit)="saveSupplier()" class="modal-form">
          <div class="grid grid-cols-2 form-row">
            <div class="form-group">
              <label class="form-label" for="s-nombre">Razón Social / Nombre <span class="required">*</span></label>
              <input id="s-nombre" type="text" formControlName="nombre" class="form-control" placeholder="Ej. Textiles Bolivia S.A.">
            </div>

            <div class="form-group">
              <label class="form-label" for="s-nit">NIT <span class="required">*</span></label>
              <input id="s-nit" type="text" formControlName="nit" class="form-control" placeholder="Ej. 1029384756">
            </div>
          </div>

          <div class="grid grid-cols-2 form-row">
            <div class="form-group">
              <label class="form-label" for="s-contacto">Persona de Contacto <span class="required">*</span></label>
              <input id="s-contacto" type="text" formControlName="contacto" class="form-control" placeholder="Ej. Lic. Fernando Rojas">
            </div>

            <div class="form-group">
              <label class="form-label" for="s-telefono">Teléfono / Celular <span class="required">*</span></label>
              <input id="s-telefono" type="text" formControlName="telefono" class="form-control" placeholder="+591 4 4123456">
            </div>
          </div>

          <div class="form-group">
            <label class="form-label" for="s-correo">Correo Electrónico <span class="required">*</span></label>
            <input id="s-correo" type="email" formControlName="correo" class="form-control" placeholder="ventas@textilesbolivia.com">
          </div>

          <div class="form-group">
            <label class="form-label" for="s-dir">Dirección</label>
            <input id="s-dir" type="text" formControlName="direccion" class="form-control" placeholder="Parque Industrial Mza 12, Cochabamba">
          </div>

          <div class="modal-actions-box">
            <button type="button" class="btn btn-outline" (click)="closeSupplierModal()">Cancelar</button>
            <button type="submit" class="btn btn-accent" [disabled]="supplierForm.invalid || isSaving()">
              {{ isEditingSupplier() ? 'Guardar Cambios' : 'Registrar Proveedor' }}
            </button>
          </div>
        </form>
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
      min-width: 300px;
    }

    .search-icon {
      position: absolute;
      left: 1rem;
      top: 50%;
      transform: translateY(-50%);
      color: var(--text-muted);
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

    .supplier-cell {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .supplier-icon-box {
      width: 34px;
      height: 34px;
      border-radius: var(--radius-sm);
      background: rgba(15, 23, 42, 0.06);
      color: var(--primary);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.15rem;
    }

    .nit-badge {
      font-family: monospace;
      font-weight: 700;
      background: #f1f5f9;
      padding: 0.2rem 0.5rem;
      border-radius: var(--radius-sm);
      font-size: 0.8125rem;
      color: var(--secondary);
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
export class SuppliersComponent implements OnInit {
  private supplierApi = inject(SupplierApiService);
  private toast = inject(ToastService);
  private alertService = inject(AlertService);
  private fb = inject(FormBuilder);

  public suppliers = signal<Proveedor[]>([]);
  public isLoading = signal<boolean>(true);
  public isSaving = signal<boolean>(false);
  public searchQuery = signal<string>('');

  // Modal
  public isSupplierModalOpen = signal<boolean>(false);
  public isEditingSupplier = signal<boolean>(false);
  public selectedSupplierId = signal<number | null>(null);

  public supplierForm: FormGroup = this.fb.group({
    nombre: ['', [Validators.required, Validators.minLength(2)]],
    nit: ['', [Validators.required, Validators.minLength(4)]],
    contacto: ['', [Validators.required]],
    telefono: ['', [Validators.required]],
    correo: ['', [Validators.required, Validators.email]],
    direccion: ['']
  });

  public filteredSuppliers = computed(() => {
    let list = this.suppliers();
    const query = this.searchQuery().toLowerCase().trim();

    if (query) {
      list = list.filter(s => 
        s.nombre.toLowerCase().includes(query) || 
        s.nit.toLowerCase().includes(query) ||
        s.contacto.toLowerCase().includes(query)
      );
    }

    return list;
  });

  ngOnInit(): void {
    this.loadSuppliers();
  }

  loadSuppliers(): void {
    this.isLoading.set(true);
    this.supplierApi.getSuppliers(0, 100).subscribe({
      next: (suppliers) => {
        this.suppliers.set(suppliers);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }

  onSearchChange(event: Event): void {
    const val = (event.target as HTMLInputElement).value;
    this.searchQuery.set(val);
  }

  openCreateSupplierModal(): void {
    this.isEditingSupplier.set(false);
    this.selectedSupplierId.set(null);
    this.supplierForm.reset({
      nombre: '',
      nit: '',
      contacto: '',
      telefono: '',
      correo: '',
      direccion: ''
    });
    this.isSupplierModalOpen.set(true);
  }

  openEditSupplierModal(supplier: Proveedor): void {
    this.isEditingSupplier.set(true);
    this.selectedSupplierId.set(supplier.id);
    this.supplierForm.patchValue({
      nombre: supplier.nombre,
      nit: supplier.nit,
      contacto: supplier.contacto,
      telefono: supplier.telefono,
      correo: supplier.correo,
      direccion: supplier.direccion || ''
    });
    this.isSupplierModalOpen.set(true);
  }

  closeSupplierModal(): void {
    this.isSupplierModalOpen.set(false);
  }

  saveSupplier(): void {
    if (this.supplierForm.invalid || this.isSaving()) return;

    this.isSaving.set(true);
    const formVal = this.supplierForm.value;

    if (this.isEditingSupplier() && this.selectedSupplierId()) {
      const updateDto: ProveedorUpdateDto = formVal;
      this.supplierApi.updateSupplier(this.selectedSupplierId()!, updateDto).subscribe({
        next: () => {
          this.toast.success('Proveedor actualizado exitosamente.');
          this.isSaving.set(false);
          this.closeSupplierModal();
          this.loadSuppliers();
        },
        error: () => this.isSaving.set(false)
      });
    } else {
      const createDto: ProveedorCreateDto = formVal;
      this.supplierApi.createSupplier(createDto).subscribe({
        next: () => {
          this.toast.success('Proveedor registrado exitosamente.');
          this.isSaving.set(false);
          this.closeSupplierModal();
          this.loadSuppliers();
        },
        error: () => this.isSaving.set(false)
      });
    }
  }

  async deleteSupplier(id: number): Promise<void> {
    const confirmed = await this.alertService.deleteConfirm(
      '¿Eliminar proveedor?',
      '¿Estás seguro de que deseas eliminar este proveedor?'
    );
    if (confirmed) {
      this.supplierApi.deleteSupplier(id).subscribe({
        next: () => {
          this.toast.info('Proveedor eliminado correctamente.');
          this.loadSuppliers();
        }
      });
    }
  }
}
