export interface CurrencyMeta {
  code: string;
  name: string;
  symbol: string;
  defaultRate: number;
  isPrefix: boolean;
  decimals?: number;
}

export const SUPPORTED_CURRENCIES: CurrencyMeta[] = [
  { code: 'EUR', name: 'Euro', symbol: '€', defaultRate: 1.0, isPrefix: true, decimals: 2 },
  { code: 'USD', name: 'US Dollar', symbol: '$', defaultRate: 1.08, isPrefix: true, decimals: 2 },
  { code: 'RSD', name: 'Serbian Dinar', symbol: 'din', defaultRate: 117.2, isPrefix: false, decimals: 2 },
  { code: 'GBP', name: 'British Pound', symbol: '£', defaultRate: 0.86, isPrefix: true, decimals: 2 },
  { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF', defaultRate: 0.96, isPrefix: true, decimals: 2 },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'CA$', defaultRate: 1.48, isPrefix: true, decimals: 2 },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$', defaultRate: 1.65, isPrefix: true, decimals: 2 },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥', defaultRate: 165.0, isPrefix: true, decimals: 0 },
];

export function getCurrencyMeta(code: string = ''): CurrencyMeta {
  const normalized = (code || '').toUpperCase().trim();
  const found = SUPPORTED_CURRENCIES.find((c) => c.code === normalized);
  if (found) {
    return found;
  }
  return {
    code: normalized,
    name: normalized,
    symbol: normalized,
    defaultRate: 1.0,
    isPrefix: false,
    decimals: 2,
  };
}

export function getDefaultRate(code: string = ''): number {
  return getCurrencyMeta(code).defaultRate;
}

export function formatCurrencyAmount(val: number | string, currencyCode: string = ''): string {
  const num = typeof val === 'number' ? val : parseFloat(String(val)) || 0;
  const meta = getCurrencyMeta(currencyCode);
  const decimals = meta.decimals ?? 2;
  const formatted = num.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  if (meta.isPrefix) {
    return `${meta.symbol}${formatted}`;
  }
  return `${formatted} ${meta.symbol}`;
}

export function convertCurrency(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  fromRate?: number,
  toRate?: number
): number {
  const fromUpper = (fromCurrency || '').toUpperCase().trim();
  const toUpper = (toCurrency || '').toUpperCase().trim();

  if (!fromUpper || !toUpper || fromUpper === toUpper) {
    return amount;
  }

  const rFrom = fromRate && fromRate > 0 ? fromRate : getDefaultRate(fromUpper);
  const rTo = toRate && toRate > 0 ? toRate : getDefaultRate(toUpper);

  if (rFrom <= 0) {
    return amount;
  }

  const base = amount / rFrom;
  return base * rTo;
}

export function convertToPrimary(
  amount: number,
  currency: string,
  txExchangeRate?: number,
  primaryCurrency: string = '',
  primaryExchangeRate?: number
): number {
  return convertCurrency(amount, currency, primaryCurrency, txExchangeRate, primaryExchangeRate);
}
