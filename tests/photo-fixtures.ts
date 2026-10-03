import {deflateSync} from 'node:zlib';
export function crc32(bytes:Uint8Array){let crc=0xffffffff;for(const b of bytes){crc^=b;for(let i=0;i<8;i++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}return (crc^0xffffffff)>>>0;}
export function pngFixture(width=1000,height=1000,grid=true){
  const chunk=(type:string,data:Buffer)=>{const name=Buffer.from(type),size=Buffer.alloc(4),crc=Buffer.alloc(4);size.writeUInt32BE(data.length);crc.writeUInt32BE(crc32(Buffer.concat([name,data])));return Buffer.concat([size,name,data,crc]);};
  const ihdr=Buffer.alloc(13);ihdr.writeUInt32BE(width,0);ihdr.writeUInt32BE(height,4);ihdr[8]=8;ihdr[9]=2;
  const pixels=Buffer.alloc((width*3+1)*height,255);
  for(let y=0;y<height;y++){pixels[y*(width*3+1)]=0;if(grid)for(let x=0;x<width;x++){if(x%100===0||y%100===0){const i=y*(width*3+1)+1+x*3;pixels[i]=180;pixels[i+1]=190;pixels[i+2]=200;}}}
  return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',ihdr),chunk('IDAT',deflateSync(pixels)),chunk('IEND',Buffer.alloc(0))]);
}
export function exifJPEG(jpeg:Buffer,orientation:number){const data=Buffer.alloc(32);data.write('Exif\0\0',0,'binary');data.write('II',6);data.writeUInt16LE(42,8);data.writeUInt32LE(8,10);data.writeUInt16LE(1,14);data.writeUInt16LE(274,16);data.writeUInt16LE(3,18);data.writeUInt32LE(1,20);data.writeUInt16LE(orientation,24);const size=Buffer.alloc(2);size.writeUInt16BE(data.length+2);return Buffer.concat([jpeg.subarray(0,2),Buffer.from([255,225]),size,data,jpeg.subarray(2)]);}

// Generated locally with Canvas: a 120 × 80 red/blue image; only its VP8 chunk is retained.
export const webpFixture=Buffer.from('UklGRpQAAABXRUJQVlA4IIgAAACwBwCdASp4AFAAPm02l0ikIyIhJMgAgA2JZwDWLQA/ADTAfgBRgPwArv/cAADwLHXQdAgXS2LcVNDH8q3Rdy7ICBYjGiyQAP7wm0LsxmhDwB7r9+QH/ID/+PfFPqfzXyu0D4Z2V7P1FSJmJm6Wbw7UPmlrgyCkD3N0rxIFeAUfQZkt6QRwhIAA','base64');
