import {chromium,firefox,webkit,type Page} from '@playwright/test';
import {spawn} from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import {gzipSync} from 'node:zlib';
import {performance} from 'node:perf_hooks';
import {pngFixture} from '../tests/photo-fixtures.ts';
const evidence=path.resolve('test-results/v2-phase7');await fs.mkdir(evidence,{recursive:true});
const preview=spawn(process.execPath,['node_modules/astro/bin/astro.mjs','preview','--host','127.0.0.1','--port','4387','--ignore-lock'],{stdio:['ignore','pipe','pipe'],windowsHide:true});
let previewOutput='';preview.stdout.on('data',data=>{previewOutput+=String(data);});preview.stderr.on('data',data=>{previewOutput+=String(data);});
const url='http://127.0.0.1:4387';
const large=pngFixture(6000,4000,false);
const results:unknown[]=[];
async function exact(page:Page,x:number,y:number){await page.locator('#photo-point-x').fill(String(x));await page.locator('#photo-point-y').fill(String(y));await page.locator('#photo-add-point').click();}
try{
  let ready=false;for(let i=0;i<100;i++){try{if((await fetch(url)).ok){ready=true;break;}}catch{/* Wait for local preview only. */}await new Promise(resolve=>setTimeout(resolve,100));}if(!ready)throw new Error('Preview unavailable: '+previewOutput);
  for(const [name,engine] of [['chromium',chromium],['firefox',firefox],['webkit',webkit]] as const){
    const browser=await engine.launch();const page=await browser.newPage({viewport:{width:1280,height:720}});
    const scripts:string[]=[];page.on('request',r=>{if(r.url().includes('/_astro/')&&r.url().includes('.js'))scripts.push(r.url().split('/').pop()!);});
    await page.addInitScript(()=>{const live=new Set<string>(),create=URL.createObjectURL.bind(URL),revoke=URL.revokeObjectURL.bind(URL);URL.createObjectURL=blob=>{const u=create(blob);live.add(u);return u;};URL.revokeObjectURL=u=>{live.delete(u);revoke(u);};Object.defineProperty(window,'photoBenchmarkURLs',{get:()=>live.size});});
    await page.goto(url+'/');const homeScripts=[...scripts];scripts.length=0;
    await page.goto(url+'/tools/photo-measurement/');const startupScripts=[...scripts];const beforeWorkers=page.workers().length;
    // Load Playwright's locator instrumentation before the empty-page heap baseline,
    // so the first image trial cannot count automation initialization as lab retention.
    await page.locator('#photo-file').isVisible();
    let heapBefore:number|null=null,heapAfter:number|null=null;const session=name==='chromium'?await page.context().newCDPSession(page):null;
    if(session){await session.send('HeapProfiler.collectGarbage');heapBefore=(await session.send('Runtime.getHeapUsage')).usedSize;}
    const trials=[];
    for(let trial=0;trial<3;trial++){
      await page.evaluate(()=>{const intervals:number[]=[];let last=performance.now();const timer=setInterval(()=>{const now=performance.now();intervals.push(now-last);last=now;},16);Object.assign(window,{photoBenchmarkTick:()=>{clearInterval(timer);return {maxHeartbeatGapMS:Math.max(0,...intervals),samples:intervals.length};}});});
      const start=performance.now();await page.locator('#photo-file').setInputFiles({name:'large-24mp.png',mimeType:'image/png',buffer:large});await page.locator('#photo-status').filter({hasText:'Image opened locally'}).waitFor();const openMS=performance.now()-start;
      if(!await page.locator('.photo-coordinates').evaluate(node=>(node as HTMLDetailsElement).open))await page.locator('.photo-coordinates summary').click();await exact(page,0,0);await exact(page,2400,0);await page.locator('#photo-known').fill('240');await page.locator('#photo-reference').click();
      await exact(page,200,200);await exact(page,1200,200);const exported=page.waitForEvent('download');await page.locator('#photo-json').click();const json=await exported;const jsonPath=path.join(evidence,`${name}-large-${trial}.json`);await json.saveAs(jsonPath);const data=JSON.parse(await fs.readFile(jsonPath,'utf8'));if(Math.abs(data.measurements[0].values.length-100)>1e-8 || data.measurements[0].sourcePoints[1].x!==3000)throw new Error('Large image mapping failed.');
      if(!await page.locator('.photo-settings details').evaluate(node=>(node as HTMLDetailsElement).open))await page.locator('.photo-settings details summary').click();await page.locator('#photo-mode').selectOption('rectify');for(const [x,y] of [[0,0],[2400,0],[2400,1600],[0,1600]])await exact(page,x,y);await page.locator('#photo-surface-width').fill('240');await page.locator('#photo-surface-height').fill('160');
      const correctStart=performance.now();await page.locator('#photo-correct').click();await page.locator('#photo-status').filter({hasText:'Perspective corrected'}).waitFor();const correctionMS=performance.now()-correctStart;
      const tick=await page.evaluate(()=>Reflect.get(window,'photoBenchmarkTick')());
      const png=page.waitForEvent('download');const pngStart=performance.now();await page.locator('#photo-png').click();await png;const pngMS=performance.now()-pngStart;
      await page.locator('#photo-clear').click();await page.waitForFunction(()=>Reflect.get(window,'photoBenchmarkURLs')===0);
      if(page.workers().length!==0)throw new Error('Worker retained after processing.');
      let heapAfterClose:number|null=null;if(session){await session.send('HeapProfiler.collectGarbage');heapAfterClose=(await session.send('Runtime.getHeapUsage')).usedSize;}
      trials.push({openMS,correctionMS,pngMS,...tick,retainedWorkers:page.workers().length,liveObjectURLs:await page.evaluate(()=>Reflect.get(window,'photoBenchmarkURLs')),heapAfterClose});
    }
    if(session){await session.send('HeapProfiler.collectGarbage');heapAfter=(await session.send('Runtime.getHeapUsage')).usedSize;}
    results.push({engine:name,version:browser.version(),homeScripts,startupScripts,beforeWorkers,workerScripts:[...new Set(scripts.filter(s=>s.includes('worker')))],fixture:{width:6000,height:4000,bytes:large.length,workingWidth:2400,workingHeight:1600},trials,heapBefore,heapAfter,heapDelta:heapAfter!==null&&heapBefore!==null?heapAfter-heapBefore:null});await browser.close();
  }
  const html=await fs.readFile('dist/tools/photo-measurement/index.html','utf8'),home=await fs.readFile('dist/index.html','utf8');
  const assets=[];for(const name of await fs.readdir('dist/_astro')){if(name.includes('processing.worker')||html.includes(name)){const bytes=await fs.readFile(path.join('dist/_astro',name));assets.push({name,bytes:bytes.length,gzipBytes:gzipSync(bytes).length,initialPhotoHTML:html.includes(name),initialHomeHTML:home.includes(name)});}}
  const report={timestamp:new Date().toISOString(),definitions:{openMS:'Node wall time from file-input dispatch to rendered success status; includes automation polling and local worker startup/decode/downsample.',correctionMS:'Node wall time from Apply click to rendered success, including snapshot, pixel transfer fallback, worker bilinear warp and bitmap delivery.',pngMS:'Node wall time from Export PNG click to download event.',maxHeartbeatGapMS:'Largest foreground-window 16 ms timer interval during open, setup and correction; includes test automation and scheduling, not an isolated processing-only frame metric.',heap:'Chromium Runtime.getHeapUsage usedSize after forced GC, before first image and after each of three clear cycles in one document. Locator instrumentation is initialized before the empty-page baseline. JS heap only; excludes native decoded bitmap, browser/GPU/process RSS and worker heap. Initialization/JIT/cache/automation overhead can differ from the empty baseline.',cleanup:'No live Playwright Worker objects after each processing/close; export object URLs tracked by create/revoke wrappers return to zero.',nativePixelBudget:'At 24 MP, full decoded raster may reach 96 MB transiently; working bitmap 15.36 MB. Rectification adds source/output RGBA buffers plus a bitmap transiently. Header read bounded to 512 KiB; original encoded File retained until close. This is an estimate, not measured native peak.'},results,assets,photoHTMLBytes:Buffer.byteLength(html),homeHTMLBytes:Buffer.byteLength(home)};
  await fs.writeFile(path.join(evidence,'benchmark.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
}finally{preview.kill();}
