import {describe,it,expect} from 'vitest';
import {EdgeMotion,findGrip,smokeDirection,type Point,type Grip} from '../src/vision/edge';
const face=(open=false)=>{const f=Array.from({length:478},()=>({x:.5,y:.5}));f[61]={x:.4,y:.5};f[291]={x:.6,y:.5};f[13]={x:.5,y:.5};f[14]={x:.5,y:open?.54:.505};return f;};
const grip:Grip={x:.5,y:.53,dx:.05,dy:0,scale:.15,hand:'Left',kind:'two-fingers'};
describe('edge camera interaction',()=>{
 it('requires a hold at the lips before releasing one puff',()=>{const m=new EdgeMotion();expect(m.update(null,face(true),0).puff).toBe(false);for(let t=100;t<=1100;t+=100)m.update(grip,face(),t);expect(m.update(null,face(true),1200).puff).toBe(true);expect(m.update(null,face(true),1300).puff).toBe(false);});
 it('does not arm far from the mouth or with an open mouth',()=>{for(const open of [false,true]){const m=new EdgeMotion();for(let t=0;t<=1500;t+=100)m.update(open?grip:{...grip,x:.1},face(open),t);expect(m.update(null,face(true),1600).puff).toBe(false);}});
 it('clears a pending inhale after face tracking is lost or a long frame gap',()=>{for(const lost of [true,false]){const m=new EdgeMotion();for(let t=0;t<=1000;t+=100)m.update(grip,face(),t);if(lost)m.update(null,undefined,1100);expect(m.update(null,face(true),lost?1200:2000).puff).toBe(false);}});
 it('detects a thumb–index pinch at different scales',()=>{for(const scale of [.5,1,2]){const h:Point[]=Array.from({length:21},()=>({x:0,y:0}));h[9]={x:0,y:.2*scale};h[4]={x:.2*scale,y:.1*scale};h[8]={x:.22*scale,y:.1*scale};expect(findGrip([h])).not.toBeNull();h[4]={x:0,y:0};h[8]={x:.5,y:.5};expect(findGrip([h])).toBeNull();}});
 it('puts the filter between index and middle fingertips and points horizontally out of either hand',()=>{
  for(const hand of ['Left','Right'] as const)for(const rotation of [0,Math.PI/2,Math.PI]){
   const mirror=hand==='Left'?1:-1;
   const transform=(x:number,y:number)=>({x:.5+mirror*(x*Math.cos(rotation)-y*Math.sin(rotation)),y:.5+x*Math.sin(rotation)+y*Math.cos(rotation)});
   const h=Array.from({length:21},()=>transform(0,.2));h[0]=transform(0,.2);h[5]=transform(-.025,0);h[9]=transform(.025,0);h[8]=transform(-.025,-.19);h[12]=transform(.025,-.19);h[4]=h[8];
   const found=findGrip([h],[[{categoryName:hand}]])!;expect(found.hand).toBe(hand);expect(found.kind).toBe('two-fingers');
   expect(found.x).toBeCloseTo((h[8].x+h[12].x)/2);expect(found.y).toBeCloseTo((h[8].y+h[12].y)/2);
   expect(found.dy).toBe(0);expect(Math.abs(found.dx)).toBeGreaterThan(0);
   const side=h[5].x-h[9].x;if(Math.abs(side)>.01)expect(Math.sign(found.dx)).toBe(Math.sign(side));
  }
 });
 it('continues exhaling from the current moving lips and stops when they close',()=>{
  const m=new EdgeMotion();for(let t=0;t<=1000;t+=100)m.update(grip,face(),t);
  expect(m.update(null,face(true),1100).exhaling).toBe(true);
  const moved=face(true).map(p=>({...p,x:p.x+.15,y:p.y-.1}));const current=m.update(null,moved,1200);
  expect(current.exhaling).toBe(true);expect(current.puff).toBe(false);expect(current.mouth!.x).toBeCloseTo(.65);expect(current.mouth!.y).toBeCloseTo(.42);
  expect(m.update(null,face(),1300).exhaling).toBe(false);expect(m.update(null,face(true),1400).exhaling).toBe(false);
 });
 it('expires an exhale and suppresses emission when face tracking is lost',()=>{
  const m=new EdgeMotion();for(let t=0;t<=1000;t+=100)m.update(grip,face(),t);m.update(null,face(true),1100);
  expect(m.update(null,undefined,1200).exhaling).toBe(false);
  expect(m.update(null,face(true),1300).exhaling).toBe(false);
  const n=new EdgeMotion();for(let t=0;t<=1000;t+=100)n.update(grip,face(),t);n.update(null,face(true),1100);
  let emitting=true;for(let t=1200;t<=3600;t+=100)emitting=n.update(null,face(true),t).exhaling;expect(emitting).toBe(false);
 });
 it('uses the face normal for left/right jets and front-facing expansion',()=>{
  const matrix=(x:number,y:number,z:number)=>{const m=Array(16).fill(0);m[8]=x;m[9]=y;m[10]=z;return m;};
  expect(smokeDirection(matrix(0,0,1))).toEqual({x:0,y:-0,front:1});
  expect(smokeDirection(matrix(.8,0,.6)).x).toBeCloseTo(.8);expect(smokeDirection(matrix(-.8,0,.6)).x).toBeCloseTo(-.8);
  expect(smokeDirection(matrix(.8,0,.6)).front).toBeLessThan(smokeDirection(matrix(0,0,1)).front);
 });
});
