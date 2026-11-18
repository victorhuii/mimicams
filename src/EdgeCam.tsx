import {useEffect,useRef,useState} from 'react';
import {models} from './vision/mediapipe';
import {EdgeMotion,findGrip,type Grip,type EdgeCue} from './vision/edge';

const instructions:Record<EdgeCue,string>={pinch:'Pinch two fingers to pick one up',hold:'Bring your fingers to your lips',inhale:'Hold there for a moment…',ready:'Open your mouth a little to exhale',exhale:'And let it drift away.'};
type Puff={x:number;y:number;vx:number;vy:number;born:number;life:number;size:number;wave:number};
function cigarette(ctx:CanvasRenderingContext2D,g:Grip,w:number,h:number,glow:boolean){
 const length=Math.max(36,Math.min(w*.18,g.scale*w*.95)),thick=length*.15;
 ctx.save();ctx.translate(g.x*w,g.y*h);ctx.rotate(Math.atan2(g.dy*h,g.dx*w));
 ctx.lineJoin='round';ctx.lineWidth=Math.max(2,length*.025);ctx.strokeStyle='#483b48';
 ctx.fillStyle='#fff5df';ctx.beginPath();ctx.roundRect(-length*.24,-thick/2,length,thick,thick*.28);ctx.fill();ctx.stroke();
 ctx.fillStyle='#dfae7e';ctx.beginPath();ctx.roundRect(-length*.24,-thick/2,length*.28,thick,thick*.2);ctx.fill();ctx.stroke();
 ctx.fillStyle=glow?'#ff8363':'#c4b8b4';ctx.beginPath();ctx.roundRect(length*.66,-thick/2,length*.10,thick,2);ctx.fill();
 if(glow){ctx.shadowColor='#ff7955';ctx.shadowBlur=18;ctx.fillStyle='#ffbc72';ctx.fillRect(length*.71,-thick*.3,length*.035,thick*.6);}
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
   setStatus('ready');const motion=new EdgeMotion();let grip:Grip|null=null,lastGrip=0,lastVideo=-1,lastCue:EdgeCue='pinch',lastFrame=performance.now();let particles:Puff[]=[];
   const tick=(now:number)=>{try{
    if(token!==generation.current)return;const c=canvas.current;if(!c)return;const w=v.videoWidth,h=v.videoHeight;if(c.width!==w||c.height!==h){c.width=w;c.height=h;}const ctx=c.getContext('2d')!;ctx.clearRect(0,0,w,h);
    if(v.readyState>=2&&v.currentTime!==lastVideo){
     lastVideo=v.currentTime;const handResult=hands.recognizeForVideo(v,now),faceResult=face.detectForVideo(v,now),found=findGrip(handResult.landmarks);
     if(found){const blend=grip?.35:1;grip=grip?{x:grip.x+(found.x-grip.x)*blend,y:grip.y+(found.y-grip.y)*blend,dx:grip.dx+(found.dx-grip.dx)*blend,dy:grip.dy+(found.dy-grip.dy)*blend,scale:found.scale}:found;lastGrip=now;}else if(now-lastGrip>180)grip=null;
     const state=motion.update(found,faceResult.faceLandmarks[0],now);
     if(state.cue!==lastCue){lastCue=state.cue;setCue(state.cue);}
     if(state.puff&&state.mouth){for(let i=0;i<42;i++)particles.push({x:state.mouth.x*w,y:state.mouth.y*h,vx:(Math.random()-.5)*w*.12,vy:-h*(.025+Math.random()*.04),born:now+i*12,life:1800+Math.random()*1400,size:w*(.006+Math.random()*.008),wave:Math.random()*6});}
    }
    const dt=Math.min((now-lastFrame)/1000,.05);lastFrame=now;particles=particles.filter(p=>now-p.born<p.life);
    for(const p of particles){const age=(now-p.born)/p.life;if(age<0)continue;p.x+=p.vx*dt;p.y+=p.vy*dt;const r=p.size*(1+age*4);ctx.globalAlpha=Math.sin(Math.PI*age)*.32;ctx.fillStyle='#f8f2ed';ctx.beginPath();ctx.ellipse(p.x+Math.sin(age*6+p.wave)*w*.012,p.y,r,r*.8,age,0,Math.PI*2);ctx.fill();}ctx.globalAlpha=1;
    if(grip)cigarette(ctx,grip,w,h,lastCue==='inhale'||lastCue==='ready');
    raf.current=requestAnimationFrame(tick);
   }catch(e){if(token!==generation.current)return;stop();setError(`Tracking stopped. ${(e as Error).message}`);setStatus('error');}};raf.current=requestAnimationFrame(tick);
  }catch(e){if(token!==generation.current)return;stream.current?.getTracks().forEach(t=>t.stop());stream.current=null;setStatus('error');setError((e as Error).name==='NotAllowedError'?'Allow camera access in your browser, then try again.':(e as Error).message);}
 }
 return <main className="edge-page"><div className="edge-heading"><span className="edge-kicker">A LITTLE CAMERA PLAY</span><h1>Something to take<br/>the edge off.</h1><p>Pinch. Hold near your lips. Let it drift.</p></div><div className="edge-camera camera"><video ref={video} autoPlay muted playsInline className={status==='ready'?'visible':''}/><canvas ref={canvas} className={status==='ready'?'landmarks visible':'landmarks'} aria-hidden="true"/>{status!=='ready'&&<div className="edge-start"><div className="edge-doodle" aria-hidden="true">〰</div><p>{status==='error'?error:'A cartoon moment, just for you.'}</p><button className="btn" disabled={status==='loading'} onClick={()=>void start()}>{status==='loading'?'Opening camera…':status==='error'?'Try again':'Turn on camera'}</button></div>}<div className="edge-camera-label">{status==='ready'?'LIVE · JUST ON YOUR DEVICE':'YOUR CAMERA'}</div></div><div className="edge-bottom"><p role="status">{status==='ready'?instructions[cue]:'Use a thumb–index pinch, or hold your index and middle fingers together.'}</p>{status==='ready'&&<button className="chip" onClick={stop}>Turn off camera</button>}</div><p className="edge-note">The effect uses finger position and mouth opening to animate a pretend inhale. Camera only; video stays on your device.</p></main>;
}
