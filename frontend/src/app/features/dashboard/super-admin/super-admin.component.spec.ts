import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SuperAdminComponent } from './super-admin.component';

describe('SuperAdminComponent', () => {
  let component: SuperAdminComponent;
  let fixture: ComponentFixture<SuperAdminComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SuperAdminComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(SuperAdminComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should add access', () => {
    component.form.name = 'Test';
    component.form.role = 'User';

    component.saveAccess();

    expect(component.accesses.length).toBeGreaterThan(0);
  });
});