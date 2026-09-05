import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'currencyFormat',
  standalone: true
})
export class CurrencyFormatPipe implements PipeTransform {
  transform(value: number | string | null | undefined, currency: string = 'Bs.'): string {
    if (value === null || value === undefined || isNaN(Number(value))) {
      return `${currency} 0.00`;
    }
    const num = Number(value);
    return `${currency} ${num.toFixed(2)}`;
  }
}
