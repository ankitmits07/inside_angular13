import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CandidateWizardComponent } from './candidate-wizard.component';

describe('CandidateWizardComponent', () => {
  let component: CandidateWizardComponent;
  let fixture: ComponentFixture<CandidateWizardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CandidateWizardComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(CandidateWizardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
