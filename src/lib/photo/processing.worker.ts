/// <reference lib="webworker" />
import {readHeader,workingSize,MAX_FILE} from './image.ts';
import {warpPixels} from './warp.ts';
import type {Matrix} from './geometry.ts';
const scope=self as unknown as DedicatedWorkerGlobalScope;
scope.onmessage=async(event: MessageEvent<{file?:File;bitmap?:ImageBitmap;pixels?:ArrayBuffer;sourceWidth?:number;sourceHeight?:number;width?:number;height?:number;inverse?:Matrix}>)=>{
  let bitmap:ImageBitmap|undefined=event.data.bitmap;
  let canvas:OffscreenCanvas|undefined;
  try{
    if(event.data.file){
      const file=event.data.file;if(file.size>MAX_FILE)throw new Error('File is too large. Maximum size is 20 MiB.');
      const header=readHeader(new Uint8Array(await file.slice(0,512*1024).arrayBuffer()));
      const oriented=header.orientation>=5?{width:header.height,height:header.width}:{width:header.width,height:header.height};
      const size=workingSize(oriented.width,oriented.height);
      try{bitmap=await createImageBitmap(file,{imageOrientation:'from-image',resizeWidth:size.width,resizeHeight:size.height,resizeQuality:'high'});}catch{throw new Error('Corrupt image or unsupported encoding. Resave it as JPEG or PNG.');}
      scope.postMessage({bitmap,original:oriented,format:header.format,orientation:header.orientation,offscreen:typeof OffscreenCanvas!=='undefined'},[bitmap]);bitmap=undefined;
    }else if(event.data.pixels){
      const {pixels,sourceWidth,sourceHeight,width,height,inverse}=event.data;
      if(!sourceWidth||!sourceHeight||!width||!height||!inverse||width*height>4_010_000||pixels.byteLength!==sourceWidth*sourceHeight*4)throw new Error('Invalid correction pixels.');
      const data=warpPixels(new Uint8ClampedArray(pixels),sourceWidth,sourceHeight,width,height,inverse);
      scope.postMessage({pixels:data.buffer,width,height},[data.buffer]);
    }else if(bitmap){
      const {width,height,inverse}=event.data;if(!width||!height||!inverse || width*height>4_010_000)throw new Error('Invalid correction size.');
      canvas=new OffscreenCanvas(bitmap.width,bitmap.height);const context=canvas.getContext('2d',{willReadFrequently:true})!;context.drawImage(bitmap,0,0);bitmap.close();bitmap=undefined;
      const source=context.getImageData(0,0,canvas.width,canvas.height);
      const data=warpPixels(source.data,canvas.width,canvas.height,width,height,inverse);
      canvas.width=width;canvas.height=height;context.putImageData(new ImageData(data as Uint8ClampedArray<ArrayBuffer>,width,height),0,0);
      const result=canvas.transferToImageBitmap();scope.postMessage({bitmap:result},[result]);
    }
  }catch(error){scope.postMessage({error:error instanceof Error?error.message:'Image processing failed. Resave the image as JPEG or PNG.'});}
  finally{bitmap?.close();if(canvas){canvas.width=1;canvas.height=1;}}
};
