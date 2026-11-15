import type {Mode} from '../data/memes';
export type Point = {x:number;y:number;z?:number};
export type Frame = {hands:Point[][]; gestures?:string[]; face?:Point[]; blend?:Record<string,number>; yaw?:number};
const d=(a:Point,b:Point)=>Math.hypot(a.x-b.x,a.y-b.y);
export function classify(mode:Mode, frame:Frame):string {
 const {hands,face,blend={}}=frame;
 const info=hands.filter(h=>h.length>=21).map((h,i)=>{const scale=d(h[0],h[9])||.001; const up=[8,12,16,20].map(t=>d(h[t],h[0])>d(h[t-2],h[0])*1.12);return {h,scale,up, count:up.filter(Boolean).length, thumb:d(h[4],h[17])/scale>1.05, gesture:frame.gestures?.[i]};});
 const mouth=face?.length && face[13] && face[14] ? {x:(face[13].x+face[14].x)/2,y:(face[13].y+face[14].y)/2}:undefined;
 const width=face?.[234] && face?.[454]?d(face[234],face[454]):0;
 const index=(h:typeof info[number])=>h.gesture==='Pointing_Up'||(h.gesture!=='Open_Palm'&&h.up[0]&&!h.up[1]&&!h.up[2]&&!h.up[3]);
 if(mode==='cat'){
  if(info.length && (blend.jawOpen||0)>.5) return 'mouthOpenCat';
  if(info.length>=2){const [a,b]=info;if(index(a)&&index(b)&&d(a.h[8],b.h[8])/((a.scale+b.scale)/2)<1.4)return 'twoFingersTogether';if(face?.[10]&&a.h[9].y<face[10].y&&b.h[9].y<face[10].y)return 'twoHandsOnHead';if(face?.[10]&&a.count===0&&b.count===0&&Math.abs(a.h[9].y-face[10].y)<width&&Math.abs(b.h[9].y-face[10].y)<width)return 'crashOutCat';if(a.count===4&&b.count===4&&Math.min(a.h[9].y,b.h[9].y)<.35&&Math.max(a.h[9].y,b.h[9].y)>.65)return 'danceCat';}
 } else if(info.length>=2){const [a,b]=info;if(a.count>=3&&b.count>=3&&d(a.h[9],b.h[9])/((a.scale+b.scale)/2)<1.2)return 'prayHands';}
 const h=info[0];
 if(h){if(h.gesture==='Closed_Fist'||(!['Pointing_Up','Open_Palm'].includes(h.gesture||'')&&h.count===0&&!h.thumb))return 'fist';if(mode==='cat'&&h.thumb&&h.up[3]&&!h.up[0]&&!h.up[1]&&!h.up[2])return 'rockstar';if(index(h)){if(mouth&&width&&d(h.h[8],mouth)/width<.55)return mode==='cat'?'shhh':'fingerInMouth';return 'oneFingerUp';}if(mode==='monke'&&face?.[10]&&width&&h.h[9].y<face[10].y&&Math.abs(h.h[9].x-face[10].x)<width)return 'handOnHead';if(mode==='cat'&&mouth&&width&&d(h.h[9],mouth)/width<.7)return 'handCoverFace';if(mode==='cat'&&(h.gesture==='Open_Palm'||h.count===4))return 'handStretchedOut';}
 if(mode==='cat'&&!h&&(blend.jawOpen||0)>.03&&Math.max(blend.eyeWideLeft||0,blend.eyeWideRight||0)>.01)return 'huhCat';
 if(!h&&Math.abs(frame.yaw||0)>15)return mode==='cat'?'sideEyeCat':'sideEye';
 return 'default';
}
