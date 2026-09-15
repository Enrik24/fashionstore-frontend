import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CatalogApiService, TallaCreateDto, ColorCreateDto, TemporadaCreateDto } from '../../../../core/services/catalog-api.service';
import { ToastService } from '../../../../core/services/toast.service';
import { Talla, Color, Temporada, Categoria, CategoriaCreateDto, Coleccion, ColeccionCreateDto } from '../../../../core/models/catalog.model';

type ActiveTab = 'tallas' | 'colores' | 'temporadas' | 'categorias' | 'colecciones';

@Component({
  selector: 'app-product-attributes',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="page-container animate-fade-in">

      <div class="page-header-card card">
        <div class="page-header-info">
          <div class="page-header-icon">
            <i class="ri-price-tag-3-line"></i>
          </div>
          <div>
            <h1 class="page-title">Características de Producto</h1>
            <p class="page-subtitle">Gestiona las tallas, colores, temporadas, categorías y colecciones disponibles para las prendas.</p>
          </div>
        </div>
      </div>

      <div class="attr-tabs-container card">
        <div class="attr-tabs">
          <button class="attr-tab" [class.active]="activeTab() === 'tallas'" (click)="setTab('tallas')">
            <i class="ri-ruler-2-line"></i>
            <span>Tallas</span>
            <span class="tab-count">{{ sizes().length }}</span>
          </button>
          <button class="attr-tab" [class.active]="activeTab() === 'colores'" (click)="setTab('colores')">
            <i class="ri-palette-line"></i>
            <span>Colores</span>
            <span class="tab-count">{{ colors().length }}</span>
          </button>
          <button class="attr-tab" [class.active]="activeTab() === 'temporadas'" (click)="setTab('temporadas')">
            <i class="ri-sun-line"></i>
            <span>Temporadas</span>
            <span class="tab-count">{{ seasons().length }}</span>
          </button>
          <button class="attr-tab" [class.active]="activeTab() === 'categorias'" (click)="setTab('categorias')">
            <i class="ri-folder-open-line"></i>
            <span>Categorías</span>
            <span class="tab-count">{{ categories().length }}</span>
          </button>
          <button class="attr-tab" [class.active]="activeTab() === 'colecciones'" (click)="setTab('colecciones')">
            <i class="ri-bookmark-3-line"></i>
            <span>Colecciones</span>
            <span class="tab-count">{{ collections().length }}</span>
          </button>
        </div>
      </div>

      <div class="attr-content-grid">

        <!-- === TALLAS === -->
        @if (activeTab() === 'tallas') {
          <div class="attr-panel card animate-fade-in">
            <div class="attr-panel-header">
              <h2><i class="ri-ruler-2-line"></i> Tallas registradas</h2>
            </div>
            <form [formGroup]="tallaForm" (ngSubmit)="saveTalla()" class="attr-form">
              <div class="form-row-inline">
                <div class="form-group-inline" style="max-width:140px">
                  <label class="form-label">Valor (Talla) <span class="required">*</span></label>
                  <input type="text" class="form-control" formControlName="valor" placeholder="Ej: XL, 42, M..."/>
                </div>
                <div class="form-group-inline">
                  <label class="form-label">Tipo</label>
                  <select class="form-control" formControlName="tipo">
                    <option value="">— Sin tipo —</option>
                    <option value="ropa">Ropa / Prendas</option>
                    <option value="calzado">Calzado</option>
                    <option value="accesorios">Accesorios</option>
                    <option value="SUPERIOR">Superior</option>
                    <option value="INFERIOR">Inferior</option>
                  </select>
                </div>
                <div class="form-group-inline">
                  <label class="form-label">Descripción</label>
                  <input type="text" class="form-control" formControlName="descripcion" placeholder="Opcional..."/>
                </div>
                <button type="submit" class="btn btn-accent btn-add" [disabled]="tallaForm.invalid || isSaving()">
                  @if (isSaving()) { <i class="ri-loader-4-line spin"></i> }
                  @else { <i class="ri-add-line"></i> }
                  Agregar Talla
                </button>
              </div>
            </form>
            <div class="attr-list">
              @if (isLoading()) {
                <div class="attr-loading"><i class="ri-loader-4-line spin"></i> Cargando...</div>
              }
              @for (item of sizes(); track item.id) {
                <div class="attr-item">
                  <div class="attr-item-left">
                    <span class="attr-badge talla-badge">{{ item.valor || item.nombre }}</span>
                    @if (item.tipo) { <span class="attr-type">{{ item.tipo }}</span> }
                    @if (item.descripcion) { <span class="attr-desc">{{ item.descripcion }}</span> }
                  </div>
                  <span class="attr-id">#{{ item.id }}</span>
                </div>
              }
              @empty {
                <div class="attr-empty"><i class="ri-inbox-2-line"></i> No hay tallas registradas.</div>
              }
            </div>
          </div>
        }

        <!-- === COLORES === -->
        @if (activeTab() === 'colores') {
          <div class="attr-panel card animate-fade-in">
            <div class="attr-panel-header">
              <h2><i class="ri-palette-line"></i> Colores registrados</h2>
            </div>
            <form [formGroup]="colorForm" (ngSubmit)="saveColor()" class="attr-form">
              <div class="form-row-inline">
                <div class="form-group-inline">
                  <label class="form-label">Nombre del Color <span class="required">*</span></label>
                  <input type="text" class="form-control" formControlName="nombre" placeholder="Ej: Azul Marino, Rojo Carmín..."/>
                </div>
                <div class="form-group-inline" style="max-width:200px">
                  <label class="form-label">Código Hex</label>
                  <div class="hex-input-wrapper">
                    <input type="color" class="color-picker" formControlName="codigo_hex"/>
                    <input type="text" class="form-control hex-text" formControlName="codigo_hex" placeholder="#000000"/>
                  </div>
                </div>
                <button type="submit" class="btn btn-accent btn-add" [disabled]="colorForm.invalid || isSaving()">
                  @if (isSaving()) { <i class="ri-loader-4-line spin"></i> }
                  @else { <i class="ri-add-line"></i> }
                  Agregar Color
                </button>
              </div>
            </form>
            <div class="attr-list">
              @if (isLoading()) {
                <div class="attr-loading"><i class="ri-loader-4-line spin"></i> Cargando...</div>
              }
              @for (item of colors(); track item.id) {
                <div class="attr-item">
                  <div class="attr-item-left">
                    @if (item.codigo_hex) { <span class="color-swatch" [style.background]="item.codigo_hex"></span> }
                    <span class="attr-badge color-badge">{{ item.nombre }}</span>
                    @if (item.codigo_hex) { <code class="attr-hex">{{ item.codigo_hex }}</code> }
                  </div>
                  <span class="attr-id">#{{ item.id }}</span>
                </div>
              }
              @empty {
                <div class="attr-empty"><i class="ri-inbox-2-line"></i> No hay colores registrados.</div>
              }
            </div>
          </div>
        }

        <!-- === TEMPORADAS === -->
        @if (activeTab() === 'temporadas') {
          <div class="attr-panel card animate-fade-in">
            <div class="attr-panel-header">
              <h2><i class="ri-sun-line"></i> Temporadas registradas</h2>
            </div>
            <form [formGroup]="seasonForm" (ngSubmit)="saveSeason()" class="attr-form">
              <div class="form-row-inline">
                <div class="form-group-inline">
                  <label class="form-label">Nombre de Temporada <span class="required">*</span></label>
                  <input type="text" class="form-control" formControlName="nombre" placeholder="Ej: Verano 2026, Otoño-Invierno..."/>
                </div>
                <div class="form-group-inline" style="max-width:160px">
                  <label class="form-label">Fecha Inicio <span class="required">*</span></label>
                  <input type="date" class="form-control" formControlName="fecha_inicio"/>
                </div>
                <div class="form-group-inline" style="max-width:160px">
                  <label class="form-label">Fecha Fin <span class="required">*</span></label>
                  <input type="date" class="form-control" formControlName="fecha_fin"/>
                </div>
                <div class="form-group-inline">
                  <label class="form-label">Descripción</label>
                  <input type="text" class="form-control" formControlName="descripcion" placeholder="Descripción opcional..."/>
                </div>
                <button type="submit" class="btn btn-accent btn-add" [disabled]="seasonForm.invalid || isSaving()">
                  @if (isSaving()) { <i class="ri-loader-4-line spin"></i> }
                  @else { <i class="ri-add-line"></i> }
                  Agregar Temporada
                </button>
              </div>
            </form>
            <div class="attr-list">
              @if (isLoading()) {
                <div class="attr-loading"><i class="ri-loader-4-line spin"></i> Cargando...</div>
              }
              @for (item of seasons(); track item.id) {
                <div class="attr-item">
                  <div class="attr-item-left">
                    <i class="ri-sun-cloudy-line attr-icon season-icon"></i>
                    <span class="attr-badge season-badge">{{ item.nombre }}</span>
                    @if (item.fecha_inicio && item.fecha_fin) {
                      <span class="attr-type"><i class="ri-calendar-line"></i> {{ item.fecha_inicio }} al {{ item.fecha_fin }}</span>
                    }
                    @if (item.descripcion) { <span class="attr-desc">{{ item.descripcion }}</span> }
                  </div>
                  <div class="attr-actions">
                    <span class="attr-id">#{{ item.id }}</span>
                    <button class="btn-icon-danger" (click)="deleteSeason(item.id)" title="Eliminar temporada">
                      <i class="ri-delete-bin-6-line"></i>
                    </button>
                  </div>
                </div>
              }
              @empty {
                <div class="attr-empty"><i class="ri-inbox-2-line"></i> No hay temporadas registradas.</div>
              }
            </div>
          </div>
        }

        <!-- === CATEGORÍAS === -->
        @if (activeTab() === 'categorias') {
          <div class="attr-panel card animate-fade-in">
            <div class="attr-panel-header">
              <h2><i class="ri-folder-open-line"></i> Categorías registradas</h2>
            </div>
            <form [formGroup]="categoryForm" (ngSubmit)="saveCategory()" class="attr-form">
              <div class="form-row-inline">
                <div class="form-group-inline">
                  <label class="form-label">Nombre de Categoría <span class="required">*</span></label>
                  <input type="text" class="form-control" formControlName="nombre" placeholder="Ej: Camisas, Pantalones, Vestidos..."/>
                </div>
                <div class="form-group-inline">
                  <label class="form-label">Descripción</label>
                  <input type="text" class="form-control" formControlName="descripcion" placeholder="Descripción opcional..."/>
                </div>
                <button type="submit" class="btn btn-accent btn-add" [disabled]="categoryForm.invalid || isSaving()">
                  @if (isSaving()) { <i class="ri-loader-4-line spin"></i> }
                  @else { <i class="ri-add-line"></i> }
                  Agregar Categoría
                </button>
              </div>
            </form>
            <div class="attr-list">
              @if (isLoading()) {
                <div class="attr-loading"><i class="ri-loader-4-line spin"></i> Cargando...</div>
              }
              @for (item of categories(); track item.id) {
                <div class="attr-item">
                  <div class="attr-item-left">
                    <i class="ri-folder-3-line attr-icon cat-icon"></i>
                    <span class="attr-badge cat-badge">{{ item.nombre }}</span>
                    @if (item.descripcion) { <span class="attr-desc">{{ item.descripcion }}</span> }
                  </div>
                  <div class="attr-actions">
                    <span class="attr-id">#{{ item.id }}</span>
                    <button class="btn-icon-danger" (click)="deleteCategory(item.id)" title="Eliminar categoría">
                      <i class="ri-delete-bin-6-line"></i>
                    </button>
                  </div>
                </div>
              }
              @empty {
                <div class="attr-empty"><i class="ri-inbox-2-line"></i> No hay categorías registradas.</div>
              }
            </div>
          </div>
        }

        <!-- === COLECCIONES === -->
        @if (activeTab() === 'colecciones') {
          <div class="attr-panel card animate-fade-in">
            <div class="attr-panel-header">
              <h2><i class="ri-bookmark-3-line"></i> Colecciones registradas</h2>
            </div>
            <form [formGroup]="collectionForm" (ngSubmit)="saveCollection()" class="attr-form">
              <div class="form-row-inline">
                <div class="form-group-inline">
                  <label class="form-label">Nombre de Colección <span class="required">*</span></label>
                  <input type="text" class="form-control" formControlName="nombre" placeholder="Ej: Urban Chic, Gala Exclusiva..."/>
                </div>
                <div class="form-group-inline" style="max-width:220px">
                  <label class="form-label">Temporada</label>
                  <select class="form-control" formControlName="temporada_id">
                    <option [ngValue]="null">— Sin temporada —</option>
                    @for (s of seasons(); track s.id) {
                      <option [ngValue]="s.id">{{ s.nombre }}</option>
                    }
                  </select>
                </div>
                <div class="form-group-inline">
                  <label class="form-label">Descripción</label>
                  <input type="text" class="form-control" formControlName="descripcion" placeholder="Descripción opcional..."/>
                </div>
                <button type="submit" class="btn btn-accent btn-add" [disabled]="collectionForm.invalid || isSaving()">
                  @if (isSaving()) { <i class="ri-loader-4-line spin"></i> }
                  @else { <i class="ri-add-line"></i> }
                  Agregar Colección
                </button>
              </div>
            </form>
            <div class="attr-list">
              @if (isLoading()) {
                <div class="attr-loading"><i class="ri-loader-4-line spin"></i> Cargando...</div>
              }
              @for (item of collections(); track item.id) {
                <div class="attr-item">
                  <div class="attr-item-left">
                    <i class="ri-bookmark-3-fill attr-icon col-icon"></i>
                    <span class="attr-badge col-badge">{{ item.nombre }}</span>
                    @if (item.temporada?.nombre) {
                      <span class="attr-type"><i class="ri-sun-line"></i> {{ item.temporada?.nombre }}</span>
                    }
                    @if (item.descripcion) { <span class="attr-desc">{{ item.descripcion }}</span> }
                  </div>
                  <div class="attr-actions">
                    <span class="attr-id">#{{ item.id }}</span>
                    <button class="btn-icon-danger" (click)="deleteCollection(item.id)" title="Eliminar colección">
                      <i class="ri-delete-bin-6-line"></i>
                    </button>
                  </div>
                </div>
              }
              @empty {
                <div class="attr-empty"><i class="ri-inbox-2-line"></i> No hay colecciones registradas.</div>
              }
            </div>
          </div>
        }

      </div>
    </div>

    <style>
      .page-header-card { padding: 1.25rem 1.5rem; margin-bottom: 1rem; }
      .page-header-info { display: flex; align-items: center; gap: 1rem; }
      .page-header-icon {
        width: 48px; height: 48px; border-radius: 12px;
        background: linear-gradient(135deg, var(--color-accent, #ec4899), #a0006b);
        display: flex; align-items: center; justify-content: center;
        font-size: 1.4rem; color: #fff; flex-shrink: 0;
      }
      .page-title { font-size: 1.25rem; font-weight: 700; color: var(--color-text, #1e293b); margin: 0; }
      .page-subtitle { font-size: 0.82rem; color: var(--color-text-muted, #64748b); margin: 0.15rem 0 0; }

      .attr-tabs-container { padding: 0.5rem 0.75rem; margin-bottom: 1rem; }
      .attr-tabs { display: flex; gap: 0.25rem; overflow-x: auto; }
      .attr-tab {
        display: flex; align-items: center; gap: 0.4rem;
        padding: 0.55rem 1rem; border-radius: 8px; border: none;
        background: transparent; color: var(--color-text-muted, #64748b);
        font-size: 0.85rem; font-weight: 500; cursor: pointer;
        transition: background 0.15s, color 0.15s; white-space: nowrap;
      }
      .attr-tab:hover { background: rgba(0,0,0,0.04); color: var(--color-text, #1e293b); }
      .attr-tab.active { background: rgba(214,0,118,0.12); color: var(--color-accent, #ec4899); font-weight: 600; }
      .tab-count { background: rgba(0,0,0,0.06); border-radius: 99px; font-size: 0.72rem; padding: 0.1rem 0.45rem; font-weight: 600; }
      .attr-tab.active .tab-count { background: var(--color-accent, #ec4899); color: #fff; }

      .attr-content-grid { display: flex; flex-direction: column; gap: 1rem; }
      .attr-panel { padding: 1.25rem 1.5rem; }
      .attr-panel-header { margin-bottom: 1rem; padding-bottom: 0.75rem; border-bottom: 1px solid var(--color-border, #e2e8f0); }
      .attr-panel-header h2 { font-size: 1rem; font-weight: 600; color: var(--color-text, #1e293b); margin: 0; display: flex; align-items: center; gap: 0.5rem; }
      .attr-panel-header h2 i { color: var(--color-accent, #ec4899); }

      .attr-form { margin-bottom: 1.25rem; }
      .form-row-inline { display: flex; gap: 0.75rem; align-items: flex-end; flex-wrap: wrap; }
      .form-group-inline { display: flex; flex-direction: column; gap: 0.3rem; flex: 1; min-width: 140px; }
      .form-label { font-size: 0.78rem; font-weight: 600; color: var(--color-text-muted, #64748b); }
      .required { color: var(--color-accent, #ec4899); }
      .btn-add { align-self: flex-end; flex-shrink: 0; display: flex; align-items: center; gap: 0.35rem; white-space: nowrap; }

      .hex-input-wrapper { display: flex; gap: 0.5rem; align-items: center; }
      .color-picker { width: 36px; height: 36px; border: none; background: none; cursor: pointer; border-radius: 6px; padding: 2px; }
      .hex-text { flex: 1; }

      .attr-list { display: flex; flex-direction: column; gap: 0.4rem; max-height: 420px; overflow-y: auto; }
      .attr-item {
        display: flex; align-items: center; justify-content: space-between;
        padding: 0.6rem 0.9rem; border-radius: 8px;
        background: #f8fafc; border: 1px solid var(--color-border, #e2e8f0);
        transition: background 0.15s;
      }
      .attr-item:hover { background: #f1f5f9; }
      .attr-item-left { display: flex; align-items: center; gap: 0.6rem; flex-wrap: wrap; }
      .attr-actions { display: flex; align-items: center; gap: 0.75rem; }

      .attr-badge { padding: 0.2rem 0.65rem; border-radius: 6px; font-size: 0.8rem; font-weight: 600; }
      .talla-badge  { background: rgba(99,102,241,0.15); color: #818cf8; border: 1px solid rgba(99,102,241,0.25); }
      .color-badge  { background: rgba(251,191,36,0.12); color: #fbbf24; border: 1px solid rgba(251,191,36,0.2); }
      .season-badge { background: rgba(52,211,153,0.12); color: #34d399; border: 1px solid rgba(52,211,153,0.2); }
      .cat-badge    { background: rgba(214,0,118,0.12);  color: var(--color-accent, #ec4899); border: 1px solid rgba(214,0,118,0.2); }
      .col-badge    { background: rgba(139,92,246,0.12); color: #8b5cf6; border: 1px solid rgba(139,92,246,0.2); }

      .attr-type { font-size: 0.73rem; color: var(--color-text-muted, #64748b); background: var(--color-border, #e2e8f0); padding: 0.15rem 0.5rem; border-radius: 4px; display: inline-flex; align-items: center; gap: 0.25rem; }
      .attr-desc { font-size: 0.78rem; color: var(--color-text-muted, #64748b); font-style: italic; }
      .attr-hex { font-size: 0.73rem; color: var(--color-text-muted, #64748b); font-family: monospace; }
      .attr-id { font-size: 0.72rem; color: var(--color-text-muted, #64748b); }
      .attr-icon { font-size: 1rem; }
      .season-icon { color: #34d399; }
      .cat-icon { color: var(--color-accent, #ec4899); }
      .col-icon { color: #8b5cf6; }
      .color-swatch { width: 20px; height: 20px; border-radius: 50%; border: 2px solid rgba(0,0,0,0.1); flex-shrink: 0; }

      .btn-icon-danger {
        background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.2);
        color: #f87171; border-radius: 6px; padding: 0.3rem 0.5rem;
        font-size: 0.85rem; cursor: pointer; transition: background 0.15s;
      }
      .btn-icon-danger:hover { background: rgba(239,68,68,0.2); }
      .attr-loading, .attr-empty {
        text-align: center; padding: 2rem; color: var(--color-text-muted, #64748b);
        font-size: 0.9rem; display: flex; align-items: center; justify-content: center; gap: 0.5rem;
      }
      .spin { animation: spin 1s linear infinite; }
      @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      .animate-fade-in { animation: fadeIn 0.25s ease; }
      @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
    </style>
  `
})
export class ProductAttributesComponent implements OnInit {
  private catalogApi = inject(CatalogApiService);
  private toast = inject(ToastService);
  private fb = inject(FormBuilder);

  public activeTab = signal<ActiveTab>('tallas');
  public isLoading = signal<boolean>(true);
  public isSaving = signal<boolean>(false);

  public sizes = signal<Talla[]>([]);
  public colors = signal<Color[]>([]);
  public seasons = signal<Temporada[]>([]);
  public categories = signal<Categoria[]>([]);
  public collections = signal<Coleccion[]>([]);

  // Tallas
  public tallaForm: FormGroup = this.fb.group({
    valor: ['', [Validators.required, Validators.minLength(1)]],
    tipo: [''],
    descripcion: ['']
  });

  // Colores
  public colorForm: FormGroup = this.fb.group({
    nombre: ['', [Validators.required, Validators.minLength(1)]],
    codigo_hex: ['#111827']
  });

  // Temporadas
  public seasonForm: FormGroup = this.fb.group({
    nombre: ['', [Validators.required, Validators.minLength(2)]],
    fecha_inicio: [new Date().toISOString().substring(0, 10), [Validators.required]],
    fecha_fin: [new Date(new Date().setMonth(new Date().getMonth() + 3)).toISOString().substring(0, 10), [Validators.required]],
    descripcion: ['']
  });

  // Categorías
  public categoryForm: FormGroup = this.fb.group({
    nombre: ['', [Validators.required, Validators.minLength(2)]],
    descripcion: ['']
  });

  // Colecciones
  public collectionForm: FormGroup = this.fb.group({
    nombre: ['', [Validators.required, Validators.minLength(2)]],
    temporada_id: [null],
    descripcion: ['']
  });

  ngOnInit(): void {
    this.loadAll();
  }

  setTab(tab: ActiveTab): void {
    this.activeTab.set(tab);
  }

  private loadAll(): void {
    this.isLoading.set(true);
    this.catalogApi.getSizes().subscribe(data => this.sizes.set(data));
    this.catalogApi.getColors().subscribe(data => this.colors.set(data));
    this.catalogApi.getSeasons().subscribe(data => this.seasons.set(data));
    this.catalogApi.getCollections().subscribe(data => this.collections.set(data));
    this.catalogApi.getCategories().subscribe(data => {
      this.categories.set(data);
      this.isLoading.set(false);
    });
  }

  // --- TALLAS ---
  saveTalla(): void {
    if (this.tallaForm.invalid) return;
    this.isSaving.set(true);
    const dto: TallaCreateDto = {
      valor: this.tallaForm.value.valor,
      tipo: this.tallaForm.value.tipo || undefined,
      descripcion: this.tallaForm.value.descripcion || undefined
    };
    this.catalogApi.createSize(dto).subscribe({
      next: (talla) => {
        this.sizes.update(list => [...list, talla]);
        this.tallaForm.reset({ valor: '', tipo: '', descripcion: '' });
        this.toast.show('Talla "' + (talla.valor || talla.nombre) + '" creada exitosamente', 'success');
        this.isSaving.set(false);
      },
      error: (err) => {
        const msg = err.error?.detail?.[0]?.msg || err.error?.detail || 'Error al crear la talla';
        this.toast.show(msg, 'error');
        this.isSaving.set(false);
      }
    });
  }

  // --- COLORES ---
  saveColor(): void {
    if (this.colorForm.invalid) return;
    this.isSaving.set(true);
    const dto: ColorCreateDto = {
      nombre: this.colorForm.value.nombre,
      codigo_hex: this.colorForm.value.codigo_hex || undefined
    };
    this.catalogApi.createColor(dto).subscribe({
      next: (color) => {
        this.colors.update(list => [...list, color]);
        this.colorForm.reset({ nombre: '', codigo_hex: '#111827' });
        this.toast.show('Color "' + color.nombre + '" creado exitosamente', 'success');
        this.isSaving.set(false);
      },
      error: (err) => {
        const msg = err.error?.detail?.[0]?.msg || err.error?.detail || 'Error al crear el color';
        this.toast.show(msg, 'error');
        this.isSaving.set(false);
      }
    });
  }

  // --- TEMPORADAS ---
  saveSeason(): void {
    if (this.seasonForm.invalid) return;
    this.isSaving.set(true);
    const dto: TemporadaCreateDto = {
      nombre: this.seasonForm.value.nombre,
      fecha_inicio: this.seasonForm.value.fecha_inicio,
      fecha_fin: this.seasonForm.value.fecha_fin,
      descripcion: this.seasonForm.value.descripcion || undefined
    };
    this.catalogApi.createSeason(dto).subscribe({
      next: (season) => {
        this.seasons.update(list => [...list, season]);
        const today = new Date().toISOString().substring(0, 10);
        const nextQuarter = new Date(new Date().setMonth(new Date().getMonth() + 3)).toISOString().substring(0, 10);
        this.seasonForm.reset({ nombre: '', fecha_inicio: today, fecha_fin: nextQuarter, descripcion: '' });
        this.toast.show('Temporada "' + season.nombre + '" creada exitosamente', 'success');
        this.isSaving.set(false);
      },
      error: (err) => {
        const msg = err.error?.detail?.[0]?.msg || err.error?.detail || 'Error al crear la temporada';
        this.toast.show(msg, 'error');
        this.isSaving.set(false);
      }
    });
  }

  deleteSeason(id: number): void {
    if (!confirm('¿Eliminar esta temporada? Los productos asociados perderán su referencia.')) return;
    this.catalogApi.deleteSeason(id).subscribe({
      next: () => {
        this.seasons.update(list => list.filter(s => s.id !== id));
        this.toast.show('Temporada eliminada', 'success');
      },
      error: () => this.toast.show('Error al eliminar la temporada', 'error')
    });
  }

  // --- CATEGORÍAS ---
  saveCategory(): void {
    if (this.categoryForm.invalid) return;
    this.isSaving.set(true);
    const dto: CategoriaCreateDto = {
      nombre: this.categoryForm.value.nombre,
      descripcion: this.categoryForm.value.descripcion || undefined
    };
    this.catalogApi.createCategory(dto).subscribe({
      next: (cat) => {
        this.categories.update(list => [...list, cat]);
        this.categoryForm.reset({ nombre: '', descripcion: '' });
        this.toast.show('Categoría "' + cat.nombre + '" creada exitosamente', 'success');
        this.isSaving.set(false);
      },
      error: (err) => {
        const msg = err.error?.detail?.[0]?.msg || err.error?.detail || 'Error al crear la categoría';
        this.toast.show(msg, 'error');
        this.isSaving.set(false);
      }
    });
  }

  deleteCategory(id: number): void {
    if (!confirm('¿Eliminar esta categoría?')) return;
    this.catalogApi.deleteCategory(id).subscribe({
      next: () => {
        this.categories.update(list => list.filter(c => c.id !== id));
        this.toast.show('Categoría eliminada', 'success');
      },
      error: () => this.toast.show('Error al eliminar la categoría', 'error')
    });
  }

  // --- COLECCIONES ---
  saveCollection(): void {
    if (this.collectionForm.invalid) return;
    this.isSaving.set(true);
    const dto: ColeccionCreateDto = {
      nombre: this.collectionForm.value.nombre,
      temporada_id: this.collectionForm.value.temporada_id ? Number(this.collectionForm.value.temporada_id) : undefined,
      descripcion: this.collectionForm.value.descripcion || undefined
    };
    this.catalogApi.createCollection(dto).subscribe({
      next: (col) => {
        this.collections.update(list => [...list, col]);
        this.collectionForm.reset({ nombre: '', temporada_id: null, descripcion: '' });
        this.toast.show('Colección "' + col.nombre + '" creada exitosamente', 'success');
        this.isSaving.set(false);
      },
      error: (err) => {
        const msg = err.error?.detail?.[0]?.msg || err.error?.detail || 'Error al crear la colección';
        this.toast.show(msg, 'error');
        this.isSaving.set(false);
      }
    });
  }

  deleteCollection(id: number): void {
    if (!confirm('¿Eliminar esta colección?')) return;
    this.catalogApi.deleteCollection(id).subscribe({
      next: () => {
        this.collections.update(list => list.filter(c => c.id !== id));
        this.toast.show('Colección eliminada', 'success');
      },
      error: () => this.toast.show('Error al eliminar la colección', 'error')
    });
  }
}
