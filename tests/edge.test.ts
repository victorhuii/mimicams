import {describe,it,expect} from 'vitest';
import {EdgeMotion,findGrip,type Point} from '../src/vision/edge';
const face=(open=false)=>{const f=Array.from({length:478},()=>({x:.5,y:.5}));f[61]={x:.4,y:.5};f[291]={x:.6,y:.5};f[13]={x:.5,y:.5};f[14]={x:.5,y:open?.54:.505};return f;};
const grip={x:.5,y:.53,dx:.05,dy:0,scale:.15};
describe('edge camera interaction',()=>{
 it('requires a hold at the lips before releasing one puff',()=>{const m=new EdgeMotion();expect(m.update(null,face(true),0).puff).toBe(false);for(let t=100;t<=1100;t+=100)m.update(grip,face(),t);expect(m.update(null,face(true),1200).puff).toBe(true);expect(m.update(null,face(true),1300).puff).toBe(false);});
 it('does not arm far from the mouth or with an open mouth',()=>{for(const open of [false,true]){const m=new EdgeMotion();for(let t=0;t<=1500;t+=100)m.update(open?grip:{...grip,x:.1},face(open),t);expect(m.update(null,face(true),1600).puff).toBe(false);}});
 it('clears a pending inhale after face tracking is lost or a long frame gap',()=>{for(const lost of [true,false]){const m=new EdgeMotion();for(let t=0;t<=1000;t+=100)m.update(grip,face(),t);if(lost)m.update(null,undefined,1100);expect(m.update(null,face(true),lost?1200:2000).puff).toBe(false);}});
 it('detects a thumb–index pinch at different scales',()=>{for(const scale of [.5,1,2]){const h:Point[]=Array.from({length:21},()=>({x:0,y:0}));h[9]={x:0,y:.2*scale};h[4]={x:.2*scale,y:.1*scale};h[8]={x:.22*scale,y:.1*scale};expect(findGrip([h])).not.toBeNull();h[4]={x:0,y:0};h[8]={x:.5,y:.5};expect(findGrip([h])).toBeNull();}});
});
