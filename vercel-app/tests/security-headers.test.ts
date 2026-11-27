import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const config = JSON.parse(readFileSync(new URL('../vercel.json',import.meta.url),'utf8'));
const headers = Object.fromEntries(config.headers[0].headers.map(({key,value}:{key:string;value:string})=>[key.toLowerCase(),value]));
const directives = Object.fromEntries((headers['content-security-policy'] as string).split(';').map(part=>part.trim().split(/\s+/)).filter(parts=>parts[0]).map(([name,...values])=>[name,values]));

describe('Üretim güvenlik politikası',()=>{
  it('tüm yolları kapsar ve platform HSTS ayarını değiştirmez',()=>{
    expect(config.headers[0].source).toBe('/(.*)');
    expect(headers['strict-transport-security']).toBeUndefined();
  });
  it('satır içi betik ve eval açmadan aynı kaynak betikleri ve worker işlemlerini destekler',()=>{
    expect(directives['default-src']).toEqual(["'none'"]);
    expect(directives['script-src']).toEqual(["'self'"]);
    expect(headers['content-security-policy']).not.toContain("'unsafe-eval'");
    expect(directives['worker-src']).toEqual(["'self'"]);
    expect(directives['img-src']).toEqual(["'self'",'data:','blob:']);
  });
  it('ağ bağlantısını, form gönderimini, çerçeveleri ve eklentileri engeller',()=>{
    for(const name of ['connect-src','form-action','base-uri','frame-src','frame-ancestors','object-src'])expect(directives[name]).toEqual(["'none'"]);
    expect(headers['x-frame-options']).toBe('DENY');
  });
  it('Plotly için yalnızca boş stil düğümü ve dinamik stil özniteliklerini açar',()=>{
    const emptyHash=`'sha256-${createHash('sha256').update('').digest('base64')}'`;
    expect(directives['style-src']).toEqual(["'self'",emptyHash]);
    expect(directives['style-src-attr']).toEqual(["'unsafe-inline'"]);
    expect(directives['script-src']).not.toContain("'unsafe-inline'");
  });
  it('MIME, yönlendiren ve gereksiz cihaz izinlerini sınırlar',()=>{
    expect(headers['x-content-type-options']).toBe('nosniff');
    expect(headers['referrer-policy']).toBe('no-referrer');
    for(const name of ['camera','microphone','geolocation','usb','serial','hid','display-capture'])expect(headers['permissions-policy']).toContain(`${name}=()`);
    expect(directives['upgrade-insecure-requests']).toEqual([]);
  });
  it('pencere bağlamını ve statik kaynakların siteler arası kullanımını sınırlar',()=>{
    expect(headers['cross-origin-opener-policy']).toBe('same-origin');
    expect(headers['cross-origin-resource-policy']).toBe('same-origin');
  });
});
