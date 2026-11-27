// Explicitly approved local/production Chrome review. No browser download.
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { mkdir,readFile,writeFile,readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
const root=process.cwd(),base=process.env.ABC_REVIEW_URL??'http://127.0.0.1:4175';
if(!['http://127.0.0.1:4175','https://abc-inventory-analysis.vercel.app'].includes(base))throw new Error('Unapproved review origin');
const production=base.startsWith('https:');
const run=resolve(root,production?'.tmp/live-review':'.tmp/ui-review',new Date().toISOString().replace(/[:.]/g,'-'));
await mkdir(resolve(run,'downloads'),{recursive:true});
const checks=[],errors=[],requests=[],downloads=[],diagnostics=[];
const networkRecords=[],responseHeaders=[];
const result={run,base,checks,errors,requests,downloads,diagnostics,networkRecords,responseHeaders};
const assert=(condition,message)=>{if(!condition)throw new Error(message);checks.push(message);};
const port=await new Promise(done=>{const server=createServer();server.listen(0,'127.0.0.1',()=>{const port=server.address().port;server.close(()=>done(port));});});
const browser=spawn(process.argv[2]??'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',[
  '--headless=new',`--remote-debugging-port=${port}`,'--remote-debugging-address=127.0.0.1',
  `--user-data-dir=${resolve(run,'profile')}`,`--disk-cache-dir=${resolve(run,'cache')}`,`--crash-dumps-dir=${resolve(run,'crashes')}`,
  '--no-first-run','--no-default-browser-check','--disable-sync','--disable-background-networking','--disable-component-update','--disable-domain-reliability','--disable-breakpad',
  '--disable-features=Translate,MediaRouter,OptimizationHints,AutofillServerCommunication',
  ...(!production?['--proxy-server=http://127.0.0.1:9','--proxy-bypass-list=localhost;127.0.0.1;[::1]']:[]),
  '--window-size=1440,1000','about:blank',
],{windowsHide:true,stdio:['ignore','ignore','pipe'],env:{...process.env,TEMP:resolve(root,'.tmp'),TMP:resolve(root,'.tmp')}});
let stderr='';browser.stderr.on('data',data=>{stderr+=data;});
let socket,session,id=0;const pending=new Map(),handlers=[];
function send(method,params={},sessionId=session){return new Promise((resolve,reject)=>{const requestId=++id;const timer=setTimeout(()=>{pending.delete(requestId);reject(new Error(`${method} timed out`));},30000);pending.set(requestId,{resolve,reject,timer});socket.send(JSON.stringify({id:requestId,method,params,...(sessionId?{sessionId}:{})}));});}
async function poll(fn,label,timeout=30000){const start=Date.now();while(Date.now()-start<timeout){try{const value=await fn();if(value)return value;}catch{ /* Retry while the browser is starting or navigating. */ }await delay(150);}throw new Error(`Timed out: ${label}`);}
async function evaluate(expression){const response=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(response.exceptionDetails)throw new Error(response.exceptionDetails.text+' '+response.exceptionDetails.exception?.description);return response.result.value;}
const wait=(expression,label=expression,timeout=30000)=>poll(()=>evaluate(`Boolean(${expression})`),label,timeout);
const click=text=>evaluate(`(()=>{const button=Array.from(document.querySelectorAll('button')).find(el=>el.textContent.trim()===${JSON.stringify(text)}&&!el.disabled&&el.getBoundingClientRect().width);if(!button)throw new Error('Missing button: '+${JSON.stringify(text)});button.click();return true;})()`);
const set=(selector,value)=>evaluate(`(()=>{const input=document.querySelector(${JSON.stringify(selector)});Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,${JSON.stringify(value)});input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));return true;})()`);
async function viewport(width,height,mobile=false){await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile});await send('Emulation.setTouchEmulationEnabled',{enabled:mobile});await delay(500);}
async function screenshot(name,selector){if(selector)await evaluate(`Array.from(document.querySelectorAll(${JSON.stringify(selector)})).find(el=>el.getBoundingClientRect().width).scrollIntoView({block:'start'})`);await delay(400);const image=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});await writeFile(resolve(run,`${name}.png`),Buffer.from(image.data,'base64'));}
async function upload(path,selector='#inventory-file'){const {root:document}=await send('DOM.getDocument');const {nodeId}=await send('DOM.querySelector',{nodeId:document.nodeId,selector});await send('DOM.setFileInputFiles',{nodeId,files:[path]});}
async function download(name){await poll(async()=>{const files=await readdir(resolve(run,'downloads'));return files.includes(name);},name,45000);return readFile(resolve(run,'downloads',name));}
try {
  const version=await poll(async()=>{const response=await fetch(`http://127.0.0.1:${port}/json/version`);return response.json();},'browser startup');result.browser=version.Browser;
  socket=new WebSocket(version.webSocketDebuggerUrl);await new Promise((resolve,reject)=>{socket.onopen=resolve;socket.onerror=reject;});
  socket.onmessage=event=>{const data=JSON.parse(event.data);if(data.id){const request=pending.get(data.id);if(request){clearTimeout(request.timer);pending.delete(data.id);data.error?request.reject(new Error(JSON.stringify(data.error))):request.resolve(data.result);}}else{for(const handler of handlers)handler(data);}};
  handlers.push(event=>{
    if(event.method==='Runtime.exceptionThrown')errors.push(event.params.exceptionDetails.exception?.description??event.params.exceptionDetails.text);
    if(event.method==='Runtime.consoleAPICalled'&&event.params.type==='error')diagnostics.push(event.params.args.map(arg=>arg.description??arg.value).join(' '));
    if(event.method==='Network.loadingFailed')diagnostics.push(event.params.errorText);
    if(event.method==='Target.attachedToTarget'){
      void (async()=>{
        try {
          await send('Network.enable',{},event.params.sessionId);
          await send('Runtime.enable',{},event.params.sessionId);
        } finally { await send('Runtime.runIfWaitingForDebugger',{},event.params.sessionId); }
      })().catch(error=>errors.push('Worker instrumentation: '+error.message));
    }
    if(event.method==='Network.requestWillBeSent'){
      const request=event.params.request;requests.push(request.url);
      networkRecords.push({url:request.url,method:request.method,resourceType:event.params.type,hasPostData:request.hasPostData??false,bodyBytes:request.postData?Buffer.byteLength(request.postData):0,worker:!!event.sessionId&&event.sessionId!==session});
    }
    if(event.method==='Network.responseReceived'&&event.params.type==='Document')responseHeaders.push(event.params.response.headers);
    if(event.method==='Browser.downloadWillBegin')downloads.push({filename:event.params.suggestedFilename,url:event.params.url});
    if(event.method==='Fetch.requestPaused'){
      const url=event.params.request.url;
      const local=url.startsWith(base+'/')||/^(blob:|data:)/.test(url);
      void send(local?'Fetch.continueRequest':'Fetch.failRequest',{requestId:event.params.requestId,...(!local?{errorReason:'BlockedByClient'}:{})},event.sessionId).catch(()=>{});
      if(!local)errors.push('Blocked external request: '+url);
    }
  });
  await send('Browser.setDownloadBehavior',{behavior:'allow',downloadPath:resolve(run,'downloads'),eventsEnabled:true},undefined);
  const target=await send('Target.createTarget',{url:'about:blank'},undefined);session=(await send('Target.attachToTarget',{targetId:target.targetId,flatten:true},undefined)).sessionId;
  await send('Page.enable');await send('Runtime.enable');await send('Network.enable');await send('Fetch.enable',{patterns:[{urlPattern:'http*',requestStage:'Request'}]});
  await send('Target.setAutoAttach',{autoAttach:true,waitForDebuggerOnStart:true,flatten:true});
  await send('Page.addScriptToEvaluateOnNewDocument',{source:`window.__cspViolations=[];document.addEventListener('securitypolicyviolation',event=>window.__cspViolations.push({directive:event.effectiveDirective,blockedURI:event.blockedURI,disposition:event.disposition}));`});
  await send('Page.addScriptToEvaluateOnNewDocument',{source:`window.__audit={longTasks:[],maxTimerDelay:0};let last=performance.now();setInterval(()=>{const now=performance.now();window.__audit.maxTimerDelay=Math.max(window.__audit.maxTimerDelay,now-last-50);last=now;},50);try{new PerformanceObserver(list=>{for(const entry of list.getEntries())window.__audit.longTasks.push(entry.duration);}).observe({entryTypes:['longtask']});}catch{}`});
  await viewport(1440,1000);await send('Page.navigate',{url:base});await wait("document.querySelector('.empty-state')");
  assert(await evaluate("document.querySelectorAll('[data-kpi]').length===0"),'First load has no automatic demo');
  assert(!requests.some(url=>url.includes('plotly-basic')),'Plotly not requested before analysis');await screenshot('01-desktop-empty');
  assert(!requests.some(url=>/exceljs(?:\.min|-browser)/.test(url)),'ExcelJS not requested before file or report work');
  result.initialRequests=requests.filter(url=>url.startsWith(base+'/'));
  await click('Örnek veriyle dene');await wait("document.querySelector('.plot-host')?.data?.length===4",'Pareto rendered');await wait("document.querySelectorAll('.plot-host.js-plotly-plot').length===2",'Two charts rendered');
  assert(await evaluate("document.querySelector('[data-kpi=total]').dataset.value==='304.000,00 TL'"),'Demo total matches Python');await screenshot('02-desktop-dashboard','.section-heading');await screenshot('03-desktop-pareto','.chart-container');
  await screenshot('03b-desktop-distribution','section[aria-labelledby="distribution-heading"]');await screenshot('03c-desktop-results','section[aria-labelledby="results-heading"]');await screenshot('03d-desktop-report','section[aria-labelledby="report-heading"]');
  await click('Dağılım grafiğini PNG indir');const donutPng=await download('abc_deger_dagilimi.png');assert(donutPng.readUInt32BE(16)===2880,'Distribution PNG download works');
  await evaluate("document.querySelector('.group-filters input').click()");await wait("document.querySelector('.plot-host').data[0].y.length===2");
  assert(await evaluate("document.querySelector('.plot-host').data[1].y[0]>96&&document.querySelector('[data-kpi=total]').dataset.value==='304.000,00 TL'"),'Filter preserves original cumulative shares and KPIs');
  await click('PNG indir');const png=await download('abc_pareto_analizi.png');assert(png.readUInt32BE(16)===2880&&png.readUInt32BE(20)===1600,'Real PNG download is 2880x1600');
  await click('Excel analiz raporunu indir');const report=await download('abc_stok_analiz_raporu.xlsx');assert(report[0]===0x50&&report[1]===0x4b,'Real worker Excel report downloads');
  await click('Boş Excel şablonu indir');await download('stok_sablonu.xlsx');assert(true,'Empty template downloads');
  await evaluate("document.querySelector('nav a[href=\"#rehber\"]').click()");await wait("document.querySelectorAll('[role=tab]').length===4");await screenshot('04-desktop-guide','.page-hero');
  for(let index=1;index<4;index++){await evaluate(`document.querySelectorAll('[role=tab]')[${index}].click()`);await screenshot(`04b-guide-topic-${index}`,'.guide-tabs');}
  assert(await evaluate("document.querySelector('[role=tabpanel]').textContent.includes('Tedarik Zinciri Yönetimi')"),'Guide engineering content present');
  await click('← Analiz paneline dön');await wait("!document.querySelector('.page-hero').parentElement.hidden");assert(await evaluate("document.querySelector('[data-kpi=total]').dataset.value==='304.000,00 TL'"),'Guide return preserves analysis');
  await set('#target-a',90);await click('Hedefleri uygula');assert(await evaluate("document.querySelector('[role=alert]').textContent.includes('Önceki geçerli hedefler')"),'Invalid targets retain previous settings');
  await set('#target-a',0);await set('#target-b',0);await set('#target-c',100);await click('Hedefleri uygula');await wait("document.querySelector('[data-kpi=C]').dataset.value==='5'");
  assert(await evaluate("document.querySelector('[data-kpi=a_share]').dataset.value==='%0,00'"),'Valid targets recalculate through real analysis worker');
  await set('#target-a',80);await set('#target-b',15);await set('#target-c',5);await click('Hedefleri uygula');await wait("document.querySelector('[data-kpi=A]').dataset.value==='3'");
  for(const name of ['csv-cp1254-semicolon.csv','xlsx-demo.xlsx']){await upload(resolve(root,'tests/fixtures/files',name));await wait(`document.querySelector('.file-name')?.textContent===${JSON.stringify(name)}`);assert(await evaluate("document.querySelector('[data-kpi=total]').dataset.value==='304.000,00 TL'"),'Real file/worker upload: '+name);}
  const droppedCsv='Ürün;Yıllık Tüketim;Birim Fiyat (TL)\nSürüklenen parça;2;3';
  await evaluate(`(()=>{const transfer=new DataTransfer();transfer.items.add(new File([${JSON.stringify(droppedCsv)}],'drop.csv',{type:'text/csv'}));document.querySelector('.drop-zone').dispatchEvent(new DragEvent('drop',{bubbles:true,cancelable:true,dataTransfer:transfer}));return true;})()`);
  await wait("document.querySelector('.file-name')?.textContent==='drop.csv'");assert(await evaluate("document.querySelector('[data-kpi=total]').dataset.value==='6,00 TL'"),'Browser drop event uses real analysis worker');
  await upload(resolve(root,'tests/fixtures/files/xlsx-demo.xlsx'));await wait("document.querySelector('.file-name')?.textContent==='xlsx-demo.xlsx'");
  await upload(resolve(root,'tests/fixtures/files/xlsx-corrupt.xlsx'));await wait("document.querySelector('.notice.error')");assert(await evaluate("document.querySelector('[data-kpi=total]').dataset.value==='304.000,00 TL'"),'Corrupt Excel preserves prior valid analysis');
  const longFile=resolve(run,'sixty.csv');await writeFile(longFile,'Ürün;Yıllık Tüketim;Birim Fiyat (TL)\n'+Array.from({length:60},(_,i)=>`Uzun mühendislik ürün adı ${i+1};${60-i};12.5`).join('\n'));
  await upload(longFile);await wait("document.querySelector('[data-kpi=products]').dataset.value==='60'");await evaluate("document.querySelector('.group-filters input').click()");await wait("document.querySelector('.plot-host').data[0].y.length===60");
  assert(await evaluate("document.querySelector('.table-scroll[aria-label=\"Ürün bazlı ABC sonuçları\"] tbody').rows.length===50"),'Large table is paginated');await screenshot('05-desktop-sixty','.chart-container');
  await click('Yakınlaştır');await evaluate("document.querySelector('.plot-host').scrollIntoView({block:'center'})");
  const box=await evaluate("(()=>{const b=document.querySelector('.plot-host .nsewdrag').getBoundingClientRect();return {x:b.x,y:b.y,w:b.width,h:b.height};})()");
  async function drag(x1,y1,x2,y2){await send('Input.dispatchMouseEvent',{type:'mouseMoved',x:x1,y:y1});await send('Input.dispatchMouseEvent',{type:'mousePressed',x:x1,y:y1,button:'left',buttons:1,clickCount:1});for(let step=1;step<=8;step++)await send('Input.dispatchMouseEvent',{type:'mouseMoved',x:x1+(x2-x1)*step/8,y:y1+(y2-y1)*step/8,button:'left',buttons:1});await send('Input.dispatchMouseEvent',{type:'mouseReleased',x:x2,y:y2,button:'left',buttons:0,clickCount:1});}
  await drag(box.x+box.w*.15,box.y+box.h*.2,box.x+box.w*.65,box.y+box.h*.8);
  await wait("document.querySelector('.plot-host').layout.xaxis.range[1]-document.querySelector('.plot-host').layout.xaxis.range[0]<40");assert(true,'Real mouse selection zooms plot');
  const priorSpan=await evaluate("document.querySelector('.plot-host').layout.xaxis.range[1]-document.querySelector('.plot-host').layout.xaxis.range[0]");
  await send('Input.dispatchMouseEvent',{type:'mouseWheel',x:box.x+box.w*.5,y:box.y+box.h*.5,deltaY:-150,deltaX:0});await wait(`document.querySelector('.plot-host').layout.xaxis.range[1]-document.querySelector('.plot-host').layout.xaxis.range[0]<${priorSpan}`);assert(true,'Real mouse wheel zoom works');
  await click('Kaydır');assert(await evaluate("document.querySelector('.plot-host').layout.dragmode==='pan'"),'Pan mode works');
  const oldLeft=await evaluate("document.querySelector('.plot-host').layout.xaxis.range[0]");await drag(box.x+box.w*.5,box.y+box.h*.5,box.x+box.w*.65,box.y+box.h*.5);await wait(`Math.abs(document.querySelector('.plot-host').layout.xaxis.range[0]-${oldLeft})>.1`);assert(true,'Real mouse drag pans plot');
  await click('Görünümü sıfırla');await wait("document.querySelector('.plot-host').layout.xaxis.range[0]===-.6");assert(true,'Reset restores chart range');
  const bar=await evaluate("(()=>{const b=document.querySelector('.plot-host .barlayer .point path').getBoundingClientRect();return {x:b.x+b.width/2,y:b.y+Math.min(20,b.height/2)};})()");
  await send('Input.dispatchMouseEvent',{type:'mouseMoved',x:bar.x,y:bar.y});await wait("document.querySelector('.plot-host .hoverlayer').textContent.includes('Yıllık tüketim miktarı')");assert(true,'Real hover shows Turkish quantity/price/value details');await screenshot('05b-desktop-tooltip');
  result.performanceSamples=[];
  for(const count of [500,2000,5000]){
    const performanceFile=resolve(run,`performance-${count}.csv`);await writeFile(performanceFile,'Ürün;Yıllık Tüketim;Birim Fiyat (TL)\n'+Array.from({length:count},(_,i)=>`Sentetik ürün ${i+1};${count-i};10`).join('\n'));
    const before=await send('Runtime.getHeapUsage');await evaluate('window.__audit={longTasks:[],maxTimerDelay:0}');
    const performanceStart=Date.now();await upload(performanceFile);
    await wait(`document.querySelector('[data-kpi=products]').dataset.value.replaceAll('.','')==='${count}'&&document.querySelector('.plot-host .barlayer').querySelectorAll('.point path').length===${count}`,`Render ${count} products`,60000);
    await evaluate('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))');
    const elapsed=Date.now()-performanceStart,after=await send('Runtime.getHeapUsage'),responsiveness=await evaluate('window.__audit');
    result.performanceSamples.push({rows:count,fileToRenderedChartMilliseconds:elapsed,pageHeapBeforeBytes:before.usedSize,pageHeapAfterBytes:after.usedSize,...responsiveness});
    if(count===500)result.performance={rows:count,fileToRenderedChartMilliseconds:elapsed};
    assert(true,`${count} synthetic products render without dropping chart data`);
    await screenshot(`05c-desktop-${count}`,'.chart-container');
  }
  await upload(longFile);await wait("document.querySelector('[data-kpi=products]').dataset.value==='60'&&document.querySelector('.plot-host').data[0].y.length===60");
  for(const [width,height,label] of [[820,1180,'tablet'],[390,844,'mobile'],[360,800,'small-mobile']]){
    await viewport(width,height,true);await screenshot(`06-${label}-dashboard`,'.section-heading');
    assert(await evaluate('document.documentElement.scrollWidth<=window.innerWidth+1'),`${label}: no horizontal page overflow`);
    const compact=await evaluate("document.querySelector('.chart-toolbar label input').checked");if(!compact)await evaluate("document.querySelector('.chart-toolbar label input').click()");
    await screenshot(`07-${label}-pareto`,'.chart-container');
    if(label==='mobile'){await screenshot('07b-mobile-distribution','section[aria-labelledby="distribution-heading"]');await screenshot('07c-mobile-results','section[aria-labelledby="results-heading"]');await screenshot('07d-mobile-report','section[aria-labelledby="report-heading"]');}
    await click('☰');assert(await evaluate("document.querySelector('.menu-toggle').getAttribute('aria-expanded')==='true'"),`${label}: mobile navigation opens`);await screenshot(`08-${label}-menu`);
    await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
    assert(await evaluate("document.querySelector('.menu-toggle').getAttribute('aria-expanded')==='false'&&document.activeElement.classList.contains('menu-toggle')"),`${label}: Escape closes menu and restores focus`);
    await click('☰');await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});
    assert(await evaluate("document.activeElement.closest('#sidebar')!==null"),`${label}: keyboard focus remains in open navigation`);
    await evaluate("document.querySelector('nav a[href=\"#rehber\"]').click()");await wait("document.querySelector('[role=tablist]')");await screenshot(`09-${label}-guide`,'.guide-tabs');assert(await evaluate('document.documentElement.scrollWidth<=window.innerWidth+1'),`${label}: guide has no page overflow`);await click('← Analiz paneline dön');
  }
  await viewport(1440,1000);const tiny=resolve(run,'tiny.csv');await writeFile(tiny,'Ürün;Yıllık Tüketim;Birim Fiyat (TL)\nHassas parça;1;2e-300\nİkinci;1;4e-301');await upload(tiny);await wait("document.querySelector('[data-kpi=products]').dataset.value==='2'");
  await wait("document.querySelector('.plot-host').data[0].y[0]===2e-300");assert(await evaluate("document.querySelector('.plot-host').data[0].customdata[0][2]!=='0,00'"),'Tiny values retain nonzero tooltip');await screenshot('10-desktop-tiny','.chart-container');
  const unsafe=resolve(run,'unsafe-name.csv');await writeFile(unsafe,'Ürün;Yıllık Tüketim;Birim Fiyat (TL)\n<img src=x onerror="window.__injected=1">;1;10');await upload(unsafe);await wait("document.querySelector('[data-kpi=products]').dataset.value==='1'");
  assert(await evaluate("!document.querySelector('img[src=x]')&&!window.__injected"),'User product markup is text, not executable DOM');
  await click('Analizi temizle');assert(await evaluate("document.querySelectorAll('[data-kpi]').length===0"),'Clear returns to empty state');

  if (!production) {
    const select = (selector, value) => evaluate(`(()=>{
      const select=document.querySelector(${JSON.stringify(selector)});
      select.value=${JSON.stringify(value)};
      select.dispatchEvent(new Event('change',{bubbles:true}));
    })()`);
    const clickSelector = selector => evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`);
    const total = value => `document.querySelector('[data-kpi=total]')?.dataset.value===${JSON.stringify(value)}`;
    const comparison = '#comparison-heading + details';
    const library = '#library-heading + details';
    const history = library + ' + details';

    await upload(resolve(root,'tests/fixtures/files/xlsx-first-sheet-only.xlsx'));
    await wait(total('304.000,00 TL'));
    await select('.inventory-editor select','1');
    await wait("document.querySelector('.inventory-editor tbody').textContent.includes('Yanlış sayfa')");
    await click('Eşleştirmeyi analiz et');
    await wait(total('100.000.000,00 TL'));
    assert(true,'Excel worksheet selection calculates the chosen sheet in the worker');

    const current = resolve(run,'guncel-donem.csv');
    await writeFile(current,'Güncel dönem raporu\nUnit Price;SKU;Product;Quantity\n1.234;002;Yeni motor;1\n1;001;Vida;15\n1;004;Giren;5');
    await upload(current);
    await wait("document.querySelector('.inventory-editor tbody')?.textContent.includes('Unit Price')");
    await set('.inventory-editor input[type=number]',2);
    await click('Başlık satırını uygula');
    await wait("!document.querySelector('.inventory-editor button.primary').disabled");
    await click('Eşleştirmeyi analiz et');
    await wait(total('21,23 TL'));
    assert(await evaluate("document.querySelector('.inventory-warning').textContent.includes('1 belirsiz sayı')"),'Ambiguous decimals are reported beside the custom header and mapping');
    await select('.inventory-editor select:has(option[value=tr])','tr');
    await click('Eşleştirmeyi analiz et');
    await wait(total('1.254,00 TL'));
    assert(await evaluate("document.querySelector('#results-heading').closest('section').textContent.includes('002')"),'Explicit locale reanalysis retains the SKU');

    const previous = resolve(run,'onceki-donem.csv');
    await writeFile(previous,'Ürün;Yıllık Tüketim;Birim Fiyat (TL);SKU\nVida;80;1;001\nEski motor;15;1;002\nÇıkan;5;1;003');
    await clickSelector(comparison+' summary');
    await upload(previous,comparison+' input[type=file]');
    await wait(`document.querySelector('${comparison} .inventory-editor button.primary')?.disabled===false`);
    await clickSelector(comparison+' .inventory-editor button.primary');
    await wait(`document.querySelector('${comparison} > p:last-of-type').textContent.includes('onceki-donem.csv')`);
    await click('Dönemleri karşılaştır');
    await wait(`document.querySelector('${comparison}').textContent.includes('2 sınıf değiştiren · 1 eklenen · 1 çıkarılan')`);
    assert(await evaluate(`document.querySelector('${comparison}').textContent.includes('1.154,00 TL')`),'Period comparison shows monetary deltas, additions, removals, and SKU transitions');
    await screenshot('11-period-comparison',comparison);

    await clickSelector(comparison+' + details summary');
    await set(comparison+' + details label:nth-child(1) input',0);
    await set(comparison+' + details label:nth-child(2) input',0);
    await click('Eşikleri karşılaştır');
    await wait(`document.querySelector('${comparison} + details').textContent.includes('1 ürünün sınıfı değişiyor')`);
    assert(await evaluate(total('1.254,00 TL')),'Scenario leaves the primary dashboard unchanged');

    await viewport(390,844,true);
    assert(await evaluate('document.documentElement.scrollWidth<=window.innerWidth+1'),'Expanded inventory modules fit the mobile viewport');
    await viewport(1440,1000);
    await clickSelector(library+' summary');
    await click('JSON analiz paketini indir');
    const json = JSON.parse(await download('abc-analiz-paketi.json'));
    assert(json.version===1&&json.rows[0][3]==='002','Downloaded JSON contains the recomputable, versioned SKU analysis');
    assert(await evaluate("indexedDB.databases().then(items=>!items.some(item=>item.name==='abc-inventory-user-history'))"),'Ordinary imports, comparisons and JSON download never persist a history database');
    await clickSelector(history+' summary');
    await wait(`document.querySelector('${history}').textContent.includes('Henüz kayıtlı analiz yok.')`);
    await click('Analizi geçmişe kaydet');
    await wait("document.querySelector('.inventory-history li')?.textContent.includes('guncel-donem.csv')");
    await send('Page.reload');
    await wait("document.querySelector('.empty-state')");
    await clickSelector(history+' summary');
    await wait("document.querySelector('.inventory-history li')");
    await click('Aç');
    await wait(total('1.254,00 TL'));
    assert(true,'Explicitly saved analysis restores after browser reload');
    await click('Tüm geçmişi sil');
    await click('Silme işlemini onayla');
    await wait(`document.querySelector('${history}').textContent.includes('Henüz kayıtlı analiz yok.')`);
    await click('Analizi temizle');
    await clickSelector(library+' summary');
    await upload(resolve(run,'downloads','abc-analiz-paketi.json'),library+' input[type=file]');
    await wait(total('1.254,00 TL'));
    assert(true,'JSON import recalculates the saved analysis through the real worker');
    await send('Page.reload');
    await wait("document.querySelector('.empty-state')");
    await clickSelector(history+' summary');
    await wait(`document.querySelector('${history}').textContent.includes('Henüz kayıtlı analiz yok.')`);
    assert(true,'History deletion and default non-persistence survive browser reload');
  }
  assert(errors.length===0,'No page runtime errors or blocked application requests');assert(!requests.some(url=>/^https?:/.test(url)&&!url.startsWith(base+'/')),'No external page requests');
  assert(!requests.some(url=>url.includes('exceljs.min')),'Old prebuilt ExcelJS bundle was never requested');
  result.cspViolations=await evaluate('window.__cspViolations');
  assert(result.cspViolations.length===0,'No CSP violations during real interaction and downloads');
  assert(networkRecords.filter(record=>/^https?:/.test(record.url)).every(record=>['GET','HEAD'].includes(record.method)&&!record.hasPostData&&!record.bodyBytes),'No HTTP request bodies or upload methods in page and workers');
  assert(networkRecords.filter(record=>/^https?:/.test(record.url)).every(record=>{const url=new URL(record.url);return !url.search&&(/^\/$|^\/favicon\.ico$|^\/assets\/[A-Za-z0-9_.-]+\.(js|css)$/.test(url.pathname));}),'Only static resource URLs without query payloads requested');
  const headers=Object.fromEntries(Object.entries(responseHeaders[0]??{}).map(([key,value])=>[key.toLowerCase(),value]));
  assert(headers['content-security-policy']?.includes("connect-src 'none'")&&headers['content-security-policy']?.includes("frame-ancestors 'none'")&&headers['x-frame-options']==='DENY'&&headers['x-content-type-options']==='nosniff'&&headers['referrer-policy']==='no-referrer'&&!!headers['permissions-policy'],'Security response headers delivered to real browser');
  result.success=true;
}catch(error){result.success=false;result.failure=error.stack;console.error(error.stack);try{result.failurePage=await evaluate('document.documentElement.outerHTML.slice(0,5000)');await screenshot('failure');}catch{ /* The browser may already be unavailable. */ }}
finally {
  if(socket?.readyState===1){try{result.cspViolations=await evaluate('window.__cspViolations??[]');}catch{ /* The page may already be unavailable. */ }}
  if(socket?.readyState===1){try{await send('Browser.close',{},undefined);}catch{ /* Close the socket even if Chrome has exited. */ }socket.close();}browser.kill();
  await writeFile(resolve(run,'review.json'),JSON.stringify(result,null,2));await writeFile(resolve(run,'browser-stderr.txt'),stderr);
  console.log(JSON.stringify({success:result.success,checks:checks.length,errors:errors.length,run,failure:result.failure},null,2));
  process.exitCode=result.success?0:1;
}
