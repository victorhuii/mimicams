export type Point={x:number;y:number};
export type Grip={x:number;y:number;dx:number;dy:number;scale:number;hand:'Left'|'Right'|'Unknown';kind:'two-fingers'|'thumb-pinch'};
export type EdgeCue='pinch'|'hold'|'inhale'|'away'|'ready'|'exhale'|'out';
const distance=(a:Point,b:Point)=>Math.hypot(a.x-b.x,a.y-b.y);
// Normalize thresholds to the palm/face so the gestures work at different distances.
export function findGrip(hands:Point[][],handedness:{categoryName:string}[][]=[]):Grip|null{
 for(let i=0;i<hands.length;i++){const h=hands[i];if(h.length<21)continue;const scale=distance(h[0],h[9]);if(scale<.025)continue;
  const thumbPinch=distance(h[4],h[8])<scale*.38;
  const twoFingers=distance(h[8],h[12])<scale*.95&&distance(h[8],h[5])>scale*.55&&distance(h[12],h[9])>scale*.55;
  if(!thumbPinch&&!twoFingers)continue;
  // Prefer the index/middle grip even if the thumb happens to touch the index.
  // The filter sits in their gap, with the lit end extending horizontally
  // toward the index/thumb edge of the hand rather than along the fingers.
  const a=h[8],b=h[twoFingers?12:4],x=(a.x+b.x)/2,y=(a.y+b.y)/2;
  const base=twoFingers?{x:(h[5].x+h[9].x)/2,y:(h[5].y+h[9].y)/2}:h[6];
  const label=handedness[i]?.[0]?.categoryName;
  const side=h[5].x-h[9].x;
  // The canvas is mirrored with the selfie video. Positive camera X appears
  // left in the preview: a left hand points left, a right hand points right.
  const outward=label==='Left'?1:label==='Right'?-1:Math.abs(side)>scale*.04?Math.sign(side):1;
  return {x,y,dx:twoFingers?outward*scale:x-base.x,dy:twoFingers?0:y-base.y,scale,hand:label==='Left'||label==='Right'?label:'Unknown',kind:twoFingers?'two-fingers':'thumb-pinch'};
 }return null;
}
export function cigaretteAngle(grip:Grip){
 // Constrain the final drawing for EVERY grip, including a thumb-pinch
 // fallback. Finger direction must never rotate this prop upright.
 const outward=grip.hand==='Left'?1:grip.hand==='Right'?-1:Math.sign(grip.dx)||1;
 return outward>0?-Math.PI/18:-Math.PI+Math.PI/18;
}
export class EdgeMotion{
 private heldAt:number|null=null;private chargedAt:number|null=null;private lastPuff=-Infinity;private lastTime=0;private exhaleUntil=0;private inhaleLatched=false;
 update(grip:Grip|null,face:Point[]|undefined,now:number,canInhale=true){
  if(now-this.lastTime>300){this.heldAt=null;this.chargedAt=null;this.exhaleUntil=0;}this.lastTime=now;
  const mouth=face?.[13]&&face?.[14]?{x:(face[13].x+face[14].x)/2,y:(face[13].y+face[14].y)/2}:null;
  const width=face?.[61]&&face?.[291]?distance(face[61],face[291]):0;
  const open=!!face&&width>.015&&distance(face[13],face[14])/width>.11;
  const near=!!grip&&!!mouth&&width>.015&&distance(grip,mouth)<width*.95;
  if(!near)this.inhaleLatched=false;
  let puff=false,inhaled=false,cue:EdgeCue='pinch';
  if(!mouth){this.heldAt=null;this.chargedAt=null;this.exhaleUntil=0;}
  else if(now<this.exhaleUntil){cue=near||!open?'hold':'exhale';if(!open||near)this.exhaleUntil=0;}
  else if(this.chargedAt!==null){
   cue=near?'away':'ready';if(now-this.chargedAt>6500)this.chargedAt=null;
   else if(!near&&open&&now-this.lastPuff>1500){puff=true;cue='exhale';this.lastPuff=now;this.exhaleUntil=now+2400;this.chargedAt=null;this.heldAt=null;}
  }else if(near&&!open&&canInhale&&!this.inhaleLatched){
   this.heldAt??=now;cue='inhale';if(now-this.heldAt>=900){this.chargedAt=now;cue='ready';inhaled=true;this.inhaleLatched=true;}
  }else{this.heldAt=null;cue=grip?'hold':'pinch';}
  if(!near&&now<this.exhaleUntil)cue='exhale';
  return {mouth,near,open,puff,inhaled,cue,exhaling:!!mouth&&!near&&open&&now<this.exhaleUntil};
 }
}
export class CigaretteLife{
 private draws=0;private from=1;private target=1;private changed=0;private finishedAt:number|null=null;private released=false;
 private remaining(now:number){const t=Math.min(1,Math.max(0,(now-this.changed)/450));return this.from+(this.target-this.from)*(1-Math.pow(1-t,3));}
 inhale(now:number){
  if(this.finishedAt!==null)return;
  this.from=this.remaining(now);this.target=Math.max(0,1-(++this.draws)/6);this.changed=now;
  if(this.draws===6)this.finishedAt=now+450;
 }
 update(now:number,holding:boolean){
  let fresh=false;
  if(this.finishedAt!==null&&now>=this.finishedAt+1400){
   if(!holding)this.released=true;
   else if(this.released){this.draws=0;this.from=1;this.target=1;this.finishedAt=null;this.released=false;fresh=true;}
  }
  const snuff=this.finishedAt===null?-1:Math.max(0,Math.min(1,(now-this.finishedAt)/1400));
  return {remaining:this.remaining(now),snuff,finished:this.finishedAt!==null,fresh};
 }
}
export function smokeDirection(matrix:ArrayLike<number>|undefined){
 // Face transform's third column is the head's forward normal. Keep positions
 // in camera coordinates; video and canvas are mirrored together by CSS.
 if(!matrix||matrix.length<16)return {x:0,y:0,front:1};
 const x=matrix[8],y=-matrix[9],z=Math.abs(matrix[10]),length=Math.hypot(x,y,z)||1;
 return {x:x/length,y:y/length,front:z/length};
}
