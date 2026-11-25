export const COLORS = { A: '#4F8CFF', B: '#F59E0B', C: '#22D3EE' } as const;
const formatters=new Map<number,Intl.NumberFormat>();
export const number = (value: number, digits = 2) => {
  let formatter=formatters.get(digits);
  if(!formatter){formatter=new Intl.NumberFormat('tr-TR',{minimumFractionDigits:digits,maximumFractionDigits:digits});formatters.set(digits,formatter);}
  return formatter.format(value===0?0:value);
};
export const money = (value: number) => `${number(value)} TL`;
export const percent = (value: number) => `%${number(value)}`;
/** Keep tiny nonzero numbers visible in chart tooltips. */
export function detail(value: number): string {
  if (value !== 0 && Math.abs(value) < .000001) return value.toExponential(2).replace('.', ',');
  const digits = value !== 0 && Math.abs(value) < .01 ? Math.min(10,Math.ceil(-Math.log10(Math.abs(value)))+1) : 2;
  return number(value,digits);
}
export const escapeHtml = (value: string) => value.replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]!));
