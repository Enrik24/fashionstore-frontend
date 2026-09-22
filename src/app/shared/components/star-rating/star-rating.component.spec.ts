import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { StarRatingComponent } from './star-rating.component';

describe('StarRatingComponent (CU26)', () => {
  let fixture: ComponentFixture<StarRatingComponent>;
  let component: StarRatingComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StarRatingComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(StarRatingComponent);
    component = fixture.componentInstance;
  });

  it('debe crearse en modo lectura por defecto', () => {
    expect(component).toBeTruthy();
    expect(component.readonly).toBeTrue();
    expect(component.stars.length).toBe(5);
  });

  it('modo lectura: debe mostrar iconos llenos, medios o vacíos según el promedio', () => {
    component.value = 4.5;
    expect(component.getStarIcon(1)).toBe('ri-star-fill');
    expect(component.getStarIcon(4)).toBe('ri-star-fill');
    expect(component.getStarIcon(5)).toBe('ri-star-half-fill');

    component.value = 2;
    expect(component.getStarIcon(3)).toBe('ri-star-line');
    expect(component.getStarIcon(2)).toBe('ri-star-fill');
  });

  it('modo edición: debe emitir la puntuación seleccionada (1-5)', () => {
    component.readonly = false;
    fixture.detectChanges();

    let emitida: number | undefined;
    component.valueChange.subscribe(v => (emitida = v));

    component.onSelectStar(4);

    expect(component.value).toBe(4);
    expect(emitida).toBe(4);
  });

  it('modo edición: el hover debe previsualizar las estrellas', () => {
    component.readonly = false;

    component.onMouseEnter(3);
    expect(component.hovered).toBe(3);
    expect(component.getStarIcon(3)).toBe('ri-star-fill');

    component.onMouseLeave();
    expect(component.hovered).toBe(0);
  });

  it('modo lectura: no debe emitir eventos al hacer click', () => {
    component.readonly = true;

    let emitida: number | undefined;
    component.valueChange.subscribe(v => (emitida = v));

    component.onSelectStar(5);

    expect(emitida).toBeUndefined();
    expect(component.value).toBe(0);
  });

  it('debe renderizar 5 botones de estrella en el DOM', () => {
    fixture.detectChanges();
    const botones = fixture.debugElement.queryAll(By.css('.star-btn'));
    expect(botones.length).toBe(5);
  });
});
