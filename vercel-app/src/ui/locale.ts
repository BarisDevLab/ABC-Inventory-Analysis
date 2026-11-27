import { createContext, useCallback, useContext } from 'react';
import { detail, money, number, percent } from './format';

export type Language = 'tr' | 'en';
export type Theme = 'light' | 'dark';
export type Translate = (tr: string, en: string) => string;
export const LanguageContext = createContext<Language>('tr');

export function useLocale() {
  const language = useContext(LanguageContext);
  const t: Translate = useCallback((tr, en) => language === 'tr' ? tr : en, [language]);
  return {
    language, t,
    number: (value: number, digits?: number) => number(value, digits, language),
    money: (value: number) => money(value, language),
    percent: (value: number, digits?: number) => percent(value, language, digits),
    detail: (value: number) => detail(value, language),
  };
}

const errorMessages = [
  [/^Yalnızca Excel ve CSV/, 'Only Excel and CSV files are supported.'],
  [/^Dosya boyutu/, 'The file exceeds the 20 MiB limit. Choose a smaller file.'],
  [/^Dosya boş|^Dosyada ürün bulunamadı/, 'The file has no product rows. Include a header and at least one product.'],
  [/^Eksik sütunlar: (.+)/, 'Missing required columns: $1'],
  [/^Tekrarlanan sütun/, 'Column headers must be unique.'],
  [/^Tekrarlanan ürün/, 'Each product name must be unique. Use one row per product.'],
  [/^Boş hücreler/, 'Fill in all required cells.'],
  [/^Ürün adı boş/, 'Product names must not be blank.'],
  [/^'(.+)' sütununda geçersiz sayı/, 'The “$1” column contains an invalid number.'],
  [/^'(.+)' negatif/, 'The “$1” column cannot contain negative values.'],
  [/^Yıllık değer hesaplamasında/, 'An annual usage value exceeds the supported numeric range.'],
  [/^Toplam yıllık değer/, 'The total annual value must be positive and finite.'],
  [/^Dosyada çok fazla/, 'The file exceeds the row, column, or cell limit.'],
  [/^Excel dosyasının açılmış boyutu/, 'The expanded Excel file exceeds the allowed size.'],
  [/^Excel dosyası okunamadı/, 'Choose a valid, unencrypted .xlsx file.'],
  [/^CSV dosyasını UTF-8/, 'Save the CSV file as UTF-8.'],
  [/^CSV dosyasında geçersiz NUL/, 'The CSV file contains an invalid NUL character.'],
  [/^CSV dosyası okunamadı/, 'Check the CSV delimiter and row lengths.'],
  [/^Güvenli Excel okuma/, 'Use a current browser to read Excel files securely.'],
  [/^Hedeflerin toplamı/, 'Targets must add up to 100%.'],
  [/^Hedef paylar/, 'Targets must be between 0% and 100%. A and B together cannot exceed 100%.'],
  [/zaman aşım/, 'The operation timed out. Try a smaller inventory.'],
  [/iptal edildi/, 'The operation was cancelled.'],
  [/^Analiz başlatılamadı|^Tarayıcınız arka planda/, 'Background processing requires a current browser.'],
  [/^Excel hazırlama başlatılamadı|^Excel dosyası hazırlanamadı/, 'Could not create the workbook. Try again.'],
  [/^Excel dosyası indirilemedi/, 'Check your browser’s download permissions and try again.'],
] as const;

export function displayError(message: string, language: Language, fallback: string) {
  if (language === 'tr') return message || fallback;
  for (const [pattern, english] of errorMessages) {
    const match = pattern.exec(message);
    if (match) return match[1] ? english.replace('$1', () => match[1]) : english;
  }
  return fallback;
}

export function preference<T extends string>(key: string, allowed: readonly T[], fallback: T): T {
  try {
    const saved = localStorage.getItem('abc:' + key);
    return allowed.find(value => saved === value) ?? fallback;
  } catch {
    return fallback;
  }
}

export function savePreference(key: string, value: string) {
  try { localStorage.setItem('abc:' + key, value); } catch { /* Preferences still work for this visit. */ }
}
