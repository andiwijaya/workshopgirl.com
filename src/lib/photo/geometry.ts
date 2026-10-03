export interface Point { x: number; y: number }
export type Unit = 'mm' | 'cm' | 'm' | 'inch';
export const unitMM: Record<Unit, number> = { mm: 1, cm: 10, m: 1000, inch: 25.4 };
export type Matrix = number[];
export const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
export function positive(value: number, name = 'Dimension'): number {
  if (!Number.isFinite(value) || value <= 0 || value > 1e9) throw new Error(name + ' must be positive and finite (at most 1 billion).');
  return value;
}
export function validPoints(points: Point[]) {
  if (!points.every(p => Number.isFinite(p.x) && Number.isFinite(p.y) && Math.abs(p.x) < 1e8 && Math.abs(p.y) < 1e8)) throw new Error('Invalid image coordinates.');
}
export function scaleFromReference(points: Point[], value: number, unit: Unit): number {
  validPoints(points);
  if (points.length !== 2 || distance(points[0], points[1]) < 2) throw new Error('Place two reference points at least 2 image pixels apart.');
  return positive(value) * unitMM[unit] / distance(points[0], points[1]);
}
export const cross = (a: Point, b: Point, c: Point) => (b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);
export function polygonArea(points: Point[]): number {
  return Math.abs(points.reduce((sum, p, i) => { const q = points[(i+1)%points.length]; return sum + p.x*q.y - q.x*p.y; }, 0)) / 2;
}
export function simplePolygon(points: Point[]) {
  validPoints(points);
  if (points.length < 3 || polygonArea(points) < 1e-6) throw new Error('Area needs at least three distinct corners enclosing an area.');
  for (let i=0;i<points.length;i++) {
    if (distance(points[i],points[(i+1)%points.length]) < 1e-6) throw new Error('Repeated polygon corner.');
    for (let j=i+1;j<points.length;j++) {
      if (j===i+1 || (i===0 && j===points.length-1)) continue;
      const a=points[i],b=points[(i+1)%points.length],c=points[j],d=points[(j+1)%points.length];
      const c1=cross(a,b,c),c2=cross(a,b,d),c3=cross(c,d,a),c4=cross(c,d,b);
      if (c1*c2<=0 && c3*c4<=0 && Math.max(a.x,b.x)>=Math.min(c.x,d.x) && Math.max(c.x,d.x)>=Math.min(a.x,b.x) && Math.max(a.y,b.y)>=Math.min(c.y,d.y) && Math.max(c.y,d.y)>=Math.min(a.y,b.y)) throw new Error('Polygon edges must not cross or touch.');
    }
  }
}
export type Kind = 'distance' | 'angle' | 'polyline' | 'area' | 'circle' | 'line' | 'arrow' | 'text';
export interface Mark { id: string; kind: Kind; points: Point[]; label: string }
export function metrics(mark: Mark, mmPerPixel: number | null, unit: Unit) {
  const p=mark.points; validPoints(p);
  if (p.length > 200) throw new Error('A path may have at most 200 points.');
  const factor=mmPerPixel===null ? null : positive(mmPerPixel) / unitMM[unit];
  if (mark.kind === 'text') { if (p.length!==1) throw new Error('Text needs one point.'); return { text: mark.label }; }
  if (mark.kind==='area') { simplePolygon(p); return { area: factor===null ? null : polygonArea(p)*factor*factor, unit: unit+'²' }; }
  if (mark.kind==='angle') {
    if (p.length!==3 || distance(p[0],p[1])<1e-6 || distance(p[2],p[1])<1e-6) throw new Error('Angle needs three points with distinct arms; the second is the vertex.');
    const a={x:p[0].x-p[1].x,y:p[0].y-p[1].y},b={x:p[2].x-p[1].x,y:p[2].y-p[1].y};
    return { angle: Math.atan2(Math.abs(a.x*b.y-a.y*b.x), a.x*b.x+a.y*b.y)*180/Math.PI, unit: 'degrees' };
  }
  if (p.length<2 || (mark.kind!=='polyline' && p.length!==2)) throw new Error('This tool needs two points.');
  const pixels=p.slice(1).reduce((s,b,i)=>s+distance(p[i],b),0); positive(pixels,'Length');
  if (mark.kind==='circle') return { radius: factor===null ? null : pixels*factor, diameter: factor===null ? null : pixels*factor*2, unit };
  return { length: factor===null ? null : pixels*factor, unit };
}
export function valueLabel(mark: Mark, scale: number | null, unit: Unit): string {
  const result=metrics(mark,scale,unit), f=(v: number | null | undefined)=>v==null ? 'uncalibrated' : Number(v.toFixed(3)).toString();
  if ('angle' in result) return f(result.angle)+'°';
  if ('area' in result) return f(result.area)+(scale===null?'':' '+unit+'²');
  if ('radius' in result) return 'r '+f(result.radius)+' / Ø '+f(result.diameter)+(scale===null?'':' '+unit);
  if (mark.kind==='line' || mark.kind==='arrow' || mark.kind==='text') return '';
  return f(result.length)+(scale===null?'':' '+unit);
}
export function project(h: Matrix, p: Point): Point {
  validPoints([p]);
  const w=h[6]*p.x+h[7]*p.y+h[8];
  if (h.length!==9 || !h.every(Number.isFinite) || Math.abs(w)<1e-10) throw new Error('Projective transform reaches infinity.');
  const q={x:(h[0]*p.x+h[1]*p.y+h[2])/w,y:(h[3]*p.x+h[4]*p.y+h[5])/w}; validPoints([q]); return q;
}
export function multiply(a: Matrix,b: Matrix): Matrix {
  return Array.from({length:9},(_,i)=>{const r=Math.floor(i/3),c=i%3;return a[r*3]*b[c]+a[r*3+1]*b[3+c]+a[r*3+2]*b[6+c];});
}
export function inverse(h: Matrix): Matrix {
  const [a,b,c,d,e,f,g,j,k]=h;
  const out=[e*k-f*j,c*j-b*k,b*f-c*e,f*g-d*k,a*k-c*g,c*d-a*f,d*j-e*g,b*g-a*j,a*e-b*d];
  const determinant=a*out[0]+b*out[3]+c*out[6];
  if (!Number.isFinite(determinant) || Math.abs(determinant)<1e-12) throw new Error('Singular perspective transform.');
  return out.map(v=>v/determinant);
}
function normalization(p: Point[]) {
  const x=p.reduce((s,p)=>s+p.x,0)/p.length,y=p.reduce((s,p)=>s+p.y,0)/p.length;
  const spread=Math.max(...p.map(p=>Math.hypot(p.x-x,p.y-y)));
  if (spread<1e-6) throw new Error('Degenerate corners.');
  return [1/spread,0,-x/spread,0,1/spread,-y/spread,0,0,1];
}
export function homography(from: Point[], to: Point[]): Matrix {
  validPoints([...from,...to]);
  if (from.length!==4 || to.length!==4) throw new Error('Perspective needs exactly four corners.');
  for (const points of [from,to]) {
    const signs=points.map((p,i)=>cross(p,points[(i+1)%4],points[(i+2)%4]));
    if (!(signs.every(s=>s>1e-6)||signs.every(s=>s< -1e-6))) throw new Error('Corners must form a convex rectangle outline in perimeter order.');
  }
  const n=normalization(from),m=normalization(to),p=from.map(p=>project(n,p)),q=to.map(p=>project(m,p));
  const rows: number[][]=[];
  for (let i=0;i<4;i++) { const {x,y}=p[i],u=q[i].x,v=q[i].y; rows.push([x,y,1,0,0,0,-u*x,-u*y,u],[0,0,0,x,y,1,-v*x,-v*y,v]); }
  for (let c=0;c<8;c++) {
    let pivot=c;for(let r=c+1;r<8;r++)if(Math.abs(rows[r][c])>Math.abs(rows[pivot][c]))pivot=r;
    if(Math.abs(rows[pivot][c])<1e-10)throw new Error('Unstable perspective: choose a larger, less foreshortened rectangle.');
    [rows[c],rows[pivot]]=[rows[pivot],rows[c]];const div=rows[c][c];rows[c]=rows[c].map(v=>v/div);
    for(let r=0;r<8;r++)if(r!==c){const f=rows[r][c];rows[r]=rows[r].map((v,i)=>v-f*rows[c][i]);}
  }
  const h=multiply(multiply(inverse(m),[...rows.map(row=>row[8]),1]),n); inverse(h);
  from.forEach((p,i)=>{ if(distance(project(h,p),to[i])>1e-5)throw new Error('Perspective solution is unstable.'); });
  return h;
}
export function rectanglePlan(corners: Point[], widthMM: number, heightMM: number) {
  positive(widthMM,'Surface width');positive(heightMM,'Surface height');
  if (widthMM/heightMM>20 || heightMM/widthMM>20) throw new Error('Surface aspect ratio must be between 1:20 and 20:1.');
  if (corners.length!==4 || polygonArea(corners)<100 || corners.some((p,i)=>distance(p,corners[(i+1)%4])<5)) throw new Error('Choose four well-separated corners covering at least 100 image pixels².');
  const longest=Math.min(2000,Math.max(...corners.map((p,i)=>distance(p,corners[(i+1)%4]))));
  const scale=Math.max(widthMM,heightMM)/longest;
  const width=widthMM/scale,height=heightMM/scale;
  const target=[{x:0,y:0},{x:width,y:0},{x:width,y:height},{x:0,y:height}];
  const forward=homography(corners,target);
  return {width:Math.ceil(width),height:Math.ceil(height),extent:{width,height},mmPerPixel:scale,forward,inverse:inverse(forward),surfaceMM:{width:widthMM,height:heightMM},corners};
}
export interface View { scale: number; x: number; y: number }
export const toImage=(p: Point,v: View): Point=>({x:(p.x-v.x)/v.scale,y:(p.y-v.y)/v.scale});
export const toScreen=(p: Point,v: View): Point=>({x:p.x*v.scale+v.x,y:p.y*v.scale+v.y});
export function zoomAt(view: View, anchor: Point, ratio: number): View {
  const p=toImage(anchor,view),scale=Math.min(20,Math.max(.02,view.scale*ratio));
  return {scale,x:anchor.x-p.x*scale,y:anchor.y-p.y*scale};
}
