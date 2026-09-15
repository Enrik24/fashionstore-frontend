import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ProfilePageComponent } from './profile-page.component';
import { ProfileService } from '../../../../core/services/profile.service';
import { ToastService } from '../../../../core/services/toast.service';
import { of } from 'rxjs';

describe('ProfilePageComponent', () => {
  let component: ProfilePageComponent;
  let fixture: ComponentFixture<ProfilePageComponent>;
  let profileServiceMock: any;

  beforeEach(async () => {
    profileServiceMock = {
      getProfile: jasmine.createSpy('getProfile').and.returnValue(of({
        id: 1,
        email: 'cliente@test.com',
        nombre: 'Ana',
        apellido: 'Gomez',
        telefono: '77788999',
        preferencias: { tallas_habituales: ['M'], estilos_preferidos: ['Casual'] }
      })),
      updateProfile: jasmine.createSpy('updateProfile').and.returnValue(of({
        id: 1,
        nombre: 'Ana Maria',
        apellido: 'Gomez'
      })),
      updateAddress: jasmine.createSpy('updateAddress').and.returnValue(of({})),
      updatePreferences: jasmine.createSpy('updatePreferences').and.returnValue(of({})),
      changePassword: jasmine.createSpy('changePassword').and.returnValue(of({ message: 'OK' }))
    };

    await TestBed.configureTestingModule({
      imports: [ProfilePageComponent, HttpClientTestingModule],
      providers: [
        { provide: ProfileService, useValue: profileServiceMock },
        ToastService
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ProfilePageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create and load profile data', () => {
    expect(component).toBeTruthy();
    expect(profileServiceMock.getProfile).toHaveBeenCalled();
    expect(component.profileData.nombre).toBe('Ana');
    expect(component.selectedTallas).toContain('M');
  });

  it('should toggle fashion style tags correctly', () => {
    component.toggleEstilo('Formal');
    expect(component.isEstiloSelected('Formal')).toBeTrue();
    component.toggleEstilo('Formal');
    expect(component.isEstiloSelected('Formal')).toBeFalse();
  });
});
