import { chromium, firefox, webkit } from '@playwright/test';
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { gzipSync } from 'node:zlib';

const evidence = path.resolve(process.env.WG_QA_DIR ?? 'test-results/v2-phase9');
await fs.mkdir(evidence,{recursive:true});
const preview = spawn(process.execPath,['node_modules/astro/bin/astro.mjs','preview','--host','127.0.0.1','--port','4388','--ignore-lock'],{stdio:['ignore','pipe','pipe'],windowsHide:true});
let output='';preview.stdout.on('data',data=>{output+=String(data);});preview.stderr.on('data',data=>{output+=String(data);});
const base='http://127.0.0.1:4388', results=[];
try {
  let ready=false;for(let i=0;i<100;i++){try{if((await fetch(base)).ok){ready=true;break;}}catch{/* local preview */}await new Promise(resolve=>setTimeout(resolve,100));}if(!ready)throw new Error(output);
  for(const [engineName,engine] of [['chromium',chromium],['firefox',firefox],['webkit',webkit]] as const) {
    const browser=await engine.launch();
    try {
      for(const route of ['/', '/tools/', '/tools/engine-sound-analyzer/', '/tools/photo-measurement/']) {
        const trials=[];
        for(let i=0;i<3;i++) {
          const context=await browser.newContext({viewport:{width:1280,height:720}}),page=await context.newPage();
          const errors:string[]=[],scripts:string[]=[];page.on('pageerror',error=>errors.push(error.message));page.on('request',r=>{if(r.url().includes('/_astro/')&&r.url().includes('.js'))scripts.push(r.url().split('/').pop()!);});
          await page.addInitScript(()=>{
            const metrics:{lcpMS:number|null;longTasks:number[]}={lcpMS:null,longTasks:[]};Reflect.set(window,'releaseMetrics',metrics);
            if(PerformanceObserver.supportedEntryTypes.includes('largest-contentful-paint'))new PerformanceObserver(list=>{metrics.lcpMS=list.getEntries().at(-1)?.startTime??null;}).observe({type:'largest-contentful-paint',buffered:true});
            if(PerformanceObserver.supportedEntryTypes.includes('longtask'))new PerformanceObserver(list=>{metrics.longTasks.push(...list.getEntries().map(e=>e.duration));}).observe({type:'longtask',buffered:true});
          });
          const start=performance.now();await page.goto(base+route,{waitUntil:'load'});const loadWallMS=performance.now()-start;
          if(route.includes('engine'))await page.locator('#sound-analyzer').waitFor();
          if(route.includes('photo'))await page.waitForFunction(()=>document.querySelector('#photo-lab')?.getAttribute('aria-busy')==='false');
          // A fixed 500 ms observation window after load; not network idle or a
          // full Lighthouse/device score. Includes actual external font fetches.
          await page.waitForTimeout(500);
          const metrics=await page.evaluate(()=>{
            const nav=window.performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
            const resources=window.performance.getEntriesByType('resource') as PerformanceResourceTiming[];
            const observed=Reflect.get(window,'releaseMetrics');
            return {domContentLoadedMS:nav.domContentLoadedEventEnd,loadEventMS:nav.loadEventEnd,fcpMS:window.performance.getEntriesByName('first-contentful-paint')[0]?.startTime??null,lcpMS:observed.lcpMS,longTasks:observed.longTasks,resources:resources.map(r=>({name:r.name,transferBytes:r.transferSize,encodedBytes:r.encodedBodySize,durationMS:r.duration})),audioAvailable:!!window.AudioContext};
          });
          if(errors.length)throw new Error(errors.join('; '));
          if(scripts.some(name=>name.includes('processing.worker')))throw new Error('Photo worker loaded before image processing');
          let jsHeapAfterGC:number|null=null;
          if(engineName==='chromium'){const cdp=await context.newCDPSession(page);await cdp.send('HeapProfiler.collectGarbage');jsHeapAfterGC=(await cdp.send('Runtime.getHeapUsage')).usedSize;}
          trials.push({loadWallMS,...metrics,scripts,liveWorkers:page.workers().length,jsHeapAfterGC});await context.close();
        }
        results.push({engine:engineName,version:browser.version(),route,trials});
      }
    } finally {await browser.close();}
  }
  const assets=[];for(const name of await fs.readdir('dist/_astro')){const bytes=await fs.readFile(path.join('dist/_astro',name));assets.push({name,bytes:bytes.length,gzipBytes:gzipSync(bytes).length});}
  const report={timestamp:new Date().toISOString(),scope:'Local production preview on Windows, three new isolated desktop contexts per route/engine; no network/CPU throttling; external Google fonts remain live. DCL/load/FCP/LCP use Performance APIs where supported; LCP and long tasks sampled through 500 ms after load (null means unsupported/unobserved). Node loadWallMS includes automation. Resource transferSize zero can mean cross-origin timing restrictions, not zero traffic. JS heap is Chromium page heap after forced GC; excludes workers/native/GPU/RSS. No physical phone, production latency, Web Audio certification or Lighthouse score is claimed.',results,assets};
  await fs.writeFile(path.join(evidence,'startup-benchmark.json'),JSON.stringify(report,null,2));
  console.log(JSON.stringify(report,null,2));
} finally {preview.kill();}
