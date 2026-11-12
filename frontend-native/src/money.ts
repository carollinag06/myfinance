// Reúne a formatação e a conversão de valores monetários em reais.
export function formatCurrencyInput(value: string): string {
  const source = value.replace(/^R\$\s*/i, '').trim();
  if (!/\d/.test(source)) return '';

  const commaIndex = source.lastIndexOf(',');
  const dotIndex = source.lastIndexOf('.');
  let decimalIndex = commaIndex;

  if (decimalIndex < 0 && dotIndex >= 0) {
    const dotCount = (source.match(/\./g) || []).length;
    const decimalDigits = source.slice(dotIndex + 1).replace(/\D/g, '').length;
    if (dotCount === 1 && decimalDigits <= 2) decimalIndex = dotIndex;
  }

  const integerPart = decimalIndex >= 0 ? source.slice(0, decimalIndex) : source;
  const fractionPart = decimalIndex >= 0 ? source.slice(decimalIndex + 1) : '';
  const integerDigits = integerPart.replace(/\D/g, '').replace(/^0+(?=\d)/, '') || '0';
  const groupedInteger = integerDigits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const fractionDigits = fractionPart.replace(/\D/g, '').slice(0, 2);

  return `R$ ${groupedInteger}${decimalIndex >= 0 ? `,${fractionDigits}` : ''}`;
}

export function parseCurrencyInput(value: string): number {
  const normalized = value
    .replace(/^R\$\s*/i, '')
    .replace(/\s/g, '')
    .replace(/\./g, '')
    .replace(',', '.');
  if (!normalized) return Number.NaN;
  const amount = Number(normalized);
  return Number.isFinite(amount) ? amount : Number.NaN;
}

export function formatCurrencyValue(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}
