let pending:Promise<typeof import('plotly.js')>|undefined;
export function loadPlotly() {
  pending ??= import('plotly.js-basic-dist-min').then(module=>{
    const Plotly=module.default;
    Plotly.register({moduleType:'locale',name:'tr',dictionary:{'Zoom':'Yakınlaştır','Pan':'Kaydır','Reset axes':'Eksenleri sıfırla','Double-click to zoom back out':'Uzaklaştırmak için çift tıklayın','Double-click on legend to isolate one trace':'Tek seriyi göstermek için açıklamaya çift tıklayın'},format:{decimal:',',thousands:'.',grouping:[3]}} as unknown as Parameters<typeof Plotly.register>[0]);
    return Plotly;
  }).catch(error=>{pending=undefined;throw error;});
  return pending;
}
