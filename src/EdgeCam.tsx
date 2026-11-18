import {useEffect,useRef,useState} from 'react';
import {models} from './vision/mediapipe';
import {EdgeMotion,CigaretteLife,findGrip,cigaretteAngle,smokeDirection,type Grip,type EdgeCue} from './vision/edge';

const instructions:Record<EdgeCue,string>={pinch:'Pinch two fingers to pick one up',hold:'Bring your fingers to your lips',inhale:'Hold there for a moment…',away:'Move the cigarette away from your lips',ready:'Open your mouth a little to exhale',exhale:'And let it drift away.',out:'All out. Release your fingers, then pinch for a fresh one.'};
type Puff={x:number;y:number;vx:number;vy:number;born:number;life:number;size:number;wave:number;front:number};
function cigarette(ctx:CanvasRenderingContext2D,g:Grip,w:number,h:number,glow:boolean,remaining:number,snuff:number){
 const length=Math.max(36,Math.min(w*.18,g.scale*w*.95)),thick=length*.15;
 ctx.save();ctx.translate(g.x*w,g.y*h);ctx.rotate(cigaretteAngle(g));
 const extinguishing=snuff>=0,progress=Math.max(0,snuff);
 if(extinguishing){ctx.translate(length*.035*Math.sin(progress*Math.PI*5)*(1-progress),thick*.25*Math.sin(progress*Math.PI));ctx.scale(1,1-.28*Math.sin(progress*Math.PI));ctx.globalAlpha=1-Math.max(0,(progress-.65)/.35);}
 const filterStart=-length*.24,filterLength=length*.28,paperStart=filterStart+filterLength,paperLength=length*.72*remaining,tip=paperStart+paperLength;
 ctx.lineJoin='round';ctx.lineWidth=Math.max(2,length*.025);ctx.strokeStyle='#483b48';
 if(paperLength>.5){ctx.fillStyle='#fff5df';ctx.beginPath();ctx.roundRect(paperStart,-thick/2,paperLength,thick,Math.min(thick*.28,paperLength/2));ctx.fill();ctx.stroke();}
 ctx.fillStyle='#dfae7e';ctx.beginPath();ctx.roundRect(filterStart,-thick/2,filterLength,thick,thick*.2);ctx.fill();ctx.stroke();
 const ember=extinguishing?progress<.3:glow;
 ctx.fillStyle=extinguishing?(ember?'#ef8b65':'#5b5355'):glow?'#ff8363':'#c4b8b4';ctx.beginPath();ctx.roundRect(tip-length*.035,-thick/2,length*.05,thick,2);ctx.fill();
 if(ember){ctx.shadowColor='#ff7955';ctx.shadowBlur=18*(1-progress);ctx.fillStyle='#ffbc72';ctx.fillRect(tip-length*.02,-thick*.3,length*.025,thick*.6);ctx.shadowBlur=0;}
 // A small curl rises from the darkening tip while the stub squashes and fades.
 if(extinguishing&&progress<.85){ctx.strokeStyle='#ded5d2';ctx.lineWidth=length*.018;ctx.globalAlpha*=Math.sin(progress/.85*Math.PI)*.65;ctx.beginPath();ctx.moveTo(tip,-thick*.6);ctx.bezierCurveTo(tip+thick,-thick*(1+progress*4),tip-thick,-thick*(2+progress*4),tip+thick*.4,-thick*(3+progress*4));ctx.stroke();}
 ctx.restore();
}
export default function EdgeCam(){
 const video=useRef<HTMLVideoElement>(null),canvas=useRef<HTMLCanvasElement>(null),stream=useRef<MediaStream|null>(null),raf=useRef(0),generation=useRef(0);
 const [status,setStatus]=useState<'off'|'loading'|'ready'|'error'>('off'),[error,setError]=useState(''),[cue,setCue]=useState<EdgeCue>('pinch');
 function stop(){generation.current++;cancelAnimationFrame(raf.current);stream.current?.getTracks().forEach(t=>t.stop());stream.current=null;if(video.current)video.current.srcObject=null;canvas.current?.getContext('2d')?.clearRect(0,0,canvas.current.width,canvas.current.height);setStatus('off');setCue('pinch');}
 useEffect(()=>()=>{generation.current++;cancelAnimationFrame(raf.current);stream.current?.getTracks().forEach(t=>t.stop());},[]);
 async function start(){
  const token=++generation.current;setError('');setStatus('loading');
  try{
   if(!navigator.mediaDevices?.getUserMedia)throw new Error('Open this page on HTTPS or localhost to use the camera.');
   const s=await navigator.mediaDevices.getUserMedia({video:{facingMode:'user',width:{ideal:960},height:{ideal:720}},audio:false});
   if(token!==generation.current){s.getTracks().forEach(t=>t.stop());return;}stream.current=s;
   const v=video.current!;v.srcObject=s;await v.play();const [hands,face]=await models();if(token!==generation.current)return;
   setStatus('ready');let motion=new EdgeMotion();const life=new CigaretteLife();let grip:Grip|null=null,lastGrip=0,lastVideo=-1,lastCue:EdgeCue='pinch',motionCue:EdgeCue='pinch',lastFrame=performance.now(),lastTracked=0,emission=0;let particles:Puff[]=[];
   let mouth:{x:number;y:number}|null=null,exhaling=false,burnedOut=false,direction={x:0,y:0,front:1};
   const tick=(now:number)=>{try{
    if(token!==generation.current)return;const c=canvas.current;if(!c)return;const w=v.videoWidth,h=v.videoHeight;if(c.width!==w||c.height!==h){c.width=w;c.height=h;}const ctx=c.getContext('2d')!;ctx.clearRect(0,0,w,h);
    if(v.readyState>=2&&v.currentTime!==lastVideo){
     lastVideo=v.currentTime;const handResult=hands.recognizeForVideo(v,now),faceResult=face.detectForVideo(v,now),found=findGrip(handResult.landmarks,handResult.handedness);
     if(found){const previous=grip,blend=.45;grip=previous&&previous.hand===found.hand&&previous.kind===found.kind?{...found,x:previous.x+(found.x-previous.x)*blend,y:previous.y+(found.y-previous.y)*blend,dx:previous.dx+(found.dx-previous.dx)*blend,dy:previous.dy+(found.dy-previous.dy)*blend}:found;lastGrip=now;}else if(now-lastGrip>180)grip=null;
     const state=motion.update(grip,faceResult.faceLandmarks[0],now,!burnedOut);
     if(state.inhaled)life.inhale(now);motionCue=state.cue;
     mouth=state.mouth;exhaling=state.exhaling;lastTracked=now;direction=smokeDirection(faceResult.facialTransformationMatrixes?.[0]?.data);
    }
    const dt=Math.min((now-lastFrame)/1000,.05);lastFrame=now;particles=particles.filter(p=>now-p.born<p.life);
    // Emit at the latest lip position throughout the exhale. Older smoke drifts
    // freely, leaving a trail as the mouth moves rather than dragging the cloud.
    if(exhaling&&mouth&&now-lastTracked<180){emission+=dt*40;while(emission>=1){emission--;particles.push({x:mouth.x*w,y:mouth.y*h,vx:direction.x*w*.30+(Math.random()-.5)*w*.025,vy:direction.y*h*.24-h*.018+(Math.random()-.5)*h*.02,born:now,life:1300+Math.random()*900,size:w*(.006+Math.random()*.009),wave:Math.random()*6,front:direction.front});}}else emission=0;
    for(const p of particles){const age=(now-p.born)/p.life;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy-=h*.014*dt;const r=p.size*(1+age*(3+p.front*11));ctx.globalAlpha=Math.sin(Math.PI*age)*(.12+p.front*.03);ctx.fillStyle='#f8f2ed';ctx.beginPath();ctx.ellipse(p.x+Math.sin(age*6+p.wave)*w*.009,p.y,r,r*(.72+p.front*.28),0,0,Math.PI*2);ctx.fill();}ctx.globalAlpha=1;
    const cigaretteState=life.update(now,!!grip);
    burnedOut=cigaretteState.finished;
    if(cigaretteState.fresh){motion=new EdgeMotion();motionCue='hold';exhaling=false;}
    const nextCue=cigaretteState.finished?'out':motionCue;if(nextCue!==lastCue){lastCue=nextCue;setCue(nextCue);}
    if(grip)cigarette(ctx,grip,w,h,motionCue==='inhale'||motionCue==='ready',cigaretteState.remaining,cigaretteState.finished?cigaretteState.snuff:-1);
    raf.current=requestAnimationFrame(tick);
   }catch(e){if(token!==generation.current)return;stop();setError(`Tracking stopped. ${(e as Error).message}`);setStatus('error');}};raf.current=requestAnimationFrame(tick);
  }catch(e){if(token!==generation.current)return;stream.current?.getTracks().forEach(t=>t.stop());stream.current=null;setStatus('error');setError((e as Error).name==='NotAllowedError'?'Allow camera access in your browser, then try again.':(e as Error).message);}
 }
 return <main className="edge-page"><div className="edge-heading"><span className="edge-kicker">A LITTLE CAMERA PLAY</span><h1>Something to take<br/>the edge off.</h1><p>Pinch. Hold near your lips. Let it drift.</p></div><div className="edge-camera camera"><video ref={video} autoPlay muted playsInline className={status==='ready'?'visible':''}/><canvas ref={canvas} className={status==='ready'?'landmarks visible':'landmarks'} aria-hidden="true"/>{status!=='ready'&&<div className="edge-start"><div className="edge-doodle" aria-hidden="true">〰</div><p>{status==='error'?error:'A cartoon moment, just for you.'}</p><button className="btn" disabled={status==='loading'} onClick={()=>void start()}>{status==='loading'?'Opening camera…':status==='error'?'Try again':'Turn on camera'}</button></div>}<div className="edge-camera-label">{status==='ready'?'LIVE · JUST ON YOUR DEVICE':'YOUR CAMERA'}</div></div><div className="edge-bottom"><p role="status">{status==='ready'?instructions[cue]:'Use a thumb–index pinch, or hold your index and middle fingers together.'}</p>{status==='ready'&&<button className="chip" onClick={stop}>Turn off camera</button>}</div><p className="edge-note">The effect uses finger position and mouth opening to animate a pretend inhale. Camera only; video stays on your device.</p></main>;
}
