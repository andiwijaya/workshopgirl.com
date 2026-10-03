import {test,expect,type Page,type TestInfo} from '@playwright/test';
import fs from 'node:fs/promises';
import {pngFixture,exifJPEG,webpFixture} from './photo-fixtures.ts';
import {project,type View} from '../src/lib/photo/geometry.ts';
const fixture=pngFixture(),sizes=[[390,844],[430,932],[768,1024],[1024,768],[1280,720],[1440,900]];
async function open(page:Page,buffer=fixture,name='grid.png'){await page.locator('#photo-file').setInputFiles({name,mimeType:'image/png',buffer});await expect(page.locator('#photo-status')).toContainText('Image opened locally');}
async function mode(page:Page,value:string){await page.locator('#photo-mode').selectOption(value);}
async function exact(page:Page,x:number,y:number){const details=page.locator('.photo-coordinates');if(!await details.evaluate(node=>(node as HTMLDetailsElement).open))await details.locator('summary').click();await page.locator('#photo-point-x').fill(String(x));await page.locator('#photo-point-y').fill(String(y));await page.locator('#photo-add-point').click();}
async function reference(page:Page){await mode(page,'reference');await exact(page,100,100);await exact(page,200,100);await page.locator('#photo-reference').click();await expect(page.locator('#photo-calibration')).toContainText('0.1 mm');}
async function report(page:Page,info:TestInfo,name='report.json') {const pending=page.waitForEvent('download');await page.locator('#photo-json').click();const download=await pending;expect(download.suggestedFilename()).toMatch(/^[\w-]+\.json$/);const path=info.outputPath(name);await download.saveAs(path);return JSON.parse(await fs.readFile(path,'utf8'));}
async function fitView(page:Page,width=1000,height=1000):Promise<View>{await page.locator('#photo-fit').click();const box=(await page.locator('#photo-canvas').boundingBox())!;const scale=Math.min(box.width/width,box.height/height)*.92;return{scale,x:(box.width-width*scale)/2,y:(box.height-height*scale)/2};}
async function clickPoint(page:Page,x:number,y:number,view:View){const canvas=page.locator('#photo-canvas');await canvas.scrollIntoViewIfNeeded();const box=(await canvas.boundingBox())!;await page.mouse.click(box.x+view.x+x*view.scale,box.y+view.y+y*view.scale);}

test('Photo grid: six responsive viewports, calibrated measurements, annotations, undo/redo and correct PNG/JSON',async({page},info)=>{
  test.setTimeout(180000);const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/tools/#measure-build');await page.locator('a[href="/tools/photo-measurement/"]').click();await expect(page).toHaveURL(/\/tools\/photo-measurement\/$/);await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href','https://workshopgirl.com/tools/photo-measurement/');await expect(page.locator('#site-navigation [aria-current="page"]')).toHaveText('Tools');await expect(page.locator('[data-journey="photoMeasurement"] a')).toHaveCount(3);
  for(const [width,height] of sizes){
    await page.setViewportSize({width,height});await page.goto('/tools/photo-measurement/');await open(page);await reference(page);
    await mode(page,'distance');let view=await fitView(page);await clickPoint(page,300,300,view);await clickPoint(page,600,700,view);
    await expect(page.locator('#photo-list')).toContainText('distance');
    await mode(page,'angle');view=await fitView(page);for(const [x,y] of [[300,200],[300,300],[400,300]])await clickPoint(page,x,y,view);
    await expect(page.locator('#photo-list')).toContainText('90°');
    await mode(page,'area');for(const [x,y] of [[100,500],[300,500],[300,700],[100,700]])await exact(page,x,y);await page.locator('#photo-finish').click();await expect(page.locator('#photo-list')).toContainText('400 mm²');
    await mode(page,'polyline');for(const [x,y] of [[100,800],[400,800],[400,400]])await exact(page,x,y);await page.locator('#photo-canvas').press('Enter');
    await mode(page,'circle');await exact(page,500,500);await exact(page,560,580);await expect(page.locator('#photo-list')).toContainText('r 10 / Ø 20 mm');
    await page.locator('#photo-label').fill('<img src=x onerror="alert(1)">');await mode(page,'arrow');await exact(page,700,200);await exact(page,800,300);await mode(page,'text');await exact(page,500,100);
    expect(await page.locator('#photo-list img').count()).toBe(0);await page.locator('#photo-undo').click();await expect(page.locator('#photo-list li')).toHaveCount(6);await page.locator('#photo-redo').click();await expect(page.locator('#photo-list li')).toHaveCount(7);
    await page.locator('#photo-notes').fill('Synthetic reference <script>never execute</script>');await page.locator('#photo-notes').blur();
    await page.locator('#photo-unit').selectOption('cm');const data=await report(page,info,`grid-${width}.json`);
    expect(data.schema).toBe('workshopgirl.photo-measurement');expect(data.version).toBe(1);expect(data.image.original).toEqual({width:1000,height:1000});expect(data.calibration.mmPerPixel).toBe(.1);
    expect(data.measurements[0].values.length).toBeCloseTo(5,1);expect(data.measurements[1].values.angle).toBeCloseTo(90,1);expect(data.measurements[2].values.area).toBe(4);expect(data.measurements[3].values.length).toBe(7);expect(data.measurements[4].values.radius).toBe(1);expect(data.notes).toContain('<script>');
    // Native mouse coordinates are integer-quantized in Firefox/WebKit; tolerance is 2 CSS pixels.
    expect(Math.abs(data.measurements[0].sourcePoints[0].x-300)).toBeLessThan(2/view.scale);
    const downloaded=page.waitForEvent('download');await page.locator('#photo-png').click();const download=await downloaded;expect(download.suggestedFilename()).toBe('grid-measurements.png');const path=info.outputPath(`grid-${width}.png`);await download.saveAs(path);const bytes=await fs.readFile(path);expect(bytes.readUInt32BE(16)).toBe(1000);expect(bytes.readUInt32BE(20)).toBe(1000);
    const colors=await page.evaluate(async bytes=>{const bitmap=await createImageBitmap(new Blob([new Uint8Array(bytes)],{type:'image/png'}));const c=document.createElement('canvas');c.width=bitmap.width;c.height=bitmap.height;const x=c.getContext('2d')!;x.drawImage(bitmap,0,0);bitmap.close();return [...x.getImageData(190,500,20,3).data].filter((_,i)=>i%4===0).some(v=>v<180);},[...bytes]);expect(colors).toBe(true);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:info.outputPath(`photo-${width}.png`),fullPage:true});
    await page.locator('#photo-list button').first().click();await page.locator('#photo-canvas').press('ArrowRight');const moved=await report(page,info,`moved-${width}.json`);expect(moved.measurements[0].points[0].x-data.measurements[0].points[0].x).toBeCloseTo(1,6);
    await page.locator('#photo-delete').click();await expect(page.locator('#photo-list li')).toHaveCount(6);await page.locator('#photo-undo').click();await expect(page.locator('#photo-list li')).toHaveCount(7);
    await page.locator('#photo-list button').last().click();await page.locator('#photo-canvas').press('Delete');await expect(page.locator('#photo-list li')).toHaveCount(6);await page.locator('#photo-canvas').press('Control+z');await expect(page.locator('#photo-list li')).toHaveCount(7);
  }expect(errors).toEqual([]);
});

test('Pointer wheel/pan/resize, touch handles and pinch keep coordinates; clear/reload releases session',async({page},info)=>{
  await page.goto('/tools/photo-measurement/');await open(page);await reference(page);await mode(page,'distance');let view=await fitView(page);
  await clickPoint(page,300,300,view);await clickPoint(page,600,300,view);
  const canvas=page.locator('#photo-canvas');await canvas.scrollIntoViewIfNeeded();let box=(await canvas.boundingBox())!;
  await canvas.evaluate(node=>node.addEventListener('wheel',event=>node.setAttribute('data-test-wheel',String((event as WheelEvent).deltaY)),{once:true}));
  await page.mouse.move(box.x+box.width/2,box.y+box.height/2);
  if(info.project.name==='webkit-mobile')await canvas.dispatchEvent('wheel',{clientX:box.x+box.width/2,clientY:box.y+box.height/2,deltaY:-100});else await page.mouse.wheel(0,-100);
  await expect(canvas).toHaveAttribute('data-test-wheel',/./);const delta=Number(await canvas.getAttribute('data-test-wheel'));
  const factor=Math.exp(-Math.max(-100,Math.min(100,delta))*.002),anchor={x:box.width/2,y:box.height/2};view={scale:view.scale*factor,x:anchor.x-(anchor.x-view.x)*factor,y:anchor.y-(anchor.y-view.y)*factor};
  await mode(page,'pan');await canvas.scrollIntoViewIfNeeded();box=(await canvas.boundingBox())!;await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.mouse.move(box.x+box.width/2+30,box.y+box.height/2+20);await page.mouse.up();view.x+=30;view.y+=20;
  await page.setViewportSize({width:1024,height:900});const changed=(await canvas.boundingBox())!;view.x+=(changed.width-box.width)/2;view.y+=(changed.height-box.height)/2;
  await mode(page,'distance');await clickPoint(page,400,400,view);await clickPoint(page,400,600,view);
  let data=await report(page,info);expect(Math.abs(data.measurements[0].values.length-30)).toBeLessThan(.3/view.scale);expect(Math.abs(data.measurements[1].values.length-20)).toBeLessThan(.3/view.scale);
  await mode(page,'line');await exact(page,100,700);await exact(page,600,700);await page.locator('#photo-list button').last().click();await page.locator('#photo-selected-label').fill('<b>Local line</b>');await page.locator('#photo-apply-label').click();await expect(page.locator('#photo-list')).toContainText('<b>Local line</b>');expect(await page.locator('#photo-list b').count()).toBe(0);
  view=await fitView(page);await canvas.scrollIntoViewIfNeeded();box=(await canvas.boundingBox())!;await page.mouse.move(box.x+view.x+350*view.scale,box.y+view.y+700*view.scale);await page.mouse.down();await page.mouse.move(box.x+view.x+370*view.scale,box.y+view.y+730*view.scale);await page.mouse.up();
  const whole=await report(page,info,'line-move.json');expect(Math.abs(whole.measurements[2].points[0].x-120)).toBeLessThan(2/view.scale);expect(Math.abs(whole.measurements[2].points[1].x-620)).toBeLessThan(2/view.scale);expect(Math.abs(whole.measurements[2].points[0].y-730)).toBeLessThan(2/view.scale);
  await canvas.press('Control+z');const restored=await report(page,info,'line-undo.json');expect(restored.measurements[2].points).toEqual([{x:100,y:700},{x:600,y:700}]);await canvas.press('Control+Shift+z');const redone=await report(page,info,'line-redo.json');expect(redone.measurements[2].points).toEqual(whole.measurements[2].points);
  await mode(page,'select');view=await fitView(page);await canvas.scrollIntoViewIfNeeded();
  const touch=async(type:string,id:number,x:number,y:number)=>canvas.evaluate((node,arg)=>{const r=node.getBoundingClientRect();node.dispatchEvent(new PointerEvent(arg.type,{pointerId:arg.id,pointerType:'touch',clientX:r.x+arg.x,clientY:r.y+arg.y,bubbles:true}));},{type,id,x,y});
  // Programmatic touch PointerEvents exercise the shared gesture path in all three engines.
  const point={x:view.x+300*view.scale,y:view.y+300*view.scale};await touch('pointerdown',11,point.x,point.y);await touch('pointermove',11,point.x+10*view.scale,point.y);await touch('pointerup',11,point.x+10*view.scale,point.y);
  data=await report(page,info,'touch.json');expect(data.measurements[0].points[0].x).toBeCloseTo(310,0);
  const previous=await canvas.locator('..').locator('..').locator('#photo-zoom-value').textContent();await touch('pointerdown',21,100,100);await touch('pointerdown',22,200,100);await touch('pointermove',22,250,100);await touch('pointerup',22,250,100);await touch('pointerup',21,100,100);await expect(page.locator('#photo-zoom-value')).not.toHaveText(previous!);
  const after=await report(page,info,'pinch.json');expect(after.measurements).toEqual(data.measurements);
  await page.locator('#photo-undo').click();const undone=await report(page,info,'undo.json');expect(Math.abs(undone.measurements[0].points[0].x-300)).toBeLessThan(2/view.scale);
  await page.locator('#photo-clear-scale').click();await expect(page.locator('#photo-list')).toContainText('uncalibrated');await page.locator('#photo-undo').click();
  await page.locator('#photo-clear').click();await expect(page.locator('#photo-png')).toBeDisabled();await expect(page.locator('#photo-image-info')).toHaveText('No image open.');await open(page);await expect(page.locator('#photo-list li')).toHaveCount(0);await page.reload();await expect(page.locator('#photo-empty')).toBeVisible();
});

test('Native pointer/touch reference placement, editable reference handles and keyboard coordinate selection',async({page,isMobile},info)=>{
  await page.goto('/tools/photo-measurement/');await open(page);await mode(page,'reference');const view=await fitView(page),canvas=page.locator('#photo-canvas');await canvas.scrollIntoViewIfNeeded();const box=(await canvas.boundingBox())!;
  for(const [x,y] of [[100,100],[500,100]]){const point={x:box.x+view.x+x*view.scale,y:box.y+view.y+y*view.scale};if(isMobile)await page.touchscreen.tap(point.x,point.y);else await page.mouse.click(point.x,point.y);}
  await page.locator('#photo-known').fill('40');await page.locator('#photo-reference').click();let data=await report(page,info,'native-reference.json');expect(Math.abs(data.calibration.mmPerPixel-.1)).toBeLessThan(.003);
  await mode(page,'select');await clickPoint(page,100,100,view);await expect(page.locator('#photo-selection')).toBeVisible();await page.locator('#photo-x').fill('100');await page.locator('#photo-y').fill('200');await page.locator('#photo-apply-point').click();data=await report(page,info,'reference-moved.json');const points=data.calibration.points;expect(data.calibration.mmPerPixel).toBeCloseTo(40/Math.hypot(points[1].x-100,points[1].y-200),8);
  await page.locator('#photo-handle').selectOption('1');await expect(page.locator('#photo-x')).toHaveValue(Number(points[1].x).toFixed(3));await page.keyboard.press('Tab');await page.locator('#photo-canvas').focus();await expect(canvas).toBeFocused();expect(await canvas.evaluate(node=>getComputedStyle(node).outlineStyle)).toBe('solid');await canvas.press('ArrowRight');const moved=await report(page,info,'reference-keyboard.json');expect(moved.calibration.points[1].x-points[1].x).toBeCloseTo(1,8);
  await page.locator('#photo-undo').click();await page.locator('#photo-clear-scale').click();await expect(page.locator('#photo-calibration')).toContainText('Uncalibrated');
});

test('Known planar trapezoid is rectified locally with metric dimensions, inverse source mapping and safe invalidation',async({page},info)=>{
  await page.goto('/tools/photo-measurement/');await open(page);await reference(page);await mode(page,'distance');await exact(page,100,300);await exact(page,200,300);
  await page.locator('#photo-notes').fill('Keep setup notes');await page.locator('#photo-notes').blur();await page.locator('.photo-settings details summary').click();await mode(page,'rectify');
  const corners=[[100,100],[900,150],[800,800],[200,850]];for(const [x,y] of corners)await exact(page,x,y);
  await page.locator('#photo-surface-width').fill('200');await page.locator('#photo-surface-height').fill('100');await page.locator('#photo-correct').click();
  await expect(page.locator('#photo-status')).toContainText('Perspective corrected');await expect(page.locator('#photo-list li')).toHaveCount(0);await expect(page.locator('#photo-undo')).toBeDisabled();
  let data=await report(page,info,'rectified-empty.json');expect(data.notes).toBe('Keep setup notes');const h=data.image.rectification.forward;const a=project(h,{x:100,y:100}),b=project(h,{x:900,y:150}),c=project(h,{x:800,y:800});
  const warpDownload=page.waitForEvent('download');await page.locator('#photo-png').click();const warpImage=await warpDownload;await warpImage.saveAs(info.outputPath('rectified-grid.png'));const warpBytes=await fs.readFile(info.outputPath('rectified-grid.png'));
  const gridPoint=project(h,{x:500,y:500}),whitePoint=project(h,{x:450,y:450});
  const warpedColors=await page.evaluate(async arg=>{const bitmap=await createImageBitmap(new Blob([new Uint8Array(arg.bytes)],{type:'image/png'}));const canvas=document.createElement('canvas');canvas.width=bitmap.width;canvas.height=bitmap.height;const x=canvas.getContext('2d')!;x.drawImage(bitmap,0,0);bitmap.close();return {grid:[...x.getImageData(Math.round(arg.grid.x)-2,Math.round(arg.grid.y)-2,5,5).data].some((v,i)=>i%4===0&&v<235),white:x.getImageData(Math.round(arg.white.x),Math.round(arg.white.y),1,1).data[0]};},{bytes:[...warpBytes],grid:gridPoint,white:whitePoint});expect(warpedColors.grid).toBe(true);expect(warpedColors.white).toBe(255);
  await mode(page,'distance');await exact(page,a.x,a.y);await exact(page,b.x,b.y);await mode(page,'angle');for(const p of [a,b,c])await exact(page,p.x,p.y);
  data=await report(page,info,'rectified.json');expect(data.measurements[0].values.length).toBeCloseTo(200,5);expect(data.measurements[1].values.angle).toBeCloseTo(90,5);expect(data.measurements[0].sourcePoints[0].x).toBeCloseTo(100,5);expect(data.measurements[0].sourcePoints[1].y).toBeCloseTo(150,5);
  const download=page.waitForEvent('download');await page.locator('#photo-png').click();const png=await download;await png.saveAs(info.outputPath('rectified.png'));const bytes=await fs.readFile(info.outputPath('rectified.png'));expect(bytes.readUInt32BE(16)).toBe(data.image.working.width);expect(bytes.readUInt32BE(20)).toBe(data.image.working.height);
  await page.screenshot({path:info.outputPath('rectified-ui.png'),fullPage:true});await page.locator('#photo-original').click();await expect(page.locator('#photo-status')).toContainText('Image opened locally');await expect(page.locator('#photo-calibration')).toContainText('Uncalibrated');
  await mode(page,'rectify');for(const [x,y] of [[100,100],[200,200],[300,300],[400,400]])await exact(page,x,y);await page.locator('#photo-correct').click();await expect(page.locator('#photo-status')).toHaveAttribute('role','alert');await expect(page.locator('#photo-image-info')).toContainText('1000 × 1000 oriented');await page.locator('#photo-cancel').click();await expect(page.locator('#photo-pending')).toHaveText('No unfinished points.');
});

test('Input bounds, corruption, WebP/JPEG/EXIF orientation, drop, hostile filenames and repeated cancellation stay private',async({page},info)=>{
  test.setTimeout(90000);const requests:string[]=[];page.on('request',request=>{if(request.method()!=='GET')requests.push(request.url());});await page.goto('/tools/photo-measurement/');
  await page.locator('#photo-file').setInputFiles({name:'payload.html',mimeType:'text/html',buffer:Buffer.from('<script>alert(1)</script>')});await expect(page.locator('#photo-status')).toContainText('Unsupported format');
  await page.locator('#photo-file').setInputFiles({name:'corrupt.png',mimeType:'image/png',buffer:fixture.subarray(0,33)});await expect(page.locator('#photo-status')).toHaveAttribute('role','alert');
  const huge=Buffer.from(fixture);huge.writeUInt32BE(20000,16);await page.locator('#photo-file').setInputFiles({name:'huge.png',mimeType:'image/png',buffer:huge});await expect(page.locator('#photo-status')).toContainText('too large');
  await page.locator('#photo-file').setInputFiles({name:'oversize.png',mimeType:'image/png',buffer:Buffer.alloc(20*1024*1024+1)});await expect(page.locator('#photo-status')).toContainText('20 MiB');
  await open(page,fixture,'<img onerror="alert(1)">.png');expect(await page.locator('#photo-image-info img').count()).toBe(0);const download=page.waitForEvent('download');await page.locator('#photo-json').click();expect((await download).suggestedFilename()).toMatch(/^[\w-]+\.json$/);
  await mode(page,'area');await exact(page,100,100);await page.locator('#photo-canvas').press('Escape');await expect(page.locator('#photo-pending')).toHaveText('No unfinished points.');
  const data=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=120;c.height=80;const x=c.getContext('2d')!;x.fillStyle='red';x.fillRect(0,0,60,80);x.fillStyle='blue';x.fillRect(60,0,60,80);return {jpeg:c.toDataURL('image/jpeg'),webp:c.toDataURL('image/webp')};});
  for(const orientation of [1,2,3,4,5,6,7,8]){const jpeg=exifJPEG(Buffer.from(data.jpeg.split(',')[1],'base64'),orientation);await open(page,jpeg,'orientation.jpg');await expect(page.locator('#photo-image-info')).toContainText(orientation>=5?'80 × 120 oriented':'120 × 80 oriented');const out=page.waitForEvent('download');await page.locator('#photo-png').click();const png=await out;const path=info.outputPath('orientation-'+orientation+'.png');await png.saveAs(path);const bytes=await fs.readFile(path);const pixel=await page.evaluate(async bytes=>{const bitmap=await createImageBitmap(new Blob([new Uint8Array(bytes)],{type:'image/png'}));const c=document.createElement('canvas');c.width=bitmap.width;c.height=bitmap.height;const x=c.getContext('2d')!;x.drawImage(bitmap,0,0);bitmap.close();return [...x.getImageData(Math.floor(c.width/4),Math.floor(c.height/4),1,1).data];},[...bytes]);expect([1,4,5,6].includes(orientation)?pixel[0]:pixel[2]).toBeGreaterThan(240);}
  if(data.webp.startsWith('data:image/webp')){await open(page,Buffer.from(data.webp.split(',')[1],'base64'),'fixture.webp');await expect(page.locator('#photo-image-info')).toContainText('WebP');}
  // Decode a real WebP in every engine, including engines with no Canvas WebP encoder.
  await open(page,webpFixture,'vp8.webp');await expect(page.locator('#photo-image-info')).toContainText('120 × 80 oriented');await expect(page.locator('#photo-image-info')).toContainText('WebP');
  const dropped=await page.evaluateHandle(bytes=>{const transfer=new DataTransfer();transfer.items.add(new File([new Uint8Array(bytes)],'drop.png',{type:'image/png'}));return transfer;},[...fixture]);await page.locator('#photo-lab').dispatchEvent('drop',{dataTransfer:dropped});await expect(page.locator('#photo-status')).toContainText('Image opened locally');await expect(page.locator('#photo-image-info')).toContainText('drop.png');await dropped.dispose();
  for(let i=0;i<3;i++){await mode(page,'reference');await exact(page,100,100);await page.locator('#photo-cancel').click();await expect(page.locator('#photo-list li')).toHaveCount(0);}
  // Slow only worker delivery to make an in-flight cancel deterministic; the real decode runs.
  await page.addInitScript(()=>{const Native=Worker;window.Worker=class extends Native{constructor(url:string|URL,options?:WorkerOptions){super(url,options);this.addEventListener('message',event=>{event.stopImmediatePropagation();const timer=setTimeout(()=>this.onmessage?.(event),500);this.addEventListener('error',()=>clearTimeout(timer),{once:true});},{capture:true});}};});
  await page.reload();await page.locator('#photo-file').setInputFiles({name:'cancel.png',mimeType:'image/png',buffer:fixture});await expect(page.locator('#photo-lab')).toHaveAttribute('aria-busy','true');await page.locator('#photo-cancel').click();await expect(page.locator('#photo-lab')).toHaveAttribute('aria-busy','false');await expect(page.locator('#photo-empty')).toBeVisible();await expect.poll(()=>page.workers().length).toBe(0);
  expect(requests).toEqual([]);expect(await page.evaluate(()=>localStorage.length)).toBe(0);
});
