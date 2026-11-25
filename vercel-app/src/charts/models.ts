import type { Data,Layout } from 'plotly.js';
import type { Analysis,AnalysisRow,Group } from '../core/abc';
import { COLORS,detail,escapeHtml,number } from '../ui/format';

export function visibleRows(analysis:Analysis,groups:readonly Group[],first:number,last:number):AnalysisRow[] {
  return analysis.rows.slice(first-1,last).filter(row=>groups.includes(row.group));
}
const base: Partial<Layout>={paper_bgcolor:'#0d1b2e',plot_bgcolor:'#0d1b2e',font:{family:'Segoe UI, sans-serif',color:'#b5c8e1',size:12},separators:',.',hoverlabel:{bgcolor:'#142b48',bordercolor:'#4f8cff',font:{color:'#f0f6ff',size:13},namelength:-1}};
export function paretoModel(rows:readonly AnalysisRow[],targets:Analysis['targets'],compact:boolean,mode:'zoom'|'pan',revision:number):{data:Data[];layout:Partial<Layout>} {
  const x=rows.map((_,index)=>index),maximum=Math.max(0,...rows.slice(0,1).map(row=>row.value)); // globally ranked rows stay descending.
  const custom=rows.map(row=>[escapeHtml(row.product),row.group,detail(row.value),detail(row.share),detail(row.cumulative),detail(row.quantity),detail(row.price)]);
  const hover='<b>%{customdata[0]}</b><br>ABC grubu: %{customdata[1]}<br><br>Yıllık tüketim miktarı: %{customdata[5]}<br>Birim fiyat: %{customdata[6]} TL<br>Yıllık değer: %{customdata[2]} TL<br>Değer payı: %{customdata[3]}%<br>Kümülatif pay: %{customdata[4]}%<extra></extra>';
  const upper=maximum===0?1:Number.isFinite(maximum*1.15)?maximum*1.15:maximum;
  const ticks=Array.from({length:6},(_,index)=>maximum===0?index/5:maximum/5*index);
  const scale=compact&&maximum>=1000?1000:1;
  const interval=Math.max(1,Math.ceil(rows.length/(compact?4:8))),shown=x.filter(index=>index%interval===0);
  return {data:[
    {type:'bar',x,y:rows.map(row=>row.value),name:'Yıllık değer',width:.66,marker:{color:rows.map(row=>COLORS[row.group])},customdata:custom,hovertemplate:hover},
    {type:'scatter',x,y:rows.map(row=>row.cumulative),yaxis:'y2',name:'Kümülatif pay',mode:rows.length<=35?'lines+markers':'lines',line:{color:'#fb7185',width:3},marker:{size:5},customdata:custom,hovertemplate:hover},
    ...[{threshold:targets.a,label:'A/B',color:COLORS.B},{threshold:targets.a+targets.b,label:'B/C',color:COLORS.C}].map(boundary=>({type:'scatter' as const,x:[-.5,rows.length-.5],y:[boundary.threshold,boundary.threshold],yaxis:'y2',mode:'lines' as const,line:{color:boundary.color,width:1.3,dash:'dash' as const},name:`${boundary.label} · %${boundary.threshold}`,hoverinfo:'skip' as const})),
  ],layout:{...base,height:compact?440:475,dragmode:mode,hovermode:'closest',uirevision:String(revision),margin:{l:compact?45:82,r:compact?39:60,t:45,b:compact?110:85},legend:{orientation:'h',x:0,y:compact?-.28:1.12,font:{size:10}},
    xaxis:{range:[-.6,rows.length-.4],tickmode:'array',tickvals:shown,ticktext:shown.map(index=>{const name=rows[index].product;return escapeHtml(name.length>(compact?10:17)?name.slice(0,compact?10:17)+'…':name);}),tickangle:compact?-35:-25,showgrid:false,automargin:true,title:compact?undefined:{text:'Ürünler · Azalan yıllık değer'}},
    yaxis:{range:[0,upper],tickmode:'array',tickvals:ticks,ticktext:ticks.map(value=>detail(value/scale)),gridcolor:'#263b54',zerolinecolor:'#263b54',title:{text:scale===1000?'Bin TL':compact?'TL':'Yıllık değer (TL)'},automargin:true},
    yaxis2:{overlaying:'y',side:'right',range:[0,100],tickmode:'array',tickvals:[0,20,40,60,80,100],ticktext:[0,20,40,60,80,100].map(value=>`%${value}`),showgrid:false,title:compact?undefined:{text:'Kümülatif pay (%)'},automargin:true},
  }};
}
export function distributionModel(analysis:Analysis):{data:Data[];layout:Partial<Layout>} {
  return {data:[{type:'pie',labels:analysis.summary.map(group=>group.group),values:analysis.summary.map(group=>group.value),hole:.76,sort:false,direction:'clockwise',rotation:90,marker:{colors:analysis.summary.map(group=>COLORS[group.group]),line:{color:'#0d1b2e',width:3}},text:analysis.summary.map(group=>group.share>=4?`${group.group} · %${number(group.share)}`:''),textinfo:'text',textposition:'inside',textfont:{color:'#071120',size:12},customdata:analysis.summary.map(group=>[detail(group.value),group.count,detail(group.share)]),hovertemplate:'Grup %{label}<br>Yıllık değer: %{customdata[0]} TL<br>Ürün sayısı: %{customdata[1]}<br>Değer payı: %{customdata[2]}%<extra></extra>'}],layout:{...base,height:290,showlegend:false,margin:{l:8,r:8,t:12,b:12},annotations:[{text:`<b>${analysis.rows.length}</b><br><span style="font-size:12px">toplam ürün</span>`,x:.5,y:.5,showarrow:false,font:{size:29,color:'#e9f0fb'}}]}};
}
