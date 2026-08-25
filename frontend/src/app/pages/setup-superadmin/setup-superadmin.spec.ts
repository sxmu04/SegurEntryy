import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SetupSuperadmin } from './setup-superadmin';

describe('SetupSuperadmin', () => {
  let component: SetupSuperadmin;
  let fixture: ComponentFixture<SetupSuperadmin>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SetupSuperadmin]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SetupSuperadmin);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
