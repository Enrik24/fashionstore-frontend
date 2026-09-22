import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { BranchApiService } from '../../../../core/services/branch-api.service';
import { ToastService } from '../../../../core/services/toast.service';
import { AlertService } from '../../../../core/services/alert.service';
import { Ciudad, Sucursal, SucursalCreateDto, SucursalUpdateDto, CiudadCreateDto, CiudadUpdateDto } from '../../../../core/models/branch.model';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { StatusBadgePipe } from '../../../../shared/pipes/status-badge.pipe';

@Component({
  selector: 'app-branches',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ModalComponent, StatusBadgePipe],
  template: `
    <div class="page-container animate-fade-in">
      <!-- Top Navigation Tabs -->
      <div class="tabs-header-card card">
        <div class="tabs-nav">
          <button 
            class="tab-btn" 
            [class.active]="activeTab() === 'sucursales'" 
            (click)="activeTab.set('sucursales')"
          >
            <i class="ri-store-3-line"></i> Sucursales ({{ branches().length }})
          </button>
          <button 
            class="tab-btn" 
            [class.active]="activeTab() === 'ciudades'" 
            (click)="activeTab.set('ciudades')"
          >
            <i class="ri-map-pin-2-line"></i> Ciudades ({{ cities().length }})
          </button>
        </div>

        <div class="tab-actions">
          @if (activeTab() === 'sucursales') {
            <button class="btn btn-accent" (click)="openCreateBranchModal()">
              <i class="ri-add-line"></i> Nueva Sucursal
            </button>
          } @else {
            <button class="btn btn-accent" (click)="openCreateCityModal()">
              <i class="ri-add-line"></i> Nueva Ciudad
            </button>
          }
        </div>
      </div>

      <!-- SUCURSALES TAB -->
      @if (activeTab() === 'sucursales') {
        <div class="card table-card">
          <div class="table-card-header">
            <div class="search-filter-row">
              <div class="search-box">
                <i class="ri-search-line"></i>
                <input 
                  type="text" 
                  class="form-control" 
                  placeholder="Buscar sucursal o dirección..."
                  [value]="branchSearchQuery()"
                  (input)="onBranchSearch($event)"
                />
              </div>

              <select class="form-control select-filter" [value]="selectedCityFilter()" (change)="onCityFilterChange($event)">
                <option value="">Todas las Ciudades</option>
                @for (city of cities(); track city.id) {
                  <option [value]="city.id">{{ city.nombre }}</option>
                }
              </select>
            </div>
            
            <button class="btn btn-secondary btn-sm" (click)="loadData()" [disabled]="isLoading()" title="Recargar">
              <i class="ri-refresh-line" [class.spin-icon]="isLoading()"></i>
            </button>
          </div>

          <div class="table-responsive">
            <table class="table-custom">
              <thead>
                <tr>
                  <th>Sucursal</th>
                  <th>Ciudad</th>
                  <th>Dirección</th>
                  <th>Teléfono</th>
                  <th>Horario de Atención</th>
                  <th>Estado</th>
                  <th class="text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                @if (isLoading()) {
                  <tr>
                    <td colspan="7" class="text-center py-8">
                      <i class="ri-loader-4-line spin-icon text-2xl text-accent"></i>
                      <p class="text-muted mt-2">Cargando sucursales...</p>
                    </td>
                  </tr>
                } @else if (filteredBranches().length === 0) {
                  <tr>
                    <td colspan="7" class="text-center py-8 text-muted">
                      <i class="ri-store-2-line text-3xl mb-2"></i>
                      <p>No se encontraron sucursales registradas.</p>
                    </td>
                  </tr>
                } @else {
                  @for (branch of filteredBranches(); track branch.id) {
                    <tr>
                      <td>
                        <div class="branch-cell">
                          <div class="branch-icon-box"><i class="ri-store-line"></i></div>
                          <strong>{{ branch.nombre }}</strong>
                        </div>
                      </td>
                      <td>
                        <span class="badge badge-primary">{{ branch.ciudad?.nombre || getCityName(branch.ciudad_id) }}</span>
                      </td>
                      <td>
                        <span class="text-sm">{{ branch.direccion }}</span>
                      </td>
                      <td>
                        <span class="text-sm font-medium">{{ branch.telefono }}</span>
                      </td>
                      <td>
                        <span class="text-xs text-muted">{{ branch.horario_atencion }}</span>
                      </td>
                      <td>
                        <span class="badge" [ngClass]="(branch.estado | statusBadge).class">
                          {{ (branch.estado | statusBadge).label }}
                        </span>
                      </td>
                      <td>
                        <div class="action-buttons-flex">
                          <button class="btn-action-icon" title="Editar Sucursal" (click)="openEditBranchModal(branch)">
                            <i class="ri-edit-line"></i>
                          </button>
                          <button 
                            class="btn-action-icon" 
                            [class.btn-action-danger]="branch.estado === 'ACTIVO'"
                            [class.btn-action-success]="branch.estado !== 'ACTIVO'"
                            [title]="branch.estado === 'ACTIVO' ? 'Desactivar Sucursal' : 'Activar Sucursal'" 
                            (click)="toggleBranchStatus(branch)"
                          >
                            <i [class]="branch.estado === 'ACTIVO' ? 'ri-close-circle-line' : 'ri-checkbox-circle-line'"></i>
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
      }

      <!-- CIUDADES TAB -->
      @if (activeTab() === 'ciudades') {
        <div class="card table-card">
          <div class="table-card-header">
            <div class="search-filter-row">
              <div class="search-box">
                <i class="ri-search-line"></i>
                <input 
                  type="text" 
                  class="form-control" 
                  placeholder="Buscar ciudad por nombre, país o código postal..."
                  [value]="citySearchQuery()"
                  (input)="onCitySearch($event)"
                />
              </div>
            </div>

            <button class="btn btn-secondary btn-sm" (click)="loadData()" [disabled]="isLoading()" title="Recargar">
              <i class="ri-refresh-line" [class.spin-icon]="isLoading()"></i>
            </button>
          </div>

          <div class="table-responsive">
            <table class="table-custom">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Nombre de Ciudad</th>
                  <th>País</th>
                  <th>Código Postal</th>
                  <th>Sucursales Asociadas</th>
                  <th class="text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                @if (isLoading()) {
                  <tr>
                    <td colspan="6" class="text-center py-8">
                      <i class="ri-loader-4-line spin-icon text-2xl text-accent"></i>
                      <p class="text-muted mt-2">Cargando ciudades...</p>
                    </td>
                  </tr>
                } @else if (filteredCities().length === 0) {
                  <tr>
                    <td colspan="6" class="text-center py-8 text-muted">
                      <i class="ri-map-pin-line text-3xl mb-2"></i>
                      <p>No se encontraron ciudades registradas.</p>
                    </td>
                  </tr>
                } @else {
                  @for (city of filteredCities(); track city.id) {
                    <tr>
                      <td><span class="text-muted text-xs">#{{ city.id }}</span></td>
                      <td>
                        <div class="branch-cell">
                          <div class="branch-icon-box"><i class="ri-map-pin-2-line"></i></div>
                          <strong>{{ city.nombre }}</strong>
                        </div>
                      </td>
                      <td>
                        <span class="badge badge-info">{{ city.pais || 'No especificado' }}</span>
                      </td>
                      <td>
                        <span class="text-sm font-mono text-muted">{{ city.codigo_postal || '—' }}</span>
                      </td>
                      <td>
                        <span class="badge badge-primary">{{ getBranchCountForCity(city.id) }} sucursal(es)</span>
                      </td>
                      <td>
                        <div class="action-buttons-flex">
                          <button class="btn-action-icon" title="Editar Ciudad" (click)="openEditCityModal(city)">
                            <i class="ri-edit-line"></i>
                          </button>
                          <button class="btn-action-icon btn-action-danger" title="Eliminar Ciudad" (click)="deleteCity(city.id)">
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
      }

      <!-- Branch Create/Edit Modal -->
      <app-modal
        [isOpen]="isBranchModalOpen()"
        [title]="isEditingBranch() ? 'Editar Sucursal' : 'Nueva Sucursal'"
        subtitle="Ingresa la información de ubicación y contacto de la sucursal"
        icon="ri-store-3-line"
        (closeEvent)="closeBranchModal()"
      >
        <form [formGroup]="branchForm" (ngSubmit)="saveBranch()" class="modal-form">
          <div class="grid grid-cols-2 form-row">
            <div class="form-group">
              <label class="form-label" for="b-nombre">Nombre de la Sucursal <span class="required">*</span></label>
              <input id="b-nombre" type="text" formControlName="nombre" class="form-control" placeholder="Ej. Sucursal Central">
            </div>

            <div class="form-group">
              <label class="form-label" for="b-ciudad">Ciudad <span class="required">*</span></label>
              <select id="b-ciudad" formControlName="ciudad_id" class="form-control">
                <option [value]="null" disabled>Seleccionar ciudad...</option>
                @for (city of cities(); track city.id) {
                  <option [value]="city.id">{{ city.nombre }}</option>
                }
              </select>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label" for="b-dir">Dirección Completa <span class="required">*</span></label>
            <input id="b-dir" type="text" formControlName="direccion" class="form-control" placeholder="Ej. Av. Monseñor Rivero #300">
          </div>

          <div class="grid grid-cols-2 form-row">
            <div class="form-group">
              <label class="form-label" for="b-tel">Teléfono / Celular <span class="required">*</span></label>
              <input id="b-tel" type="text" formControlName="telefono" class="form-control" placeholder="33123456">
            </div>

            <div class="form-group">
              <label class="form-label" for="b-horario">Horario de Atención <span class="required">*</span></label>
              <input id="b-horario" type="text" formControlName="horario_atencion" class="form-control" placeholder="09:00 - 21:00">
            </div>
          </div>

          <div class="form-group">
            <label class="form-label" for="b-estado">Estado de la Sucursal</label>
            <select id="b-estado" formControlName="estado" class="form-control">
              <option value="ACTIVO">ACTIVO</option>
              <option value="INACTIVO">INACTIVO</option>
            </select>
          </div>

          <div class="modal-actions-box">
            <button type="button" class="btn btn-outline" (click)="closeBranchModal()">Cancelar</button>
            <button type="submit" class="btn btn-accent" [disabled]="branchForm.invalid || isSaving()">
              {{ isEditingBranch() ? 'Guardar Cambios' : 'Registrar Sucursal' }}
            </button>
          </div>
        </form>
      </app-modal>

      <!-- City Create/Edit Modal -->
      <app-modal
        [isOpen]="isCityModalOpen()"
        [title]="isEditingCity() ? 'Editar Ciudad' : 'Nueva Ciudad'"
        subtitle="Registra o modifica la información geográfica de la ciudad"
        icon="ri-map-pin-2-line"
        (closeEvent)="closeCityModal()"
      >
        <form [formGroup]="cityForm" (ngSubmit)="saveCity()" class="modal-form">
          <div class="form-group">
            <label class="form-label" for="c-nombre">Nombre de la Ciudad <span class="required">*</span></label>
            <input id="c-nombre" type="text" formControlName="nombre" class="form-control" placeholder="Ej. Santa Cruz de la Sierra">
          </div>

          <div class="grid grid-cols-2 form-row">
            <div class="form-group">
              <label class="form-label" for="c-pais">País</label>
              <input id="c-pais" type="text" formControlName="pais" class="form-control" placeholder="Ej. Bolivia o Guatemala">
            </div>

            <div class="form-group">
              <label class="form-label" for="c-postal">Código Postal</label>
              <input id="c-postal" type="text" formControlName="codigo_postal" class="form-control" placeholder="Ej. 0000">
            </div>
          </div>

          <div class="modal-actions-box">
            <button type="button" class="btn btn-outline" (click)="closeCityModal()">Cancelar</button>
            <button type="submit" class="btn btn-accent" [disabled]="cityForm.invalid || isSaving()">
              {{ isEditingCity() ? 'Guardar Cambios' : 'Crear Ciudad' }}
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

    .tabs-header-card {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.75rem 1.25rem;
      flex-wrap: wrap;
      gap: 1rem;
    }

    .tabs-nav {
      display: flex;
      gap: 0.5rem;
    }

    .tab-btn {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.625rem 1.25rem;
      border-radius: var(--radius-md);
      border: 1px solid transparent;
      background: transparent;
      font-size: 0.9375rem;
      font-weight: 600;
      color: var(--secondary);
      cursor: pointer;
      transition: all var(--transition-fast);

      &:hover {
        background: #f1f5f9;
        color: var(--primary);
      }

      &.active {
        background: var(--primary);
        color: white;
      }
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
      gap: 1rem;
    }

    .search-filter-row {
      display: flex;
      gap: 1rem;
      flex: 1;
      max-width: 600px;
    }

    .search-box {
      position: relative;
      flex: 1;

      i {
        position: absolute;
        left: 1rem;
        top: 50%;
        transform: translateY(-50%);
        color: var(--text-muted);
      }

      input {
        padding-left: 2.75rem;
      }
    }

    .select-filter {
      width: 200px;
    }

    .branch-cell {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .branch-icon-box {
      width: 32px;
      height: 32px;
      border-radius: var(--radius-sm);
      background: rgba(15, 23, 42, 0.06);
      color: var(--primary);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.1rem;
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
export class BranchesComponent implements OnInit {
  private branchApi = inject(BranchApiService);
  private toast = inject(ToastService);
  private alertService = inject(AlertService);
  private fb = inject(FormBuilder);

  public activeTab = signal<'sucursales' | 'ciudades'>('sucursales');
  public branches = signal<Sucursal[]>([]);
  public cities = signal<Ciudad[]>([]);
  public isLoading = signal<boolean>(true);
  public isSaving = signal<boolean>(false);

  public branchSearchQuery = signal<string>('');
  public selectedCityFilter = signal<string>('');
  public citySearchQuery = signal<string>('');

  // Branch Modal
  public isBranchModalOpen = signal<boolean>(false);
  public isEditingBranch = signal<boolean>(false);
  public selectedBranchId = signal<number | null>(null);

  public branchForm: FormGroup = this.fb.group({
    nombre: ['', [Validators.required, Validators.minLength(2)]],
    ciudad_id: [null, [Validators.required]],
    direccion: ['', [Validators.required]],
    telefono: ['', [Validators.required]],
    horario_atencion: ['09:00 - 21:00', [Validators.required]],
    estado: ['ACTIVO']
  });

  // City Modal
  public isCityModalOpen = signal<boolean>(false);
  public isEditingCity = signal<boolean>(false);
  public selectedCityId = signal<number | null>(null);

  public cityForm: FormGroup = this.fb.group({
    nombre: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
    pais: ['Bolivia', [Validators.maxLength(100)]],
    codigo_postal: ['', [Validators.maxLength(20)]]
  });

  public filteredBranches = computed(() => {
    let list = this.branches();
    const query = this.branchSearchQuery().toLowerCase().trim();
    const cityFilter = this.selectedCityFilter();

    if (query) {
      list = list.filter(b => 
        b.nombre.toLowerCase().includes(query) || 
        b.direccion.toLowerCase().includes(query)
      );
    }

    if (cityFilter) {
      list = list.filter(b => b.ciudad_id === +cityFilter);
    }

    return list;
  });

  public filteredCities = computed(() => {
    let list = this.cities();
    const query = this.citySearchQuery().toLowerCase().trim();

    if (query) {
      list = list.filter(c => 
        c.nombre.toLowerCase().includes(query) || 
        (c.pais && c.pais.toLowerCase().includes(query)) ||
        (c.codigo_postal && c.codigo_postal.toLowerCase().includes(query))
      );
    }

    return list;
  });

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.isLoading.set(true);

    this.branchApi.getCities().subscribe({
      next: (cities) => this.cities.set(cities),
      error: () => {}
    });

    this.branchApi.getBranches(0, 100).subscribe({
      next: (branches) => {
        this.branches.set(branches);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }

  getCityName(cityId: number): string {
    const city = this.cities().find(c => c.id === cityId);
    return city ? city.nombre : `Ciudad #${cityId}`;
  }

  getBranchCountForCity(cityId: number): number {
    return this.branches().filter(b => b.ciudad_id === cityId).length;
  }

  onBranchSearch(event: Event): void {
    const val = (event.target as HTMLInputElement).value;
    this.branchSearchQuery.set(val);
  }

  onCitySearch(event: Event): void {
    const val = (event.target as HTMLInputElement).value;
    this.citySearchQuery.set(val);
  }

  onCityFilterChange(event: Event): void {
    const val = (event.target as HTMLSelectElement).value;
    this.selectedCityFilter.set(val);
  }

  // Branch CRUD
  openCreateBranchModal(): void {
    this.isEditingBranch.set(false);
    this.selectedBranchId.set(null);
    this.branchForm.reset({
      nombre: '',
      ciudad_id: this.cities().length > 0 ? this.cities()[0].id : null,
      direccion: '',
      telefono: '',
      horario_atencion: '09:00 - 21:00',
      estado: 'ACTIVO'
    });
    this.isBranchModalOpen.set(true);
  }

  openEditBranchModal(branch: Sucursal): void {
    this.isEditingBranch.set(true);
    this.selectedBranchId.set(branch.id);
    this.branchForm.patchValue({
      nombre: branch.nombre,
      ciudad_id: branch.ciudad_id,
      direccion: branch.direccion,
      telefono: branch.telefono,
      horario_atencion: branch.horario_atencion,
      estado: branch.estado
    });
    this.isBranchModalOpen.set(true);
  }

  closeBranchModal(): void {
    this.isBranchModalOpen.set(false);
  }

  saveBranch(): void {
    if (this.branchForm.invalid || this.isSaving()) return;

    this.isSaving.set(true);
    const formVal = this.branchForm.value;

    if (this.isEditingBranch() && this.selectedBranchId()) {
      const updateDto: SucursalUpdateDto = {
        nombre: formVal.nombre,
        ciudad_id: +formVal.ciudad_id,
        direccion: formVal.direccion,
        telefono: formVal.telefono,
        horario_atencion: formVal.horario_atencion,
        estado: formVal.estado
      };

      this.branchApi.updateBranch(this.selectedBranchId()!, updateDto).subscribe({
        next: () => {
          this.toast.success('Sucursal actualizada exitosamente.');
          this.isSaving.set(false);
          this.closeBranchModal();
          this.loadData();
        },
        error: () => this.isSaving.set(false)
      });
    } else {
      const createDto: SucursalCreateDto = {
        nombre: formVal.nombre,
        ciudad_id: +formVal.ciudad_id,
        direccion: formVal.direccion,
        telefono: formVal.telefono,
        horario_atencion: formVal.horario_atencion,
        estado: formVal.estado
      };

      this.branchApi.createBranch(createDto).subscribe({
        next: () => {
          this.toast.success('Sucursal creada exitosamente.');
          this.isSaving.set(false);
          this.closeBranchModal();
          this.loadData();
        },
        error: () => this.isSaving.set(false)
      });
    }
  }

  toggleBranchStatus(branch: Sucursal): void {
    const nextStatus = branch.estado === 'ACTIVO' ? 'INACTIVO' : 'ACTIVO';
    this.branchApi.updateBranch(branch.id, { estado: nextStatus }).subscribe({
      next: () => {
        this.toast.info(`Estado de sucursal cambiado a ${nextStatus}`);
        this.loadData();
      }
    });
  }

  // City CRUD
  openCreateCityModal(): void {
    this.isEditingCity.set(false);
    this.selectedCityId.set(null);
    this.cityForm.reset({ nombre: '', pais: 'Bolivia', codigo_postal: '' });
    this.isCityModalOpen.set(true);
  }

  openEditCityModal(city: Ciudad): void {
    this.isEditingCity.set(true);
    this.selectedCityId.set(city.id);
    this.cityForm.patchValue({
      nombre: city.nombre,
      pais: city.pais || 'Bolivia',
      codigo_postal: city.codigo_postal || ''
    });
    this.isCityModalOpen.set(true);
  }

  closeCityModal(): void {
    this.isCityModalOpen.set(false);
  }

  saveCity(): void {
    if (this.cityForm.invalid || this.isSaving()) return;

    this.isSaving.set(true);
    const formVal = this.cityForm.value;

    const payload: CiudadCreateDto = {
      nombre: formVal.nombre.trim(),
      pais: formVal.pais ? formVal.pais.trim() : undefined,
      codigo_postal: formVal.codigo_postal ? formVal.codigo_postal.trim() : undefined
    };

    if (this.isEditingCity() && this.selectedCityId()) {
      this.branchApi.updateCity(this.selectedCityId()!, payload).subscribe({
        next: () => {
          this.toast.success('Ciudad actualizada exitosamente.');
          this.isSaving.set(false);
          this.closeCityModal();
          this.loadData();
        },
        error: () => this.isSaving.set(false)
      });
    } else {
      this.branchApi.createCity(payload).subscribe({
        next: () => {
          this.toast.success('Ciudad creada exitosamente.');
          this.isSaving.set(false);
          this.closeCityModal();
          this.loadData();
        },
        error: () => this.isSaving.set(false)
      });
    }
  }

  async deleteCity(cityId: number): Promise<void> {
    const confirmed = await this.alertService.deleteConfirm(
      '¿Eliminar ciudad?',
      '¿Estás seguro de eliminar esta ciudad? Si tiene sucursales asociadas no podrá ser eliminada.'
    );
    if (confirmed) {
      this.branchApi.deleteCity(cityId).subscribe({
        next: () => {
          this.toast.info('Ciudad eliminada.');
          this.loadData();
        },
        error: (err) => {
          const detail = err?.error?.detail || 'No se pudo eliminar la ciudad.';
          this.toast.error(detail);
        }
      });
    }
  }
}
