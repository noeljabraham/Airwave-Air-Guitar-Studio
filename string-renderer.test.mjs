import assert from 'node:assert/strict';
import {drawString} from './string-renderer.mjs';

function render(options,ends=[{x:.1,y:.2},{x:.9,y:.7}]){
  const calls=[];
  const ctx=new Proxy({}, {get:(_,name)=>(...args)=>{
    for(const value of args)if(typeof value==='number')assert.ok(Number.isFinite(value));
    calls.push([name,...args]);
  },set:()=>true});
  const animating=drawString(ctx,ends,900,600,options);
  assert.equal(calls.filter(c=>c[0]==='save').length,calls.filter(c=>c[0]==='restore').length);
  return {calls,animating};
}
const idle=render({});
assert.equal(idle.animating,false);
assert.equal(idle.calls.filter(c=>c[0]==='ellipse').length,2);
const plucked=render({age:100,hit:.25});
assert.equal(plucked.animating,true);
assert.ok(plucked.calls.length>idle.calls.length);
assert.notDeepEqual(plucked.calls,render({age:200,hit:.25}).calls);
assert.equal(render({age:1400}).animating,false);
assert.deepEqual(render({age:100,reduced:true}).calls,render({age:200,reduced:true}).calls);
assert.equal(render({age:100},[{x:.2,y:.2},{x:.2,y:.2}]).animating,false);
for(const ends of [[{x:.5,y:0},{x:.5,y:1}],[{x:1,y:.5},{x:0,y:.5}]])render({age:0,hit:.04},ends);
console.log('String renderer checks passed');
