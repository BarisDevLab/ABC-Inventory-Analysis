import { analysisWorkerUrl } from '../worker-urls';
import type { Analysis, InputTable, Targets } from '../core/abc';
export type AnalysisRequest = {kind:'file';bytes:ArrayBuffer;name:string;targets:Targets}|{kind:'calculate';source:InputTable;targets:Targets};
export type AnalysisResponse = {ok:true;source:InputTable;analysis:Analysis}|{ok:false;message:string};
export function processAnalysis(request: AnalysisRequest, signal: AbortSignal): Promise<{source:InputTable;analysis:Analysis}> {
  if (signal.aborted) return Promise.reject(new Error('İşlem iptal edildi.'));
  return new Promise((resolve,reject)=>{
    let worker:Worker;
    try { worker=new Worker(analysisWorkerUrl,{type:'module'}); }
    catch {reject(new Error('Analiz başlatılamadı. Güncel bir tarayıcı kullanın.'));return;}
    const finish=()=>{clearTimeout(timer);worker.terminate();signal.removeEventListener('abort',abort);};
    const abort=()=>{finish();reject(new Error('İşlem iptal edildi.'));};
    const timer=setTimeout(()=>{finish();reject(new Error('Analiz zaman aşımına uğradı. Daha küçük bir dosya deneyin.'));},120000);
    signal.addEventListener('abort',abort,{once:true});
    worker.onmessage=(event:MessageEvent<AnalysisResponse>)=>{
      finish();const response=event.data;
      if (response.ok) resolve({source:response.source,analysis:response.analysis});else reject(new Error(response.message));
    };
    worker.onerror=()=>{finish();reject(new Error('Dosya işlenemedi. Daha küçük veya geçerli bir dosya deneyin.'));};
    worker.onmessageerror=()=>{finish();reject(new Error('Analiz sonucu okunamadı.'));};
    try {worker.postMessage(request,request.kind==='file'?[request.bytes]:[]);}
    catch {finish();reject(new Error('Veri analiz işlemine aktarılamadı.'));}
  });
}
