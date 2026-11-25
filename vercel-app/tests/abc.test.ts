import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import reference from './fixtures/python-reference.json';
import unicode from '../src/core/python-unicode.json';
import { analysisInsights, calculateAbc, normalizeProduct, parseNumber, sampleData, validateTargets } from '../src/core/abc';
import type { InputTable } from '../src/core/abc';

function compare(actual: unknown, expected: unknown): void {
  if (typeof expected === 'number') {
    expect(typeof actual).toBe('number');
    const difference = Math.abs((actual as number) - expected);
    // Relative check also protects subnormal values; never use a large absolute epsilon.
    expect(difference).toBeLessThanOrEqual(Math.max(Number.MIN_VALUE, Math.abs(expected) * 1e-13));
  } else if (Array.isArray(expected)) {
    expect(Array.isArray(actual)).toBe(true);
    expect((actual as unknown[]).length).toBe(expected.length);
    expected.forEach((value, index) => compare((actual as unknown[])[index], value));
  } else if (expected !== null && typeof expected === 'object') {
    for (const [key, value] of Object.entries(expected)) compare((actual as Record<string, unknown>)[key], value);
  } else expect(actual).toEqual(expected);
}

describe('Değiştirilmemiş Python çekirdeği ile karşılaştırma', () => {
  it('referans sonuçlar mevcut Python kaynak özetiyle eşleşir', () => {
    const core = readFileSync(new URL('../../abc_core.py', import.meta.url));
    expect(createHash('sha256').update(core).digest('hex')).toBe(reference.metadata.core_sha256);
  });
  for (const test of reference.cases) {
    it(test.name, () => {
      const calculate = () => calculateAbc(test.source as InputTable, test.targets);
      if ('error' in test) expect(calculate).toThrow(test.error);
      else compare(calculate(), test.expected);
    });
  }
});

describe('Python sayı ayrıştırma sözleşmesi', () => {
  for (const test of reference.parse_cases) it(JSON.stringify(test.input), () => {
    const actual = parseNumber(test.input);
    if (test.expected === 'NaN') expect(Number.isNaN(actual)).toBe(true);
    else if (test.expected === 'Infinity') expect(actual).toBe(Infinity);
    else if (test.expected === '-Infinity') expect(actual).toBe(-Infinity);
    else expect(actual).toBe(test.expected);
  });
});

describe('TypeScript arayüz sözleşmesi', () => {
  it('C dahil hedef toplamını doğrular', () => {
    expect(() => validateTargets({ a: 80, b: 15, c: 6 })).toThrow('Hedeflerin toplamı %100 olmalıdır.');
    for (const c of [-1, Infinity, NaN]) expect(() => validateTargets({ a: 80, b: 15, c })).toThrow();
  });
  it('girdileri veya varsayılan hedefleri değiştirmez', () => {
    const input = sampleData(), original = structuredClone(input);
    const targets = Object.freeze({ a: 80, b: 15, c: 5 });
    calculateAbc(input, targets);
    expect(input).toEqual(original);
    expect(calculateAbc(sampleData()).total).toBe(304000);
  });
  it('eksik satır hücresini boş hücre olarak reddeder', () => {
    const input = sampleData(); input.rows[0] = ['Motor'];
    expect(() => calculateAbc(input)).toThrow('Boş hücreler');
  });
  it('yorumlar gerçek veriye dayanır, A yoksa uygun öneri verir', () => {
    const result = calculateAbc(sampleData(), { a: 0, b: 0, c: 100 });
    expect(result.commentary.join(' ')).toContain('A grubunda ürün bulunmuyor');
    expect(result.commentary.join(' ')).toContain('Motor');
    expect(analysisInsights([...result.rows].reverse())).toEqual(result.insights);
    expect(() => analysisInsights([])).toThrow('pozitif toplam');
  });
  it('Unicode casefold verilerindeki bütün dönüşümleri kullanır', () => {
    for (const [char, folded] of Object.entries(unicode.casefold)) {
      if (char === 'I' || char === 'İ') continue;
      // NFC may change the single code point before casefold; compare canonical forms.
      if (char.normalize('NFC') === char) expect(normalizeProduct(char)).toBe(folded);
    }
    expect(normalizeProduct('VİDA')).toBe(normalizeProduct('vida'));
    expect(normalizeProduct('I')).not.toBe(normalizeProduct('i'));
  });
});
