import {distance,valueLabel,type Mark,type Unit,type View} from '../../lib/photo/geometry.ts';
import type {Editing} from '../../lib/photo/model.ts';
export function drawMarks(context: CanvasRenderingContext2D, state: Editing, unit: Unit, view: View, selected = '', pending?: Mark, exporting = false) {
  const {scale,x,y}=view;
  const transform=context.getTransform(),viewport={width:context.canvas.width/transform.a,height:context.canvas.height/transform.d};
  const labels:{x:number;y:number;width:number;height:number}[]=[];
  context.save();context.translate(x,y);context.scale(scale,scale);
  const stroke=exporting ? Math.max(2,context.canvas.width/600) : 2/scale;
  const font=exporting ? Math.max(16,context.canvas.width/65) : 14/scale;
  const marks=[...state.marks];if(pending?.points.length)marks.push(pending);
  if(state.calibration?.points.length)marks.push({id:'reference',kind:'line',label:'Reference',points:state.calibration.points});
  for(const mark of marks){
    const p=mark.points;if(!p.length)continue;
    context.strokeStyle=mark.id==='reference'?'#16704b':mark.id===selected?'#962153':'#b2225b';context.fillStyle=context.strokeStyle;context.lineWidth=stroke;
    context.beginPath();
    if(mark.kind==='circle' && p.length===2)context.arc(p[0].x,p[0].y,distance(p[0],p[1]),0,Math.PI*2);
    else{context.moveTo(p[0].x,p[0].y);p.slice(1).forEach(p=>context.lineTo(p.x,p.y));if(mark.kind==='area' && p.length>=3){context.closePath();context.fillStyle='rgba(178,34,91,.14)';context.fill();}}
    context.stroke();
    if(mark.kind==='arrow' && p.length===2){const a=Math.atan2(p[1].y-p[0].y,p[1].x-p[0].x),l=12*stroke/2;context.beginPath();context.moveTo(p[1].x-l*Math.cos(a-.5),p[1].y-l*Math.sin(a-.5));context.lineTo(p[1].x,p[1].y);context.lineTo(p[1].x-l*Math.cos(a+.5),p[1].y-l*Math.sin(a+.5));context.stroke();}
    if(!exporting || mark.id==='reference')for(const point of p){context.beginPath();context.arc(point.x,point.y,(mark.id===selected?7:4)/scale,0,Math.PI*2);context.fillStyle='white';context.fill();context.stroke();}
    let value='';try{value=valueLabel(mark,state.calibration?.mmPerPixel??null,unit);}catch{/* A partial path has no value yet. */}
    const label=[mark.label,value].filter(Boolean).join(' · ');
    if(label){context.font=`600 ${font}px sans-serif`;const width=Math.min(context.measureText(label).width,viewport.width/scale-12/scale),anchor=mark.kind==='angle'&&p.length===3?p[1]:p[0];
      const tx=Math.max(0,Math.min((viewport.width-x)/scale-width-8/scale,anchor.x+10/scale));let ty=Math.max(font,anchor.y-10/scale);
      // Keep adjacent dimensions readable when they share an endpoint. This layout never edits geometry.
      let box={x:tx-3/scale,y:ty-font,width:width+6/scale,height:font+5/scale};
      for(let attempt=0;attempt<labels.length+1;attempt++){
        const collision=labels.some(b=>box.x<b.x+b.width+2/scale&&box.x+box.width+2/scale>b.x&&box.y<b.y+b.height+2/scale&&box.y+box.height+2/scale>b.y);
        if(!collision)break;const nextY=ty+font+8/scale;if(nextY>(viewport.height-y)/scale-5/scale)break;ty=nextY;box={...box,y:ty-font};
      }
      labels.push(box);context.fillStyle='rgba(255,255,255,.94)';context.fillRect(box.x,box.y,box.width,box.height);context.fillStyle='#231a20';context.fillText(label,tx,ty,Math.max(1,width));}
  }context.restore();
}
