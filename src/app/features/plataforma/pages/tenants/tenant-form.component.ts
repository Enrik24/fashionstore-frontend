import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { SaasApiService } from '../../../../core/services/saas-api.service';
import { ToastService } from '../../../../core/services/toast.service';
import { Plan, ReenviarCredencialesResponse, Tenant, TenantCreateDto } from '../../../../core/models/saas.model';
import { SectionTitleComponent } from '../../../../shared/components/section-title/section-title.component';
import { CurrencyFormatPipe } from '../../../../shared/pipes/currency-format.pipe';

/**
 * [EXAMEN-2] CU01: alta de empresa con su administrador principal.
 * Las credenciales temporales se muestran solo si el envío de correo falla
 * o si el Super Administrador las solicita con "Reenviar credenciales".
 */
@Component({
  selector: 'app-tenant-form',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, SectionTitleComponent, CurrencyFormatPipe],
  template: `
    <div class="page">
      <app-section-title
        titulo="Nueva empresa"
        subtitulo="Registra el tenant y su administrador principal. El NIT y el correo deben ser únicos."
        icono="ri-add-circle-line">
        <a acciones routerLink="/plataforma/empresas" class="btn btn-outline">
          <i class="ri-arrow-left-line"></i> Volver al listado
        </a>
      </app-section-title>

      @if (creada(); as tenant) {
        <div class="resultado card">
          <div class="resultado-icon"><i class="ri-checkbox-circle-fill"></i></div>
          <h2>Empresa registrada</h2>
          <p>
            <strong>{{ tenant.razon_social }}</strong> quedó en estado
            <span class="badge badge-warning">Configuración inicial</span>.
            El administrador debe completar el asistente para pasar a operativo.
          </p>

          @if (credenciales(); as cred) {
            <div class="credenciales">
              <h3><i class="ri-key-2-line"></i> Credenciales temporales</h3>
              <p class="aviso">Guárdalas y entrégaselas al administrador: no se volverán a mostrar.</p>
              <dl>
                <div><dt>Correo</dt><dd>{{ cred.correo }}</dd></div>
                <div><dt>Contraseña temporal</dt><dd class="mono">{{ cred.contrasena_temporal }}</dd></div>
              </dl>
            </div>
          }

          <div class="resultado-acciones">
            <button type="button" class="btn btn-outline" (click)="reenviar(tenant.id)" [disabled]="reenviando()">
              <i class="ri-mail-send-line"></i>
              {{ reenviando() ? 'Enviando…' : 'Reenviar credenciales' }}
            </button>
            <a class="btn btn-primary" [routerLink]="['/plataforma/empresas', tenant.id]">
              <i class="ri-eye-line"></i> Ver empresa
            </a>
            <button type="button" class="btn btn-accent" (click)="reiniciar()">
              <i class="ri-add-line"></i> Registrar otra
            </button>
          </div>
        </div>
      } @else {
        <form class="formulario" (ngSubmit)="guardar()" #formulario="ngForm" novalidate>
          <section class="card bloque">
            <h2 class="bloque-titulo"><i class="ri-building-4-line"></i> Datos de la empresa</h2>

            <div class="grid">
              <div class="campo campo-full">
                <label for="razon_social">Razón social *</label>
                <input id="razon_social" name="razon_social" [(ngModel)]="datos.razon_social"
                       required maxlength="200" placeholder="Ej. Moda Andina S.R.L." />
              </div>

              <div class="campo">
                <label for="nit">NIT *</label>
                <input id="nit" name="nit" [(ngModel)]="datos.nit" required maxlength="20"
                       placeholder="Ej. 1234567890" />
                <small>Se valida que no exista otra empresa con el mismo NIT.</small>
              </div>

              <div class="campo">
                <label for="correo_contacto">Correo de contacto *</label>
                <input id="correo_contacto" name="correo_contacto" type="email" [(ngModel)]="datos.correo_contacto"
                       required email placeholder="contacto@empresa.com" />
              </div>

              <div class="campo">
                <label for="telefono">Teléfono</label>
                <input id="telefono" name="telefono" [(ngModel)]="datos.telefono" maxlength="30"
                       placeholder="+591 70000000" />
              </div>

              <div class="campo">
                <label for="moneda">Moneda *</label>
                <select id="moneda" name="moneda" [(ngModel)]="datos.moneda" required>
                  <option value="BOB">Boliviano (BOB)</option>
                  <option value="USD">Dólar (USD)</option>
                  <option value="PEN">Sol (PEN)</option>
                  <option value="ARS">Peso argentino (ARS)</option>
                </select>
              </div>

              <div class="campo">
                <label for="zona_horaria">Zona horaria *</label>
                <select id="zona_horaria" name="zona_horaria" [(ngModel)]="datos.zona_horaria" required>
                  <option value="America/La_Paz">América/La Paz (UTC−4)</option>
                  <option value="America/Lima">América/Lima (UTC−5)</option>
                  <option value="America/Argentina/Buenos_Aires">América/Buenos Aires (UTC−3)</option>
                </select>
              </div>

              <div class="campo">
                <label for="plan_id">Plan inicial</label>
                <select id="plan_id" name="plan_id" [(ngModel)]="datos.plan_id">
                  <option [ngValue]="null">Sin plan (asignar después)</option>
                  @for (plan of planes(); track plan.id) {
                    <option [ngValue]="plan.id">{{ plan.nombre }} · {{ plan.precio_mensual | currencyFormat:'Bs.' }}/mes</option>
                  }
                </select>
              </div>

              <div class="campo campo-full">
                <label for="direccion_fiscal">Dirección fiscal *</label>
                <textarea id="direccion_fiscal" name="direccion_fiscal" rows="2" [(ngModel)]="datos.direccion_fiscal"
                          required maxlength="250" placeholder="Calle, número, ciudad"></textarea>
              </div>
            </div>
          </section>

          <section class="card bloque">
            <h2 class="bloque-titulo"><i class="ri-shield-user-line"></i> Administrador principal</h2>
            <p class="bloque-desc">Recibirá un correo con su contraseña temporal. Deberá cambiarla al ingresar.</p>

            <div class="grid">
              <div class="campo">
                <label for="admin_nombre">Nombre *</label>
                <input id="admin_nombre" name="admin_nombre" [(ngModel)]="datos.admin_nombre" required maxlength="100" />
              </div>

              <div class="campo">
                <label for="admin_apellido">Apellido *</label>
                <input id="admin_apellido" name="admin_apellido" [(ngModel)]="datos.admin_apellido" required maxlength="100" />
              </div>

              <div class="campo">
                <label for="admin_correo">Correo del administrador *</label>
                <input id="admin_correo" name="admin_correo" type="email" [(ngModel)]="datos.admin_correo"
                       required email placeholder="admin@empresa.com" />
              </div>

              <div class="campo">
                <label for="admin_contrasena">Contraseña inicial *</label>
                <div class="input-accion">
                  <input id="admin_contrasena" name="admin_contrasena" [type]="verContrasena() ? 'text' : 'password'"
                         [(ngModel)]="datos.admin_contrasena" required minlength="8" maxlength="72" />
                  <button type="button" class="btn-ojo" (click)="verContrasena.set(!verContrasena())"
                          [attr.aria-label]="verContrasena() ? 'Ocultar contraseña' : 'Mostrar contraseña'">
                    <i [class]="verContrasena() ? 'ri-eye-off-line' : 'ri-eye-line'"></i>
                  </button>
                </div>
                <small>Mínimo 8 caracteres. Se enviará por correo al administrador.</small>
              </div>
            </div>
          </section>

          @if (error()) {
            <div class="error-box" role="alert">
              <i class="ri-error-warning-line"></i>
              <span>{{ error() }}</span>
            </div>
          }

          <div class="acciones">
            <a routerLink="/plataforma/empresas" class="btn btn-outline">Cancelar</a>
            <button type="submit" class="btn btn-accent" [disabled]="guardando() || formulario.invalid">
              <i class="ri-save-3-line"></i>
              {{ guardando() ? 'Registrando…' : 'Registrar empresa' }}
            </button>
          </div>
        </form>
      }
    </div>
  `,
  styles: [`
    .page { display: flex; flex-direction: column; gap: 1rem; max-width: 1000px; }
    .formulario { display: flex; flex-direction: column; gap: 1rem; }
    .bloque { padding: 1.35rem 1.5rem; }
    .bloque-titulo {
      display: flex; align-items: center; gap: 0.45rem;
      font-size: 1rem; font-weight: 800; color: var(--primary);
      margin: 0 0 0.25rem;
      i { color: var(--accent); }
    }
    .bloque-desc { font-size: 0.78rem; color: var(--text-muted); margin: 0 0 1rem; }

    .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.9rem 1rem; margin-top: 0.9rem; }
    .campo-full { grid-column: 1 / -1; }

    .campo { display: flex; flex-direction: column; gap: 0.3rem; }
    .campo label { font-size: 0.75rem; font-weight: 700; color: var(--primary); }

    .campo input, .campo select, .campo textarea {
      border: 1px solid var(--border-color);
      border-radius: var(--radius-md);
      padding: 0.55rem 0.7rem;
      font-size: 0.85rem;
      color: var(--primary);
      background: white;
      font-family: inherit;
      &:focus { outline: none; border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-glow); }
    }
    .campo textarea { resize: vertical; }
    .campo small { font-size: 0.68rem; color: var(--text-muted); }

    .input-accion { position: relative; display: flex; }
    .input-accion input { width: 100%; padding-right: 2.4rem; }
    .btn-ojo {
      position: absolute; right: 0.35rem; top: 50%; transform: translateY(-50%);
      border: none; background: transparent; color: var(--text-muted);
      cursor: pointer; font-size: 1.05rem; padding: 0.2rem;
    }

    .error-box {
      display: flex; align-items: flex-start; gap: 0.5rem;
      background: var(--error-bg); color: var(--error);
      border-radius: var(--radius-md);
      padding: 0.75rem 1rem;
      font-size: 0.82rem;
    }

    .acciones { display: flex; justify-content: flex-end; gap: 0.6rem; }

    .resultado {
      padding: 2rem;
      display: flex; flex-direction: column; align-items: center; text-align: center; gap: 0.5rem;
    }
    .resultado-icon { font-size: 3rem; color: var(--success); }
    .resultado h2 { margin: 0; font-size: 1.2rem; color: var(--primary); }
    .resultado p { margin: 0; font-size: 0.85rem; color: var(--text-muted); max-width: 560px; }

    .credenciales {
      width: 100%; max-width: 460px;
      margin-top: 1rem;
      background: var(--bg-main);
      border: 1px dashed var(--border-color);
      border-radius: var(--radius-md);
      padding: 1rem;
      text-align: left;
      h3 { margin: 0 0 0.2rem; font-size: 0.9rem; color: var(--primary); display: flex; align-items: center; gap: 0.35rem; }
      .aviso { font-size: 0.72rem; color: var(--critical); margin: 0 0 0.6rem; }
      dl { display: flex; flex-direction: column; gap: 0.4rem; margin: 0; }
      dl div { display: flex; justify-content: space-between; gap: 1rem; font-size: 0.82rem; }
      dt { color: var(--text-muted); font-weight: 600; }
      dd { margin: 0; font-weight: 700; color: var(--primary); }
      .mono { font-family: ui-monospace, monospace; }
    }

    .resultado-acciones { display: flex; gap: 0.5rem; flex-wrap: wrap; justify-content: center; margin-top: 1.25rem; }

    @media (max-width: 768px) {
      .grid { grid-template-columns: 1fr; }
      .acciones { flex-direction: column-reverse; }
      .acciones .btn { width: 100%; }
    }
  `]
})
export class TenantFormComponent implements OnInit {
  private saasApi = inject(SaasApiService);
  private toast = inject(ToastService);

  public planes = signal<Plan[]>([]);
  public guardando = signal(false);
  public reenviando = signal(false);
  public error = signal<string | null>(null);
  public creada = signal<Tenant | null>(null);
  public credenciales = signal<ReenviarCredencialesResponse | null>(null);
  public verContrasena = signal(false);

  public datos: TenantCreateDto = this.datosIniciales();

  ngOnInit(): void {
    this.saasApi.listarPlanes().subscribe({
      next: (planes) => this.planes.set(planes.filter((plan) => plan.estado === 'ACTIVO')),
      error: () => this.toast.warning('No se pudieron cargar los planes; puedes registrar la empresa sin plan.')
    });
  }

  public guardar(): void {
    this.error.set(null);
    if (!this.formularioValido()) {
      this.error.set('Completa los campos obligatorios antes de registrar la empresa.');
      return;
    }

    this.guardando.set(true);
    this.saasApi.crearTenant(this.datos).subscribe({
      next: (tenant) => {
        this.guardando.set(false);
        this.creada.set(tenant);
        this.toast.success(`Empresa ${tenant.razon_social} registrada.`);
      },
      error: (err) => {
        this.guardando.set(false);
        this.error.set(this.mensajeError(err));
      }
    });
  }

  public reenviar(id: number): void {
    this.reenviando.set(true);
    this.saasApi.reenviarCredenciales(id).subscribe({
      next: (credenciales) => {
        this.reenviando.set(false);
        this.credenciales.set(credenciales);
        this.toast.info('Credenciales temporales regeneradas.');
      },
      error: () => {
        this.reenviando.set(false);
        this.toast.error('No se pudieron regenerar las credenciales.');
      }
    });
  }

  public reiniciar(): void {
    this.datos = this.datosIniciales();
    this.creada.set(null);
    this.credenciales.set(null);
    this.error.set(null);
  }

  private datosIniciales(): TenantCreateDto {
    return {
      razon_social: '',
      nit: '',
      direccion_fiscal: '',
      correo_contacto: '',
      telefono: '',
      moneda: 'BOB',
      zona_horaria: 'America/La_Paz',
      plan_id: null,
      admin_nombre: '',
      admin_apellido: '',
      admin_correo: '',
      admin_contrasena: ''
    };
  }

  private formularioValido(): boolean {
    const d = this.datos;
    return !!d.razon_social.trim() && !!d.nit.trim() && !!d.direccion_fiscal.trim() &&
      !!d.correo_contacto.trim() && !!d.admin_nombre.trim() && !!d.admin_apellido.trim() &&
      !!d.admin_correo.trim() && d.admin_contrasena.length >= 8;
  }

  private mensajeError(err: any): string {
    const detalle = err?.error?.detail ?? err?.error?.message;
    if (typeof detalle === 'string') {
      if (/nit/i.test(detalle)) return 'Ya existe una empresa registrada con ese NIT.';
      if (/correo/i.test(detalle)) return 'El correo del administrador ya está en uso.';
      return detalle;
    }
    if (Array.isArray(detalle) && detalle.length) {
      return String(detalle[0]?.msg ?? 'Revisa los datos ingresados.');
    }
    return 'No se pudo registrar la empresa. Revisa los datos e inténtalo de nuevo.';
  }
}
