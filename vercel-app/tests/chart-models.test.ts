import { describe,expect,it } from 'vitest';
import { calculateAbc,sampleData } from '../src/core/abc';
import { distributionModel,paretoModel,visibleRows } from '../src/charts/models';
import { detail } from '../src/ui/format';
describe('Grafiklerin veri ve gösterim sözleşmesi',()=>{
  const analysis=calculateAbc(sampleData());
  it('grup ve sıra filtreleri orijinal kümülatif payları korur',()=>{
    const filtered=visibleRows(analysis,['B','C'],1,5);expect(filtered.map(row=>row.cumulative)).toEqual(analysis.rows.slice(3).map(row=>row.cumulative));expect(analysis.rows.length).toBe(5);
  });
  it('çift eksen ve dinamik eşikleri üretir',()=>{
    const model=paretoModel(analysis.rows,{a:70,b:20,c:10},false,'pan',3);
    expect(model.data[1]).toMatchObject({yaxis:'y2',y:analysis.rows.map(row=>row.cumulative)});expect(model.data[2]).toMatchObject({y:[70,70]});expect(model.data[3]).toMatchObject({y:[90,90]});expect(model.layout.dragmode).toBe('pan');expect(model.layout.uirevision).toBe('3');
  });
  it('yedi bilgi alanı ve HTML kaçışını korur',()=>{
    const source=sampleData();source.rows[0][0]='<img src=x onerror=alert(1)>';const result=calculateAbc(source);const model=paretoModel(result.rows,result.targets,false,'zoom',0);
    const trace=model.data[0] as {customdata:string[][]};expect(trace.customdata[0].length).toBe(7);expect(trace.customdata[0][0]).toContain('&lt;img');
  });
  it('kompakt görünüm değerleri veya payları değiştirmez',()=>{
    const normal=paretoModel(analysis.rows,analysis.targets,false,'zoom',0),compact=paretoModel(analysis.rows,analysis.targets,true,'zoom',0);expect(compact.data).toEqual(normal.data);expect(compact.layout.height).toBe(440);
  });
  it('çok küçük ve sıfır değerler güvenli görünür',()=>{
    expect(detail(2e-300)).not.toBe('0,00');const result=calculateAbc({columns:sampleData().columns,rows:[['a',1,2e-300],['b',0,1]]});
    const model=paretoModel(result.rows,result.targets,false,'zoom',0);expect(model.layout.yaxis?.range?.[1]).toBeGreaterThan(2e-300);expect((model.data[0] as {customdata:string[][]}).customdata[0][2]).not.toBe('0,00');
  });
  it('halka parasal değer payını, merkez ürün sayısını gösterir',()=>{
    const model=distributionModel(analysis);expect(model.data[0]).toMatchObject({values:analysis.summary.map(group=>group.value),labels:['A','B','C'],hole:.76});expect(model.layout.annotations?.[0].text).toContain('<b>5</b>');
  });
  it('500 üründe etiketler seyreltilir, veri atılmaz',()=>{
    const source=sampleData();source.rows=Array.from({length:500},(_,i)=>[`Uzun ürün ${i}`,500-i,1]);const result=calculateAbc(source);const model=paretoModel(result.rows,result.targets,false,'zoom',0);expect(model.layout.xaxis?.tickvals?.length).toBeLessThanOrEqual(8);expect((model.data[0] as {y:number[]}).y.length).toBe(500);
  });
});
