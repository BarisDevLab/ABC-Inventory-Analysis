import type { Analysis } from '../core/abc';
import { money,number,percent } from '../ui/format';
export function KpiOverview({analysis}:{analysis:Analysis}) {
  const cards=[{key:'total',label:'Toplam yıllık tüketim değeri',value:money(analysis.total),note:'Yıllık tüketim × birim fiyat · Tüm ürünler',icon:'₺'},
    {key:'products',label:'Analiz edilen ürün',value:number(analysis.rows.length,0),note:'Benzersiz stok kalemi',icon:'▦'},
    {key:'a_share',label:'A grubunun gerçekleşen payı',value:percent(analysis.insights.a_share),note:`Hedef %${analysis.targets.a} · Parasal değer payı`,icon:'◷'},
    ...analysis.summary.map(group=>({key:group.group,label:`${group.group} grubu ürün sayısı`,value:String(group.count),note:`Toplam parasal değerin ${percent(group.share)} bölümü`,icon:group.group}))];
  return <section className="kpi-grid" aria-label="Envanter göstergeleri">{cards.map(card=><article key={card.key} className={`kpi kpi-${card.key}`} data-kpi={card.key} data-value={card.value}><div className="kpi-label"><span className="kpi-icon" aria-hidden="true">{card.icon}</span>{card.label}</div><strong className="kpi-value">{card.value}</strong><span className="kpi-note">{card.note}</span>{['A','B','C'].includes(card.key)&&<div className="kpi-rail" aria-hidden="true"><span style={{width:`${analysis.summary.find(group=>group.group===card.key)!.share}%`}}/></div>}</article>)}</section>;
}
