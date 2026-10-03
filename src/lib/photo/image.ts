export const MAX_FILE=20*1024*1024, MAX_PIXELS=32_000_000, MAX_EDGE=12000, WORK_EDGE=2400, WORK_PIXELS=4_000_000;
export interface Header {width:number;height:number;orientation:number;format:'PNG'|'JPEG'|'WebP'}
export function readHeader(bytes: Uint8Array): Header {
  const v=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),char=(i:number)=>String.fromCharCode(bytes[i]);
  const text=(i:number,n:number)=>Array.from({length:n},(_,j)=>char(i+j)).join('');
  let width=0,height=0,orientation=1,format: Header['format'];
  if(bytes.length>=24 && bytes[0]===137 && text(1,3)==='PNG' && text(12,4)==='IHDR'){width=v.getUint32(16);height=v.getUint32(20);format='PNG';}
  else if(bytes.length>=12 && text(0,4)==='RIFF' && text(8,4)==='WEBP') {
    format='WebP';let i=12;
    while(i+8<=bytes.length){const type=text(i,4),size=v.getUint32(i+4,true),p=i+8;
      if(type==='VP8X' && size>=10 && p+10<=bytes.length){width=1+bytes[p+4]+(bytes[p+5]<<8)+(bytes[p+6]<<16);height=1+bytes[p+7]+(bytes[p+8]<<8)+(bytes[p+9]<<16);break;}
      if(type==='VP8 ' && size>=10 && p+10<=bytes.length && bytes[p+3]===157 && bytes[p+4]===1 && bytes[p+5]===42){width=v.getUint16(p+6,true)&16383;height=v.getUint16(p+8,true)&16383;break;}
      if(type==='VP8L' && size>=5 && p+5<=bytes.length && bytes[p]===47){const bits=v.getUint32(p+1,true);width=(bits&16383)+1;height=((bits>>>14)&16383)+1;break;}
      if(p+size>bytes.length)break;
      i=p+size+(size%2);
    }
  } else if(bytes[0]===255 && bytes[1]===216){
    format='JPEG';let i=2;
    while(i+4<=bytes.length){if(bytes[i]!==255)break;while(bytes[i]===255)i++;const marker=bytes[i++];if(marker===217 || marker===218)break;if(marker===1 || (marker>=208&&marker<=215))continue;
      if(i+2>bytes.length)break;const size=v.getUint16(i),p=i+2,end=i+size;if(size<2 || end>bytes.length)break;
      if([192,193,194,195,197,198,199,201,202,203,205,206,207].includes(marker) && size>=7){height=v.getUint16(p+1);width=v.getUint16(p+3);}
      if(marker===225 && size>=16 && text(p,6)==='Exif\0\0'){
        const t=p+6,le=text(t,2)==='II'; if((le||text(t,2)==='MM') && v.getUint16(t+2,le)===42){const d=t+v.getUint32(t+4,le);if(d>=t && d+2<=end){const count=v.getUint16(d,le);for(let j=0;j<count;j++){const a=d+2+j*12;if(a+12>end)break;if(v.getUint16(a,le)===274 && v.getUint16(a+2,le)===3 && v.getUint32(a+4,le)===1)orientation=v.getUint16(a+8,le);}}}
      }i=end;
    }
  }else throw new Error('Unsupported format. Choose a JPEG, PNG or browser-supported WebP image.');
  if(!width || !height || !Number.isFinite(width*height))throw new Error('Corrupt or incomplete image header.');
  if(width>MAX_EDGE || height>MAX_EDGE || width*height>MAX_PIXELS)throw new Error('Image is too large. Use at most 32 megapixels and 12,000 pixels per edge.');
  if(orientation<1 || orientation>8)throw new Error('Invalid EXIF orientation. Resave the image first.');
  return {width,height,orientation,format};
}
export function workingSize(width:number,height:number) {const ratio=Math.min(1,WORK_EDGE/Math.max(width,height),Math.sqrt(WORK_PIXELS/(width*height)));return {width:Math.max(1,Math.floor(width*ratio)),height:Math.max(1,Math.floor(height*ratio))};}
