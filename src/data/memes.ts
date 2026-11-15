export type Mode = 'cat' | 'monke';
export type Meme = { id:string; mode:Mode; label:string; how:string; originalFile:string; sourceUrl:string; mediaType:string; priority:number; verified:boolean; implemented:boolean; assetPath:string };
// Mappings verified against the target site's public packs, not against camera trials.
const cat = [
 ['huhCat','Huh','Open your mouth and eyes wide.','huh.png',true],
 ['sideEyeCat','Side eye','Turn your head to the side.','side eye cat.jpg',true],
 ['sideEyeDownCat','Judgy cat munching','Tilt your head down.','side eye.png',false],
 ['mouthOpenCat','Laugh and point','Open your mouth wide with a hand in frame.','laugh and point .jpg',true],
 ['twoFingersTogether','Muehehe','Touch both index fingertips together.','uwucat.jpg',true],
 ['twoHandsOnHead','Devastated cat','Raise both hands above your head.','two hands on head .jpg',true],
 ['crashOutCat','Crash out cat','Hold two fists beside your face.','crashout cat .jpg',true],
 ['danceCat','Dance cat','Hold one open palm high and one low.','two palms up.mp4',true],
 ['fist','Punch','Make a fist.','punchcat.jpg',true],
 ['rockstar','Rockstar','Hold out your thumb and pinky.','cat.jpg',true],
 ['shhh','Shhh','Hold your index finger to your lips.','shhcat.jpg',true],
 ['oneFingerUp','One finger up','Hold your index finger up.','profcat.jpg',true],
 ['handCoverFace','Kidnap cat','Hold your hand over your face.','hand cover face .jpg',true],
 ['handStretchedOut','I have no monies','Hold out an open palm.','hand stretched out, palm facing up .jpg',true],
 ['default','Pokercat','Nothing in particular.','pokercat.jpg',true],
] as const;
const monke = [
 ['prayHands','Pray','Press both open hands together.','pray monke.jpg',true],
 ['armsFolded','Arms folded','Rest both hands at chest height.','grumpy side monke.jpg',false],
 ['fist','Punch','Make a fist.','punche m onke.png',true],
 ['fingerInMouth','Finger in mouth','Hold your index finger at your mouth.','finger in mouth .jpg',true],
 ['oneFingerUp','Finger up','Hold your index finger up.','finger up .jpg',true],
 ['handOnHead','Pat head','Hold one hand near or above your forehead.','pat head.jpg',true],
 ['leanClose','Zoom in','Lean in close to the camera.','zoom in monke.png',false],
 ['sideEye','Sideways','Turn your head to the side.','sideways monke.jpg',true],
 ['default','Normal monke','Nothing in particular.','normal monk.png',true],
] as const;
export const memes: Meme[] = ([['cat',cat],['monke',monke]] as const).flatMap(([mode,rows])=>rows.map(([id,label,how,originalFile,implemented],priority)=>({id,mode,label,how,originalFile,sourceUrl:`https://gesturememecam.vercel.app/assets/${mode}/${encodeURIComponent(originalFile)}`,mediaType:originalFile.split('.').pop()!,priority,verified:true,implemented,assetPath:`${import.meta.env.BASE_URL}memes/${mode}/${encodeURIComponent(mode === 'cat' && id === 'handStretchedOut' ? 'no-monies.jpg' : originalFile)}`})));
