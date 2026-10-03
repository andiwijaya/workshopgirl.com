import test from 'node:test';
import assert from 'node:assert/strict';
import {readHeader} from '../src/lib/photo/image.ts';
import {webpFixture} from './photo-fixtures.ts';
test('WebP lossy fixture and lossless headers expose bounded dimensions before decoder allocation',()=>{
  assert.deepEqual(readHeader(webpFixture),{width:120,height:80,orientation:1,format:'WebP'});
  const header=Buffer.alloc(25);header.write('RIFF',0);header.write('WEBP',8);header.write('VP8L',12);header.writeUInt32LE(5,16);header[20]=47;
  header.writeUInt32LE(119|(79<<14),21);assert.deepEqual(readHeader(header),{width:120,height:80,orientation:1,format:'WebP'});
  header.writeUInt32LE(11999|(11999<<14),21);assert.throws(()=>readHeader(header),/too large/);
});
