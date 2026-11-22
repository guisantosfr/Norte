import { Component } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CurrencyMaskDirective } from './currency-mask.directive';

@Component({
  standalone: true,
  imports: [ReactiveFormsModule, CurrencyMaskDirective],
  template: `<input type="text" [formControl]="control" appCurrencyMask />`,
})
class TestHostComponent {
  readonly control = new FormControl<number | null>(null, [
    Validators.required,
    Validators.min(0.01),
  ]);
}

describe('CurrencyMaskDirective', () => {
  let fixture: ComponentFixture<TestHostComponent>;
  let host: TestHostComponent;
  let inputEl: HTMLInputElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestHostComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TestHostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
    inputEl = fixture.nativeElement.querySelector('input');
  });

  function simulateInput(value: string): void {
    inputEl.value = value;
    inputEl.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  it('should format initial numeric value from FormControl into BRL', () => {
    host.control.setValue(1850.5);
    fixture.detectChanges();

    expect(inputEl.value).toBe('R$ 1.850,50');
    expect(host.control.value).toBe(1850.5);
  });

  it('should clear input when FormControl is reset to null', () => {
    host.control.setValue(100);
    fixture.detectChanges();
    expect(inputEl.value).toBe('R$ 100,00');

    host.control.reset(null);
    fixture.detectChanges();
    expect(inputEl.value).toBe('');
  });

  it('should format typed digits in cent-entry style and emit numeric value', () => {
    simulateInput('1');
    expect(inputEl.value).toBe('R$ 0,01');
    expect(host.control.value).toBe(0.01);

    simulateInput('R$ 0,0123456');
    expect(inputEl.value).toBe('R$ 1.234,56');
    expect(host.control.value).toBe(1234.56);
  });

  it('should ignore non-numeric characters', () => {
    simulateInput('abc150xyz');
    expect(inputEl.value).toBe('R$ 1,50');
    expect(host.control.value).toBe(1.5);
  });

  it('should allow backspacing out of R$ 0,01 to empty null', () => {
    simulateInput('1');
    expect(inputEl.value).toBe('R$ 0,01');

    // Simula backspace removendo o último dígito ('1')
    simulateInput('R$ 0,0');
    expect(inputEl.value).toBe('');
    expect(host.control.value).toBeNull();
  });

  it('should mark control as touched on blur and respect disabled state', () => {
    expect(host.control.touched).toBe(false);
    inputEl.dispatchEvent(new Event('blur'));
    expect(host.control.touched).toBe(true);

    host.control.disable();
    fixture.detectChanges();
    expect(inputEl.disabled).toBe(true);
  });
});
