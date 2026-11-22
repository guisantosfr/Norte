import {
  Directive,
  ElementRef,
  Renderer2,
  forwardRef,
  inject,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

const MAX_DIGITS = 14; // Até R$ 999.999.999.999,99 sem perda de precisão em IEEE-754

const BRL_NUMBER_FORMATTER = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/**
 * Diretiva standalone (zero dependências) para máscara monetária em Real (R$).
 *
 * <p>Implementa {@link ControlValueAccessor} mantendo o valor do {@code FormControl}
 * como {@code number | null} enquanto exibe o valor formatado em {@code pt-BR}
 * (ex.: {@code R$ 1.234,56}) no elemento {@code <input>}.
 */
@Directive({
  selector: 'input[appCurrencyMask]',
  standalone: true,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => CurrencyMaskDirective),
      multi: true,
    },
  ],
  host: {
    '(input)': 'onInput($event)',
    '(blur)': 'onBlur()',
  },
})
export class CurrencyMaskDirective implements ControlValueAccessor {
  private readonly elementRef = inject<ElementRef<HTMLInputElement>>(ElementRef);
  private readonly renderer = inject(Renderer2);

  private onChange: (value: number | null) => void = () => {};
  private onTouched: () => void = () => {};

  private lastFormattedValue = '';
  private lastEmittedValue: number | null = null;

  writeValue(value: number | string | null | undefined): void {
    if (value === null || value === undefined || value === '') {
      this.lastFormattedValue = '';
      this.lastEmittedValue = null;
      this.renderer.setProperty(this.elementRef.nativeElement, 'value', '');
      return;
    }

    const parsed = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(parsed) || parsed < 0) {
      this.lastFormattedValue = '';
      this.lastEmittedValue = null;
      this.renderer.setProperty(this.elementRef.nativeElement, 'value', '');
      return;
    }

    const normalized = Math.round(parsed * 100) / 100;
    const formatted = this.formatCurrency(normalized);
    this.lastFormattedValue = formatted;
    this.lastEmittedValue = normalized;
    this.renderer.setProperty(this.elementRef.nativeElement, 'value', formatted);
  }

  registerOnChange(fn: (value: number | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.renderer.setProperty(this.elementRef.nativeElement, 'disabled', isDisabled);
  }

  onInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const rawValue = input.value;
    const digits = rawValue.replace(/\D/g, '').slice(0, MAX_DIGITS);

    if (digits.length === 0) {
      this.applyState('', null, input);
      return;
    }

    // Ao pressionar Backspace/Delete em R$ 0,01 ou R$ 0,00, restam apenas zeros;
    // limpa o campo por completo em vez de prender o usuário em R$ 0,00.
    const isDeleting = rawValue.length < this.lastFormattedValue.length;
    if (isDeleting && Number(digits) === 0) {
      this.applyState('', null, input);
      return;
    }

    const numericValue = Number(digits) / 100;
    const formatted = this.formatCurrency(numericValue);
    this.applyState(formatted, numericValue, input);
  }

  onBlur(): void {
    this.onTouched();
  }

  private applyState(
    formatted: string,
    numericValue: number | null,
    input: HTMLInputElement
  ): void {
    this.lastFormattedValue = formatted;
    this.renderer.setProperty(input, 'value', formatted);

    if (
      formatted.length > 0 &&
      typeof input.setSelectionRange === 'function' &&
      document.activeElement === input
    ) {
      input.setSelectionRange(formatted.length, formatted.length);
    }

    if (numericValue !== this.lastEmittedValue) {
      this.lastEmittedValue = numericValue;
      this.onChange(numericValue);
    }
  }

  private formatCurrency(value: number): string {
    return `R$ ${BRL_NUMBER_FORMATTER.format(value)}`;
  }
}
