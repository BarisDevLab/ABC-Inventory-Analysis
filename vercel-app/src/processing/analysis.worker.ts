/// <reference lib="webworker" />
import { calculateAbc } from '../core/abc';
import { readInventoryFile } from '../io/read-file';
import type { AnalysisRequest, AnalysisResponse } from './client';

self.onmessage = async (event: MessageEvent<AnalysisRequest>) => {
  try {
    const request=event.data;
    const source=request.kind === 'file' ? await readInventoryFile(request.bytes,request.name) : request.source;
    const response: AnalysisResponse={ok:true,source,analysis:calculateAbc(source,request.targets)};
    self.postMessage(response);
  } catch(error) {
    const response: AnalysisResponse={ok:false,message:error instanceof Error ? error.message : 'Dosya analiz edilemedi. Lütfen dosya biçimini kontrol edin.'};
    self.postMessage(response);
  }
};
