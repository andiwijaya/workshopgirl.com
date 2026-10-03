import { metrics, project, unitMM, type Mark, type Point, type Unit, type Matrix } from './geometry.ts';
export interface Calibration { points: Point[]; mmPerPixel: number; method: 'reference' | 'known-rectangle'; referenceMM: number | null }
export interface Editing { calibration: Calibration | null; marks: Mark[]; notes: string }
export interface ImageGeometry { original: {width: number; height: number}; working: {width: number; height: number}; oriented: true; sourceScale: {x: number; y: number}; rectification: null | {forward: Matrix; inverse: Matrix; corners: Point[]; surfaceMM: {width: number; height: number}; extent: {width: number; height: number}} }
export function sourcePoint(point: Point, geometry: ImageGeometry): Point {
  const p=geometry.rectification ? project(geometry.rectification.inverse,point) : point;
  return {x:p.x*geometry.sourceScale.x,y:p.y*geometry.sourceScale.y};
}
export class History {
  state: Editing={calibration:null,marks:[],notes:''};
  past: Editing[]=[]; future: Editing[]=[];
  change(next: Editing) {this.past.push(structuredClone(this.state));if(this.past.length>80)this.past.shift();this.state=structuredClone(next);this.future=[];}
  undo(){if(this.past.length){this.future.push(this.state);this.state=this.past.pop()!;}}
  redo(){if(this.future.length){this.past.push(this.state);this.state=this.future.pop()!;}}
  clear(state: Editing={calibration:null,marks:[],notes:''}) {this.state=state;this.past=[];this.future=[];}
}
export function exportReport(state: Editing, geometry: ImageGeometry, unit: Unit) {
  return {schema:'workshopgirl.photo-measurement',version:1,tool:'/tools/photo-measurement/',unit,internalUnit:'mm',image:geometry,
    coordinateSystem:'working-image pixels, top-left origin; sourcePoints are EXIF-oriented original pixels',
    calibration:state.calibration ? {...state.calibration,sourcePoints:state.calibration.points.map(p=>sourcePoint(p,geometry))}:null,
    measurements:state.marks.map(mark=>({...mark,sourcePoints:mark.points.map(p=>sourcePoint(p,geometry)),values:metrics(mark,state.calibration?.mmPerPixel??null,unit),valuesMM:metrics(mark,state.calibration?.mmPerPixel??null,'mm')})),notes:state.notes,
    assumptions:['Reference and measurements must share one plane.','Rectification assumes a flat rectangular surface of the supplied dimensions.','Photo estimates are not certified metrology; check critical dimensions directly.'],unitMM:unitMM[unit]};
}
export function safeFilename(name: string) {return (name.replace(/\.[^.]*$/,'').replace(/[^a-zA-Z0-9_-]+/g,'-').replace(/^-+|-+$/g,'').slice(0,70)||'photo')+'-measurements';}
