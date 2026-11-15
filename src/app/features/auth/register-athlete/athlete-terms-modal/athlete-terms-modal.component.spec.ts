import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AthleteTermsModalComponent } from './athlete-terms-modal.component';

describe('AthleteTermsModalComponent', () => {
  let component: AthleteTermsModalComponent;
  let fixture: ComponentFixture<AthleteTermsModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AthleteTermsModalComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(AthleteTermsModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the modal component', () => {
    expect(component).toBeTruthy();
  });

  it('should emit close event when onClose is called', () => {
    spyOn(component.close, 'emit');
    component.onClose();
    expect(component.close.emit).toHaveBeenCalled();
  });
});
