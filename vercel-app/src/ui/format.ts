import type { Language } from './locale';
export const COLORS = { A: '#168566', B: '#84958d', C: '#20a5aa' } as const;
const formatters = new Map<string, Intl.NumberFormat>();

export function number(value: number, digits = 2, language: Language = 'tr') {
  const key = `${language}:${digits}`;
  let formatter = formatters.get(key);
  if (!formatter) {
    formatter = new Intl.NumberFormat(language, { minimumFractionDigits: digits, maximumFractionDigits: digits });
    formatters.set(key, formatter);
  }
  return formatter.format(value === 0 ? 0 : value);
}

export const money = (value: number, language: Language = 'tr') => `${number(value, 2, language)} TL`;
export function percent(value: number, language: Language = 'tr', digits = 2) {
  const formatted = number(value, digits, language);
  return language === 'tr' ? `%${formatted}` : `${formatted}%`;
}

/** Keep tiny nonzero numbers visible in chart tooltips. */
export function detail(value: number, language: Language = 'tr'): string {
  if (value !== 0 && Math.abs(value) < .000001) {
    const exponential = value.toExponential(2);
    return language === 'tr' ? exponential.replace('.', ',') : exponential;
  }
  const digits = value !== 0 && Math.abs(value) < .01 ? Math.min(10, Math.ceil(-Math.log10(Math.abs(value))) + 1) : 2;
  return number(value, digits, language);
}

export const escapeHtml = (value: string) => value.replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]!));
