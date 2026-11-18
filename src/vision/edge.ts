export type Point={x:number;y:number};
export type Grip={x:number;y:number;dx:number;dy:number;scale:number};
export type EdgeCue='pinch'|'hold'|'inhale'|'ready'|'exhale';
const distance=(a:Point,b:Point)=>Math.hypot(a.x-b.x,a.y-b.y);
// Normalize thresholds to the palm/face so the gestures work at different distances.
export function findGrip(hands:Point[][]):Grip|null{
 for(const h of hands){if(h.length<21)continue;const scale=distance(h[0],h[9]);if(scale<.025)continue;
  const thumbPinch=distance(h[4],h[8])<scale*.38;
  const twoFingers=distance(h[8],h[12])<scale*.32&&distance(h[8],h[5])>scale*.65&&distance(h[12],h[9])>scale*.65;
  if(!thumbPinch&&!twoFingers)continue;
  const a=h[8],b=h[thumbPinch?4:12],base=h[thumbPinch?6:10];
  return {x:(a.x+b.x)/2,y:(a.y+b.y)/2,dx:a.x-base.x,dy:a.y-base.y,scale};
 }return null;
}
export class EdgeMotion{
 private heldAt:number|null=null;private chargedAt:number|null=null;private lastPuff=-Infinity;private lastTime=0;
 update(grip:Grip|null,face:Point[]|undefined,now:number){
  if(now-this.lastTime>300){this.heldAt=null;this.chargedAt=null;}this.lastTime=now;
  const mouth=face?.[13]&&face?.[14]?{x:(face[13].x+face[14].x)/2,y:(face[13].y+face[14].y)/2}:null;
  const width=face?.[61]&&face?.[291]?distance(face[61],face[291]):0;
  const open=!!face&&width>.015&&distance(face[13],face[14])/width>.11;
  const near=!!grip&&!!mouth&&width>.015&&distance(grip,mouth)<width*.95;
  let puff=false,cue:EdgeCue='pinch';
  if(!mouth){this.heldAt=null;this.chargedAt=null;}
  else if(this.chargedAt!==null){
   cue='ready';if(now-this.chargedAt>6500)this.chargedAt=null;
   else if(open&&now-this.lastPuff>1500){puff=true;cue='exhale';this.lastPuff=now;this.chargedAt=null;this.heldAt=null;}
  }else if(near&&!open){
   this.heldAt??=now;cue='inhale';if(now-this.heldAt>=900){this.chargedAt=now;cue='ready';}
  }else{this.heldAt=null;cue=grip?'hold':'pinch';}
  if(now-this.lastPuff<1100)cue='exhale';
  return {mouth,near,open,puff,cue};
 }
}
