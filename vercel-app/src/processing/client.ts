import { analysisWorkerUrl } from '../worker-urls';
import type { AnalysisRequest, AnalysisResponse, AnalysisResults } from './operations';
export type { AnalysisRequest } from './operations';

export function processAnalysis<R extends AnalysisRequest>(request: R, signal: AbortSignal): Promise<AnalysisResults[R['kind']]> {
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
      if (response.ok) resolve(response.result as AnalysisResults[R['kind']]);else reject(new Error(response.message));
    };
    worker.onerror=()=>{finish();reject(new Error('Dosya işlenemedi. Daha küçük veya geçerli bir dosya deneyin.'));};
    worker.onmessageerror=()=>{finish();reject(new Error('Analiz sonucu okunamadı.'));};
    try {worker.postMessage(request,'bytes' in request ? [request.bytes] : []);}
    catch {finish();reject(new Error('Veri analiz işlemine aktarılamadı.'));}
  });
}
