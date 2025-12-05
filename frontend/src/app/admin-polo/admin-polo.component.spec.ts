import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { AdminPoloComponent } from './admin-polo.component';

describe('AdminPoloComponent', () => {
  let component: AdminPoloComponent;
  let fixture: ComponentFixture<AdminPoloComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminPoloComponent, HttpClientTestingModule]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AdminPoloComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
