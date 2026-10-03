import {distance,metrics,rectanglePlan,scaleFromReference,toImage,toScreen,unitMM,valueLabel,zoomAt,type Kind,type Mark,type Point,type Unit,type View} from '../../lib/photo/geometry.ts';
import {exportReport,History,safeFilename,type Editing,type ImageGeometry} from '../../lib/photo/model.ts';
import {MAX_FILE,readHeader,workingSize} from '../../lib/photo/image.ts';
import {drawMarks} from './render.ts';

type Mode=Kind|'reference'|'rectify'|'select'|'pan';
interface Processed {bitmap:ImageBitmap;original?:{width:number;height:number};error?:string;orientation?:number;offscreen?:boolean;pixels?:ArrayBuffer;width?:number;height?:number}
const root=document.querySelector<HTMLElement>('#photo-lab');
if(root)mount(root);
function mount(root:HTMLElement){
  const el=<T extends HTMLElement>(id:string)=>root.querySelector<T>('#photo-'+id)!;
  const canvas=el<HTMLCanvasElement>('canvas'),ctx=canvas.getContext('2d')!,fileInput=el<HTMLInputElement>('file');
  const unitInput=el<HTMLSelectElement>('unit'),modeInput=el<HTMLSelectElement>('mode'),history=new History();
  let image:ImageBitmap|null=null,geometry:ImageGeometry|null=null,file:File|null=null,mode:Mode='reference',pending:Point[]=[],selected='',handle=0,offscreen=false;
  let view:View={scale:1,x:0,y:0},cw=0,ch=0,frame=0,busy=false,worker:Worker|null=null,cancelWork:(()=>void)|null=null,generation=0;
  let drag:null|{start:Point;last:Point;before:Editing;selected:string;handle:number;pan:boolean;moved:boolean}=null;
  const pointers=new Map<number,Point>();let pinch:null|{distance:number;center:Point;view:View}=null;
  const urls=new Set<string>(),timers=new Set<ReturnType<typeof setTimeout>>();
  const displayUnit=()=>unitInput.value as Unit;
  const message=(text:string,error=false)=>{el('status').textContent=text;el('status').setAttribute('role',error?'alert':'status');};
  const guard=(action:()=>void)=>{try{action();}catch(e){message(e instanceof Error?e.message:'Unable to complete this edit.',true);}};
  const isInside=(p:Point)=>!!image && Number.isFinite(p.x) && Number.isFinite(p.y) && p.x>=-1e-8 && p.y>=-1e-8 && p.x<=image.width+1e-8 && p.y<=image.height+1e-8;
  const clamp=(p:Point):Point=>({x:Math.max(0,Math.min(image?.width??0,p.x)),y:Math.max(0,Math.min(image?.height??0,p.y))});
  function draw(){frame=0;ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,canvas.width,canvas.height);const dpr=canvas.width/cw;ctx.scale(dpr,dpr);
    if(image){ctx.save();ctx.translate(view.x,view.y);ctx.scale(view.scale,view.scale);ctx.drawImage(image,0,0);ctx.restore();
      const kind:Kind=mode==='rectify'?'area':mode==='reference'?'line':(['select','pan'].includes(mode)?'line':mode as Kind);
      drawMarks(ctx,history.state,displayUnit(),view,selected,{id:'pending',kind,points:pending,label:mode==='rectify'?'Corners TL → TR → BR → BL':''});}
    el('zoom-value').textContent=Math.round(view.scale*100)+'%';
  }
  const redraw=()=>{if(!frame)frame=requestAnimationFrame(draw);};
  function fit(){if(!image)return;view={scale:Math.min(cw/image.width,ch/image.height)*.92,x:0,y:0};view.x=(cw-image.width*view.scale)/2;view.y=(ch-image.height*view.scale)/2;redraw();}
  const observer=new ResizeObserver(()=>{const box=canvas.getBoundingClientRect(),old={cw,ch};cw=box.width;ch=box.height;const dpr=Math.min(devicePixelRatio||1,2);canvas.width=Math.round(cw*dpr);canvas.height=Math.round(ch*dpr);if(!old.cw)fit();else{view.x+=(cw-old.cw)/2;view.y+=(ch-old.ch)/2;}redraw();});observer.observe(canvas);
  function refresh(){
    el<HTMLButtonElement>('undo').disabled=busy||!history.past.length;el<HTMLButtonElement>('redo').disabled=busy||!history.future.length;
    el<HTMLButtonElement>('delete').disabled=busy||!selected;el<HTMLButtonElement>('cancel').disabled=!busy&&!pending.length;
    el<HTMLButtonElement>('finish').disabled=busy||!(['polyline','area'].includes(mode))||pending.length<(mode==='area'?3:2);
    el<HTMLButtonElement>('correct').disabled=busy||mode!=='rectify'||pending.length!==4||!!geometry?.rectification;
    el<HTMLButtonElement>('reference').disabled=busy||!(mode==='reference'&&pending.length===2 || history.state.calibration?.points.length===2);
    el<HTMLButtonElement>('clear-scale').disabled=busy||!history.state.calibration;
    root.querySelectorAll<HTMLButtonElement>('[data-needs-image]').forEach(button=>button.disabled=busy||!image);
    modeInput.disabled=busy||!image;fileInput.disabled=busy;root.setAttribute('aria-busy',String(busy));
    const scale=history.state.calibration;
    el('calibration').textContent=scale ? `Calibrated · ${Number(scale.mmPerPixel.toPrecision(6))} mm / image pixel · ${scale.method==='reference'?'two-point reference':'known rectangle'}` : 'Uncalibrated · define a reference before measuring lengths or areas.';
    el('pending').textContent=pending.length ? `${pending.length} point${pending.length===1?'':'s'} placed. ${pending.map((p,i)=>`${i+1}: ${p.x.toFixed(2)}, ${p.y.toFixed(2)}`).join(' · ')}`:'No unfinished points.';
    const list=el('list');list.replaceChildren();
    for(const mark of history.state.marks){const item=document.createElement('li'),button=document.createElement('button');button.type='button';button.textContent=`${mark.label||mark.kind} · ${valueLabel(mark,scale?.mmPerPixel??null,displayUnit())}`;button.setAttribute('aria-pressed',String(selected===mark.id));button.addEventListener('click',()=>{selected=mark.id;handle=0;setMode('select',false);refresh();canvas.focus();});item.append(button);list.append(item);}
    el('empty-list').hidden=!!history.state.marks.length;
    el<HTMLTextAreaElement>('notes').value=history.state.notes;
    const mark=history.state.marks.find(m=>m.id===selected),points=selected==='reference'?scale?.points:mark?.points;
    el('selection').hidden=!points?.length;
    if(points?.length){handle=Math.min(handle,points.length-1);const choice=el<HTMLSelectElement>('handle');choice.replaceChildren();points.forEach((_,i)=>{const option=document.createElement('option');option.value=String(i);option.textContent='Point '+(i+1);choice.append(option);});choice.value=String(handle);el<HTMLInputElement>('x').value=points[handle].x.toFixed(3);el<HTMLInputElement>('y').value=points[handle].y.toFixed(3);el<HTMLInputElement>('selected-label').value=mark?.label??'Reference';}
    redraw();
  }
  function setMode(next:Mode,clear=true){mode=next;modeInput.value=next;if(clear){pending=[];selected='';}drag=null;const hints:Record<Mode,string>={reference:'Place two endpoints of the known reference, then apply its distance.',rectify:'Place corners in order: top left, top right, bottom right, bottom left. Enter the real rectangle dimensions, then apply.',select:'Select a handle or a mark. Drag a handle to change geometry; drag a line to move it. Arrow keys move the selected point.',pan:'Drag to pan. Pinch or use the wheel to zoom.',distance:'Place two endpoints.',angle:'Place three points. The second point is the vertex.',polyline:'Place path points, then Finish path or press Enter.',area:'Place perimeter corners, then Finish path or press Enter. Edges must not cross.',circle:'Place the center, then a point on the circumference. This is a user-defined circle.',line:'Place two endpoints for a line.',arrow:'Place the tail, then arrow head.',text:'Enter label text, then place its anchor.'};message(hints[next]);refresh();}
  function commit(next:Editing){if(next.marks.length>200 || next.marks.reduce((sum,mark)=>sum+mark.points.length,0)>2000)throw new Error('Maximum 200 items and 2,000 total points. Delete an item to add another.');next.marks.forEach(mark=>metrics(mark,next.calibration?.mmPerPixel??null,displayUnit()));history.change(next);refresh();}
  function applyReference(){const points=mode==='reference'&&pending.length===2?pending:history.state.calibration?.points;if(!points||points.length!==2)throw new Error('Place two reference endpoints.');const value=Number(el<HTMLInputElement>('known').value),unit=el<HTMLSelectElement>('reference-unit').value as Unit,mmPerPixel=scaleFromReference(points,value,unit);commit({...history.state,calibration:{points:[...points],mmPerPixel,method:'reference',referenceMM:value*unitMM[unit]}});pending=[];setMode('distance');message('Reference applied. Measurements use this scale across the image; the reference and object must share a plane.');}
  function finish(){if(!image)return;if(mode==='reference'||mode==='rectify'||mode==='select'||mode==='pan')return;
    if(['distance','polyline','area','circle'].includes(mode)&&!history.state.calibration)throw new Error('Calibrate a reference before measuring lengths or areas.');
    const label=el<HTMLInputElement>('label').value.trim().slice(0,120);if(mode==='text'&&!label)throw new Error('Enter text in Label / annotation before placing text.');
    const mark:Mark={id:crypto.randomUUID(),kind:mode,points:[...pending],label};metrics(mark,history.state.calibration?.mmPerPixel??null,displayUnit());commit({...history.state,marks:[...history.state.marks,mark]});pending=[];message('Added '+mode+'. Place points for another, or select an item to edit.');refresh();}
  function addPoint(p:Point){if(!image||busy)return;if(mode==='select'||mode==='pan'){message('Choose a measurement or annotation tool to place points.');return;}if(!isInside(p))throw new Error('Place the point inside the image.');if(pending.length>=200)throw new Error('Maximum 200 points per path.');if(mode==='rectify'&&pending.length>=4)throw new Error('Four corners are ready. Apply correction or cancel them.');if(mode==='reference'&&pending.length>=2)pending=[];pending.push(p);refresh();const count=mode==='text'?1:mode==='angle'?3:2;if(!['reference','rectify','polyline','area'].includes(mode)&&pending.length===count)finish();}
  function validateEdited(next:Editing){if(next.calibration?.method==='reference'&&next.calibration.referenceMM!==null)next.calibration.mmPerPixel=scaleFromReference(next.calibration.points,next.calibration.referenceMM,'mm');next.marks.forEach(m=>metrics(m,next.calibration?.mmPerPixel??null,displayUnit()));return next;}
  function updatePoint(p:Point,whole=false,delta:Point={x:0,y:0}){
    const next=structuredClone(history.state),points=selected==='reference'?next.calibration?.points:next.marks.find(m=>m.id===selected)?.points;if(!points)return;
    if(whole){if(points.some(p=>!isInside({x:p.x+delta.x,y:p.y+delta.y})))return;points.forEach(p=>{p.x+=delta.x;p.y+=delta.y;});}else points[handle]=clamp(p);
    history.state=next;redraw();
  }
  function deleteSelected(){const next=selected==='reference'?{...history.state,calibration:null}:{...history.state,marks:history.state.marks.filter(m=>m.id!==selected)};commit(next);selected='';refresh();}
  function cancel(){generation++;cancelWork?.();cancelWork=null;worker?.terminate();worker=null;busy=false;pending=[];pointers.clear();pinch=null;drag=null;message('Cancelled. The current image and completed edits are kept.');refresh();}
  async function process(data:{file?:File;bitmap?:ImageBitmap;pixels?:ArrayBuffer;sourceWidth?:number;sourceHeight?:number;width?:number;height?:number;inverse?:number[]}):Promise<Processed>{
    return new Promise((resolve,reject)=>{const active=new Worker(new URL('../../lib/photo/processing.worker.ts',import.meta.url),{type:'module'});worker=active;let settled=false;
      const timeout=setTimeout(()=>done(new Error('Image processing timed out. Try a smaller image.')),30000);timers.add(timeout);
      function done(error?:Error,result?:Processed){if(settled){result?.bitmap.close();return;}settled=true;clearTimeout(timeout);timers.delete(timeout);active.terminate();if(worker===active)worker=null;cancelWork=null;if(error)reject(error);else resolve(result!);}
      cancelWork=()=>done(new DOMException('Cancelled','AbortError'));
      active.onmessage=(e:MessageEvent<Processed>)=>{if(e.data.error)done(new Error(e.data.error));else if(e.data.pixels){const pixels=new ImageData(new Uint8ClampedArray(e.data.pixels),e.data.width!,e.data.height!);void createImageBitmap(pixels).then(bitmap=>done(undefined,{bitmap})).catch(error=>done(error));}else done(undefined,e.data);};
      active.onerror=()=>done(new Error('Image could not be decoded or processed. Resave it as JPEG / PNG, or use a current browser with local image worker support.'));
      try{active.postMessage(data,data.bitmap?[data.bitmap]:data.pixels?[data.pixels]:[]);}catch(error){data.bitmap?.close();done(error instanceof Error?error:new Error('Image worker transfer failed.'));}
    });
  }
  async function openImage(nextFile:File){cancel();const token=++generation;busy=true;message('Opening image locally…');refresh();
    try{if(nextFile.size>MAX_FILE)throw new Error('File is too large. Maximum size is 20 MiB.');
      const header=readHeader(new Uint8Array(await nextFile.slice(0,512*1024).arrayBuffer()));if(token!==generation)return;
      const result=await process({file:nextFile});if(token!==generation){result.bitmap.close();return;}
      const original=result.original!;const expected=workingSize(original.width,original.height);if(result.bitmap.width!==expected.width||result.bitmap.height!==expected.height){result.bitmap.close();throw new Error('Browser returned unexpected image orientation or dimensions. Resave the image.');}
      image?.close();image=result.bitmap;offscreen=!!result.offscreen;file=nextFile;geometry={original,working:{width:image.width,height:image.height},oriented:true,sourceScale:{x:original.width/image.width,y:original.height/image.height},rectification:null};history.clear();selected='';pending=[];el<HTMLTextAreaElement>('notes').value='';
      el('image-info').textContent=`${nextFile.name} · ${original.width} × ${original.height} oriented pixels · working image ${image.width} × ${image.height} · ${header.format}${header.orientation!==1?' · EXIF orientation applied':''}`;
      el('empty').hidden=true;fit();setMode('reference');message('Image opened locally. Place two reference points. Large images are downsampled; exports retain original-coordinate mappings.');
    }catch(error){if(token===generation && !(error instanceof DOMException&&error.name==='AbortError'))message(error instanceof Error?error.message:'Corrupt image. Resave as JPEG or PNG.',true);}
    finally{if(token===generation){busy=false;fileInput.value='';refresh();}}
  }
  async function correct(){const token=++generation;try{
    if(!image||!geometry||geometry.rectification)throw new Error('Open an original image before applying a correction.');
    const u=el<HTMLSelectElement>('surface-unit').value as Unit,plan=rectanglePlan(pending,Number(el<HTMLInputElement>('surface-width').value)*unitMM[u],Number(el<HTMLInputElement>('surface-height').value)*unitMM[u]);
    busy=true;message('Correcting perspective locally…');refresh();
    let result:Processed;
    if(offscreen){const copy=await createImageBitmap(image);if(token!==generation){copy.close();return;}result=await process({bitmap:copy,width:plan.width,height:plan.height,inverse:plan.inverse});}
    else{const scratch=document.createElement('canvas');scratch.width=image.width;scratch.height=image.height;const context=scratch.getContext('2d',{willReadFrequently:true})!;context.drawImage(image,0,0);const pixels=context.getImageData(0,0,image.width,image.height).data.buffer as ArrayBuffer;const sourceWidth=image.width,sourceHeight=image.height;scratch.width=1;scratch.height=1;result=await process({pixels,sourceWidth,sourceHeight,width:plan.width,height:plan.height,inverse:plan.inverse});}
    if(token!==generation){result.bitmap.close();return;}
    image.close();image=result.bitmap;geometry={...geometry,working:{width:plan.width,height:plan.height},rectification:{forward:plan.forward,inverse:plan.inverse,corners:plan.corners,surfaceMM:plan.surfaceMM,extent:plan.extent}};
    const notes=history.state.notes;history.clear({calibration:{points:[],mmPerPixel:plan.mmPerPixel,method:'known-rectangle',referenceMM:null},marks:[],notes});pending=[];selected='';fit();setMode('distance');message('Perspective corrected. Previous calibration, measurements and edit history cleared. Scale comes from the supplied rectangle dimensions. Measure only this plane.');
    el('image-info').textContent=`Rectified image ${image.width} × ${image.height} · known surface ${plan.surfaceMM.width} × ${plan.surfaceMM.height} mm · source ${geometry.original.width} × ${geometry.original.height}`;
  }catch(error){if(token===generation)message(error instanceof Error?error.message:'Correction failed.',true);}finally{if(token===generation){busy=false;refresh();}}}
  function download(blob:Blob,extension:string){const url=URL.createObjectURL(blob);urls.add(url);const link=document.createElement('a');link.href=url;link.download=safeFilename(file?.name??'photo')+'.'+extension;link.click();const timer=setTimeout(()=>{URL.revokeObjectURL(url);urls.delete(url);timers.delete(timer);},1000);timers.add(timer);}
  async function exportPNG(){if(!image||busy)return;const token=++generation;busy=true;message('Rendering annotated PNG locally…');refresh();const out=document.createElement('canvas');out.width=image.width;out.height=image.height;const context=out.getContext('2d')!;context.drawImage(image,0,0);drawMarks(context,history.state,displayUnit(),{scale:1,x:0,y:0},'',undefined,true);
    try{const blob=await new Promise<Blob>((resolve,reject)=>out.toBlob(blob=>blob?resolve(blob):reject(new Error('PNG export failed. Try a smaller image.')),'image/png'));if(token===generation){download(blob,'png');message('Annotated PNG exported at the full working-image size.');}}catch(error){if(token===generation)message(String(error),true);}finally{out.width=1;out.height=1;if(token===generation){busy=false;refresh();}}}
  modeInput.addEventListener('change',()=>setMode(modeInput.value as Mode));unitInput.addEventListener('change',refresh);
  el('reference').addEventListener('click',()=>guard(applyReference));el('finish').addEventListener('click',()=>guard(finish));el('correct').addEventListener('click',()=>void correct());el('cancel').addEventListener('click',cancel);
  el('clear-scale').addEventListener('click',()=>guard(()=>{commit({...history.state,calibration:null});message('Calibration cleared. Existing lengths and areas now show uncalibrated.');}));
  el('undo').addEventListener('click',()=>{history.undo();pending=[];selected='';refresh();});el('redo').addEventListener('click',()=>{history.redo();pending=[];selected='';refresh();});el('delete').addEventListener('click',()=>guard(deleteSelected));
  el('fit').addEventListener('click',fit);el('zoom-in').addEventListener('click',()=>{view=zoomAt(view,{x:cw/2,y:ch/2},1.25);redraw();});el('zoom-out').addEventListener('click',()=>{view=zoomAt(view,{x:cw/2,y:ch/2},.8);redraw();});
  el('original').addEventListener('click',()=>{if(file)void openImage(file);});
  el('clear').addEventListener('click',()=>{cancel();image?.close();image=null;geometry=null;file=null;history.clear();el('empty').hidden=false;el('image-info').textContent='No image open.';el<HTMLTextAreaElement>('notes').value='';selected='';message('Image closed and local image buffers released.');refresh();});
  el('png').addEventListener('click',()=>void exportPNG());el('json').addEventListener('click',()=>guard(()=>{if(geometry){download(new Blob([JSON.stringify(exportReport(history.state,geometry,displayUnit()),null,2)],{type:'application/json'}),'json');message('Version 1 measurement JSON exported.');}}));
  el<HTMLTextAreaElement>('notes').addEventListener('change',()=>commit({...history.state,notes:el<HTMLTextAreaElement>('notes').value.slice(0,2000)}));
  fileInput.addEventListener('change',()=>{if(fileInput.files?.[0])void openImage(fileInput.files[0]);});
  root.addEventListener('dragover',event=>{event.preventDefault();});root.addEventListener('drop',event=>{event.preventDefault();const input=event.dataTransfer?.files[0];if(input)void openImage(input);});
  el('add-point').addEventListener('click',()=>guard(()=>addPoint({x:Number(el<HTMLInputElement>('point-x').value),y:Number(el<HTMLInputElement>('point-y').value)})));
  el<HTMLSelectElement>('handle').addEventListener('change',()=>{handle=Number(el<HTMLSelectElement>('handle').value);refresh();});
  el('apply-point').addEventListener('click',()=>guard(()=>{const p={x:Number(el<HTMLInputElement>('x').value),y:Number(el<HTMLInputElement>('y').value)};if(!isInside(p))throw new Error('Point must be inside the image.');const before=structuredClone(history.state);updatePoint(p);const next=history.state;history.state=before;commit(validateEdited(next));}));
  el('apply-label').addEventListener('click',()=>guard(()=>{const next=structuredClone(history.state),mark=next.marks.find(m=>m.id===selected);if(mark){mark.label=el<HTMLInputElement>('selected-label').value.slice(0,120);commit(next);}}));
  const local=(event:PointerEvent|WheelEvent):Point=>{const r=canvas.getBoundingClientRect();return {x:event.clientX-r.left,y:event.clientY-r.top};};
  function nearest(p:Point){
    const candidates=history.state.marks.flatMap(mark=>mark.points.map((point,i)=>({id:mark.id,index:i,d:distance(p,toScreen(point,view))})));
    history.state.calibration?.points.forEach((point,i)=>candidates.push({id:'reference',index:i,d:distance(p,toScreen(point,view))}));candidates.sort((a,b)=>a.d-b.d);if(candidates[0]?.d<=18)return {...candidates[0],body:false};
    for(const mark of [...history.state.marks].reverse()){
      if(mark.kind==='circle'&&Math.abs(distance(toImage(p,view),mark.points[0])-distance(mark.points[0],mark.points[1]))*view.scale<16)return {id:mark.id,index:-1,body:true};
      for(let i=1;i<mark.points.length;i++){const a=toScreen(mark.points[i-1],view),b=toScreen(mark.points[i],view),t=Math.max(0,Math.min(1,((p.x-a.x)*(b.x-a.x)+(p.y-a.y)*(b.y-a.y))/(distance(a,b)**2)));if(distance(p,{x:a.x+t*(b.x-a.x),y:a.y+t*(b.y-a.y)})<16)return{id:mark.id,index:-1,body:true};}
    }return null;
  }
  canvas.addEventListener('wheel',event=>{if(!image||busy)return;event.preventDefault();view=zoomAt(view,local(event),Math.exp(-Math.max(-100,Math.min(100,event.deltaY))*.002));redraw();},{passive:false});
  canvas.addEventListener('pointerdown',event=>{if(!image||busy)return;event.preventDefault();canvas.focus();if(event.isTrusted)canvas.setPointerCapture(event.pointerId);const p=local(event);pointers.set(event.pointerId,p);
    if(pointers.size===2){if(drag)history.state=drag.before;drag=null;const [a,b]=[...pointers.values()];pinch={distance:distance(a,b),center:{x:(a.x+b.x)/2,y:(a.y+b.y)/2},view:{...view}};return;}
    if(pointers.size>2)return;
    const hit=mode==='select'?nearest(p):null;if(hit){selected=hit.id;handle=hit.index<0?0:hit.index;refresh();}else if(mode==='select'){selected='';refresh();}
    drag={start:p,last:p,before:structuredClone(history.state),selected:hit?.id??'',handle:hit?.index??-1,pan:mode==='pan'||event.button===1,moved:false};
  });
  canvas.addEventListener('pointermove',event=>{if(!pointers.has(event.pointerId))return;const p=local(event);pointers.set(event.pointerId,p);
    if(pinch&&pointers.size>=2){const [a,b]=[...pointers.values()],center={x:(a.x+b.x)/2,y:(a.y+b.y)/2};view=zoomAt(pinch.view,pinch.center,distance(a,b)/Math.max(1,pinch.distance));view.x+=center.x-pinch.center.x;view.y+=center.y-pinch.center.y;redraw();return;}
    if(!drag)return;if(distance(drag.start,p)>3)drag.moved=true;
    if(drag.pan){view.x+=p.x-drag.last.x;view.y+=p.y-drag.last.y;redraw();}
    else if(drag.selected){selected=drag.selected;handle=Math.max(0,drag.handle);updatePoint(toImage(p,view),drag.handle<0,{x:(p.x-drag.last.x)/view.scale,y:(p.y-drag.last.y)/view.scale});}
    drag.last=p;
  });
  function endPointer(event:PointerEvent,cancelled=false){const p=local(event);pointers.delete(event.pointerId);if(pinch){pinch=null;drag=null;refresh();return;}const current=drag;drag=null;if(!current)return;
    if(cancelled){history.state=current.before;refresh();return;}
    if(current.selected&&current.moved){guard(()=>{const next=history.state;history.state=current.before;commit(validateEdited(next));});refresh();}
    else if(!current.pan&&!current.selected&&!current.moved)guard(()=>addPoint(toImage(p,view)));
  }
  canvas.addEventListener('pointerup',event=>endPointer(event));canvas.addEventListener('pointercancel',event=>endPointer(event,true));
  canvas.addEventListener('keydown',event=>{if(busy)return;const key=event.key;if(key==='Escape'){cancel();event.preventDefault();return;}if((event.ctrlKey||event.metaKey)&&key.toLowerCase()==='z'){event.preventDefault();if(event.shiftKey)history.redo();else history.undo();pending=[];selected='';refresh();return;}
    if(key==='Enter'){event.preventDefault();guard(()=>mode==='reference'?applyReference():finish());return;}if(key==='Delete'||key==='Backspace'){event.preventDefault();if(selected)guard(deleteSelected);else{pending.pop();refresh();}return;}
    if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(key)){event.preventDefault();const amount=event.shiftKey?10:1;if(selected){guard(()=>{const before=structuredClone(history.state),points=selected==='reference'?before.calibration?.points:before.marks.find(m=>m.id===selected)?.points;if(!points)return;updatePoint({x:points[handle].x+(key==='ArrowRight'?amount:key==='ArrowLeft'?-amount:0),y:points[handle].y+(key==='ArrowDown'?amount:key==='ArrowUp'?-amount:0)});const next=history.state;history.state=before;commit(validateEdited(next));});}else{view.x+=key==='ArrowRight'?-20:key==='ArrowLeft'?20:0;view.y+=key==='ArrowDown'?-20:key==='ArrowUp'?20:0;redraw();}}
  });
  function dispose(){cancel();observer.disconnect();cancelAnimationFrame(frame);frame=0;image?.close();image=null;file=null;geometry=null;history.clear();selected='';canvas.width=1;canvas.height=1;urls.forEach(url=>URL.revokeObjectURL(url));urls.clear();timers.forEach(timer=>clearTimeout(timer));timers.clear();el('empty').hidden=false;el('image-info').textContent='No image open.';refresh();}
  window.addEventListener('pagehide',dispose);
  window.addEventListener('pageshow',event=>{if(event.persisted){observer.observe(canvas);message('Open an image to start a new local session. Previous image buffers were released when leaving this page.');}});refresh();
}
