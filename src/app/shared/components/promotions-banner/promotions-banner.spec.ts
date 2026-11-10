import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { By } from '@angular/platform-browser';
import { PromotionsBannerComponent } from './promotions-banner.component';
import { ActivePromotionsService } from '../../../core/services/active-promotions.service';
import { PromocionPublica } from '../../../core/models/promotion.model';

/**
 * [EXAMEN-2] Banner de campaña promocional (home + catálogo).
 * Debe mostrar la promo PORCENTAJE vigente de mayor descuento, countdown al
 * cierre y respetar el cierre (X) persistido por promoción en localStorage.
 */
describe('PromotionsBannerComponent', () => {
  let promosMock: jasmine.SpyObj<ActivePromotionsService>;
  let promosSignal: ReturnType<typeof signal<PromocionPublica[]>>;

  const promoFake: PromocionPublica = {
    id: 7,
    nombre: 'Black Fashion November',
    descripcion: 'Black Friday: 15% de descuento en Poleras, Pantalones y Chaquetas',
    tipo: 'PORCENTAJE',
    valor: 15,
    fecha_inicio: new Date(Date.now() - 86_400_000).toISOString(),
    fecha_fin: new Date(Date.now() + 7 * 86_400_000).toISOString(),
    condiciones: 'No acumulable con cupón.',
    producto_ids: [],
    categoria_ids: [9, 2, 11],
    sucursal_ids: []
  };

  // Sin `whenStable`: el setInterval del countdown mantiene la Zone pendiente
  // y el await no resolvería nunca. El 2.º detectChanges() refresca el
  // template: el effect del constructor activa `mostrar` tras la 1.ª pasada.
  const crearFixture = () => {
    const f = TestBed.createComponent(PromotionsBannerComponent);
    f.detectChanges();
    f.detectChanges();
    return f;
  };

  beforeEach(() => {
    promosSignal = signal<PromocionPublica[]>([promoFake]);
    promosMock = jasmine.createSpyObj<ActivePromotionsService>('ActivePromotionsService', [
      'load', 'getPromocionDestacada', 'getDiscountForProduct', 'has2x1', 'promociones'
    ]);
    promosMock.promociones.and.returnValue(promosSignal());
    promosMock.getPromocionDestacada.and.callFake(() => {
      const candidatas = promosSignal()
        .filter(p => p.tipo === 'PORCENTAJE' && (p.valor ?? 0) > 0)
        .sort((a, b) => (b.valor ?? 0) - (a.valor ?? 0));
      return candidatas[0] ?? null;
    });

    localStorage.clear();

    TestBed.configureTestingModule({
      imports: [PromotionsBannerComponent],
      providers: [{ provide: ActivePromotionsService, useValue: promosMock }, provideRouter([])]
    });
  });

  it('muestra la promo destacada con su %, nombre y CTA al catálogo', () => {
    const f = crearFixture();
    const banner = f.debugElement.query(By.css('.promo-banner'));
    expect(banner).toBeTruthy();
    expect(f.nativeElement.textContent).toContain('Black Fashion November');
    expect(f.nativeElement.textContent).toContain('15%');
    const cta = f.debugElement.query(By.css('a.banner-cta'));
    expect(cta.attributes['ng-reflect-router-link']).toContain('/catalog');
  });

  it('muestra el countdown mientras la promoción no ha vencido', () => {
    const f = crearFixture();
    expect(f.debugElement.query(By.css('.countdown'))).toBeTruthy();
  });

  it('el botón X oculta el banner y persiste el cierre por promoción', () => {
    const f = crearFixture();
    const close = f.debugElement.query(By.css('.banner-close'));
    expect(close).toBeTruthy();

    close.nativeElement.click();
    f.detectChanges();

    expect(localStorage.getItem('promo-banner-oculto-7')).toBe('1');
    expect(f.debugElement.query(By.css('.promo-banner'))).toBeNull();
  });

  it('no se reintenta mostrar una promo cerrada tras recargar', () => {
    localStorage.setItem('promo-banner-oculto-7', '1');
    promosSignal.set([promoFake]);

    const f = TestBed.createComponent(PromotionsBannerComponent);
    f.detectChanges();
    f.detectChanges();

    expect(f.debugElement.query(By.css('.promo-banner'))).toBeNull();
  });

  it('elige la promo de mayor porcentaje si hay varias vigentes', () => {
    promosSignal.set([
      { ...promoFake, id: 3, valor: 10, nombre: 'Otra campaña' },
      { ...promoFake }
    ]);
    const f = crearFixture();
    expect(promosMock.getPromocionDestacada()).toEqual(promoFake);
    expect(f.nativeElement.textContent).toContain('Black Fashion November');
  });

  it('no renderiza nada si el backend no devuelve promociones', () => {
    promosSignal.set([]);
    const f = TestBed.createComponent(PromotionsBannerComponent);
    f.detectChanges();
    f.detectChanges();
    expect(f.debugElement.query(By.css('.promo-banner'))).toBeNull();
  });
});
