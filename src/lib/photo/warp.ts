import type { Matrix } from './geometry.ts';
// Destination pixel centers are inverse-mapped; bilinear interpolation uses premultiplied alpha.
export function warpPixels(source: Uint8ClampedArray, sw:number, sh:number, width:number,height:number,h:Matrix): Uint8ClampedArray {
  const target=new Uint8ClampedArray(width*height*4);
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    const px=x+.5,py=y+.5,d=h[6]*px+h[7]*py+h[8];if(Math.abs(d)<1e-10)continue;
    const sx=(h[0]*px+h[1]*py+h[2])/d-.5,sy=(h[3]*px+h[4]*py+h[5])/d-.5;
    if(sx<-.5 || sy<-.5 || sx>sw-.5 || sy>sh-.5)continue;
    const cx=Math.max(0,Math.min(sw-1,sx)),cy=Math.max(0,Math.min(sh-1,sy)),x0=Math.floor(cx),y0=Math.floor(cy),fx=cx-x0,fy=cy-y0;
    const indices=[(y0*sw+x0)*4,(y0*sw+Math.min(sw-1,x0+1))*4,(Math.min(sh-1,y0+1)*sw+x0)*4,(Math.min(sh-1,y0+1)*sw+Math.min(sw-1,x0+1))*4];
    const weights=[(1-fx)*(1-fy),fx*(1-fy),(1-fx)*fy,fx*fy],at=(y*width+x)*4;
    const alpha=indices.reduce((s,i,j)=>s+source[i+3]*weights[j],0);target[at+3]=alpha;
    for(let c=0;c<3;c++)target[at+c]=alpha ? indices.reduce((s,i,j)=>s+source[i+c]*source[i+3]*weights[j],0)/alpha:0;
  }return target;
}
