import {instruments,shortcuts,noteName,keyStrikes,intersects,tuning,vibration} from './instrument.mjs';

const $=id=>document.getElementById(id);
const canvas=document.querySelector('canvas'), video=document.querySelector('video'), ctx=canvas.getContext('2d');
let voice='Guitar',offset=0,hands=[],socket,stream,frame,lastVideo=-1;
let audio,master,pointer,flashes=[];
const strings=[],guitarNotes=instruments.Guitar.notes;
let draft=null, contacts=new Set(),draftNote;
let adding=true,revision=0,motionFrame=0,pluckPositions=[];
const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
function resetGesture(){
  revision++;
  if(socket?.readyState===WebSocket.OPEN)socket.send('reset');
}
function setAdding(value){
  adding=value;resetGesture();pointer=null;cancelDraft();
  $('addString').textContent=value?'Pause drawing':'Add string';
  $('guide').textContent=value?instruments.Guitar.guide:'Sweep your fingertip or drag across a string to pluck it. Choose Add string to draw another.';
}
$('addString').onclick=()=>{setAdding(!adding);paint()};
const aspect=()=>canvas.clientWidth/canvas.clientHeight;
function updateDraft(ends){
  draft=ends;
  const [a,b]=ends;
  if(Math.hypot(a.x-b.x,(a.y-b.y)/aspect())<.055){
    draftNote=undefined;contacts.clear();return;
  }
  draftNote=tuning(ends,guitarNotes,aspect());
  const touching=new Set();
  strings.forEach((string,i)=>{if(intersects(ends,string))touching.add(i)});
  const entered=[...touching].filter(i=>!contacts.has(i));
  if(entered.length){
    sound(draftNote);
    entered.forEach(i=>play(i));
  }
  contacts=touching;
}
function cancelDraft(){draft=null;contacts.clear();draftNote=undefined}
function place(){
  if(draft && draftNote!==undefined){
    strings.push(draft);guitarNotes.push(draftNote);
    renderPads();play(strings.length-1);
    contacts.forEach(i=>play(i));
  }
  resetGesture();cancelDraft();paint();
}
const edges=[[0,1,2,3,4],[0,5,6,7,8],[5,9,13,17,0],[9,10,11,12],[13,14,15,16],[17,18,19,20]];
function enableAudio(){
  if(!audio){
    audio=new AudioContext();
    master=audio.createGain();
    master.gain.value=$('volume').value/100;
    const limiter=audio.createDynamicsCompressor();
    master.connect(limiter).connect(audio.destination);
  }
  if(audio.state==='suspended') audio.resume().catch(()=>{$('status').textContent='Click a note to resume audio.'});
}
function sound(midi,delay=0){
  enableAudio();
  const freq=440*2**((midi-69)/12);
  const start=audio.currentTime+delay, duration={Guitar:1.4,Piano:2.1,Marimba:.85}[voice];
  const partials={Guitar:[[1,.23],[2,.12],[3,.08],[4,.035],[5,.03]],Piano:[[1,.3],[2,.13],[3,.055],[4.01,.05]],Marimba:[[1,.33],[4,.14],[10,.04]]}[voice];
  for(const [ratio,level] of partials){
    const osc=audio.createOscillator(), env=audio.createGain(),end=start+duration/Math.sqrt(ratio);
    osc.frequency.value=freq*ratio;
    env.gain.setValueAtTime(.0001,start);
    env.gain.exponentialRampToValueAtTime(level,start+.007);
    env.gain.exponentialRampToValueAtTime(.0001,end);
    osc.connect(env).connect(master);osc.start(start);osc.stop(end);
  }
}
function play(i,delay=0,position=.5){
  const midi=instruments[voice].notes[i];
  sound(midi,delay);
  flashes[i]=performance.now()+delay*1000;
  pluckPositions[i]=position;
  const pad=$('pads').children[i];
  pad.classList.add('hit');
  setTimeout(()=>{
    if(performance.now()-flashes[i]>=200){pad.classList.remove('hit');paint()}
  },210);
  $('last').textContent='NOTE   '+noteName(midi);
  paint();
}
function select(name){
  resetGesture();voice=name;hands=[];flashes=[];pointer=null;cancelDraft();
  if(name==='Guitar')setAdding(true);
  $('addString').hidden=name!=='Guitar';
  $('height').disabled=name==='Guitar';
  $('resetStrings').hidden=name!=='Guitar';
  for(const btn of $('rack').children)btn.setAttribute('aria-pressed',btn.dataset.name===name);
  if(name!=='Guitar')$('guide').textContent=instruments[name].guide;
  $('layoutName').textContent=instruments[name].layout;
  $('last').textContent='NOTE   —';
  renderPads();paint();
}
function renderPads(){
  $('pads').replaceChildren(...instruments[voice].notes.map((n,i)=>{
    const b=document.createElement('button');
    b.className='pad';b.innerHTML=noteName(n)+'<kbd>'+(shortcuts[i]||'').toUpperCase()+'</kbd>';
    b.onclick=()=>play(i);return b;
  }));
  paint();
}
for(const [i,name] of Object.keys(instruments).entries()){
  const b=document.createElement('button');b.dataset.name=name;b.className='voice';
  b.innerHTML='<i aria-hidden="true">'+['≋','▥','▨'][i]+'</i>'+name;
  b.onclick=()=>select(name);$('rack').append(b);
}
$('resetStrings').onclick=()=>{
  strings.length=0;
  guitarNotes.length=0;
  select('Guitar');
  $('status').textContent='Strings cleared. Draw a new string to play.';
};
$('height').oninput=e=>{offset=Number(e.target.value)/100;hands=[];pointer=null;paint()};
$('volume').oninput=e=>{if(master)master.gain.setTargetAtTime(e.target.value/100,audio.currentTime,.015)};
document.addEventListener('keydown',e=>{
  if(e.repeat||e.metaKey||e.ctrlKey||e.altKey||e.target.tagName==='INPUT')return;
  const i=shortcuts.indexOf(e.key.toLowerCase());
  if(i>=0 && i<instruments[voice].notes.length){e.preventDefault();play(i)}
});
function paint(){
  const w=canvas.clientWidth,h=canvas.clientHeight;
  ctx.clearRect(0,0,w,h);
  const line=(x,y,a,b,color,width=1)=>{
    ctx.beginPath();ctx.strokeStyle=color;ctx.lineWidth=width;ctx.moveTo(x*w,y*h);ctx.lineTo(a*w,b*h);ctx.stroke();
  };
  const circle=(x,y,r,color)=>{
    ctx.beginPath();ctx.fillStyle=color;ctx.arc(x*w,y*h,r,0,2*Math.PI);ctx.fill();
  };
  ctx.font='12px monospace';ctx.textAlign='center';ctx.textBaseline='middle';
  if(!stream){
    ctx.fillStyle='#74947b66';
    for(let x=10;x<w;x+=18)for(let y=10;y<h;y+=18)ctx.fillRect(x,y,1,1);
  }
  if(voice==='Guitar'){
    const now=performance.now();
    const drawString=([a,b],color,width,label,i)=>{
      const age=now-flashes[i];
      if(age>=0 && age<1400 && !reducedMotion.matches){
        const dx=(b.x-a.x)*w,dy=(b.y-a.y)*h,length=Math.hypot(dx,dy)||1;
        ctx.save();
        ctx.shadowColor='#e5ff95';ctx.shadowBlur=14*Math.exp(-age/400);
        ctx.beginPath();ctx.moveTo(a.x*w,a.y*h);ctx.strokeStyle=color;ctx.lineWidth=width;
        for(let j=1;j<=64;j++){
          const t=j/64,bend=vibration(t,pluckPositions[i],age);
          ctx.lineTo(a.x*w+dx*t-dy/length*bend,a.y*h+dy*t+dx/length*bend);
        }
        ctx.stroke();ctx.restore();
        if(!motionFrame)motionFrame=requestAnimationFrame(()=>{motionFrame=0;paint()});
      }else line(a.x,a.y,b.x,b.y,color,width);
      circle(a.x,a.y,4,color);circle(b.x,b.y,4,color);
      ctx.fillStyle=color;ctx.fillText(label,(a.x+b.x)*w/2,(a.y+b.y)*h/2-12);
    };
    strings.forEach((ends,i)=>drawString(ends,performance.now()-(flashes[i]??-2000)<700?'#ffff80':'#d8efbb',2,noteName(guitarNotes[i]),i));
    if(draft)drawString(draft,'#ffcc82',3,draftNote===undefined?'':noteName(draftNote));
    if(!strings.length && !draft){
      ctx.fillStyle='#dcf2d6';ctx.fillText(adding?'Pinch with both hands and pull apart':'Choose Add string to begin',w/2,h/2);
    }
  }else{
    instruments[voice].notes.forEach((n,i)=>{
      const x=.1+i*.1,y=.45+offset,bar=voice==='Marimba';
      const height=bar?.38-i*.025:.36;
      ctx.fillStyle=performance.now()-(flashes[i]??-1000)<200?'#e1ff91':bar?'#deb387':'#e3e7ce';
      ctx.fillRect(x*w+1,y*h,.1*w-2,height*h);
      ctx.fillStyle='#234033';ctx.fillText(noteName(n),(x+.05)*w,(y+height-.055)*h);
    });
  }
  for(const hand of hands){
    const pts=hand.points;
    for(const chain of edges)for(let i=1;i<chain.length;i++){
      const a=pts[chain[i-1]],b=pts[chain[i]];line(1-a.x,a.y,1-b.x,b.y,'#8fffa9',2);
    }
    for(const p of pts)circle(1-p.x,p.y,3,'#ffc193');
    const thumb=pts[4];
    circle(1-thumb.x,thumb.y,6,'#ecff85');
    circle(hand.x,hand.y,6,'#ecff85');
  }
}
new ResizeObserver(()=>{
  const scale=window.devicePixelRatio||1;
  canvas.width=Math.round(canvas.clientWidth*scale);canvas.height=Math.round(canvas.clientHeight*scale);
  ctx.setTransform(scale,0,0,scale,0,0);paint();
}).observe(canvas);
function point(e){
  const r=canvas.getBoundingClientRect();const clamp=n=>Math.min(1,Math.max(0,n));
  return {x:clamp((e.clientX-r.left)/r.width),y:clamp((e.clientY-r.top)/r.height)};
}
canvas.onpointerdown=e=>{
  if(!e.isPrimary)return;
  enableAudio();canvas.setPointerCapture(e.pointerId);
  resetGesture();pointer=point(e);
  if(voice==='Guitar'){if(adding)updateDraft([pointer,pointer]);paint();return}
  const {x,y}=pointer;
  keyStrikes(pointer,x,y,offset);
  if(x<.1||x>=.9)return;
  if(y>=.45+offset && y<=.45+offset+(voice==='Piano'?.36:.38-Math.floor((x-.1)*10)*.025))play(Math.floor((x-.1)*10));
};
canvas.onpointermove=e=>{
  if(!pointer||!e.isPrimary)return;
  const tip=point(e);
  if(voice==='Guitar'){
    if(adding)updateDraft([pointer,tip]);
    else {pluck(pointer,tip);pointer=tip}
    paint();
  }
  else keyStrikes(pointer,tip.x,tip.y,offset).forEach(i=>play(i));
};
canvas.onpointerup=e=>{
  if(!pointer||!e.isPrimary)return;
  if(voice==='Guitar' && adding){updateDraft([pointer,point(e)]);place()}
  pointer=null;
};
canvas.onpointercancel=()=>{pointer=null;cancelDraft();paint()};
function pluck(from,to){
  const dx=to.x-from.x,dy=to.y-from.y;
  if(Math.hypot(dx,dy)<.0005)return;
  strings.forEach((ends,i)=>{
    if(!intersects([from,to],ends) || performance.now()-(flashes[i]??-1000)<115)return;
    const [a,b]=ends,den=(b.x-a.x)*dy-(b.y-a.y)*dx;
    const hit=den?((from.x-a.x)*dy-(from.y-a.y)*dx)/den:.5;
    play(i,0,Math.max(.04,Math.min(.96,hit)));
  });
}
const capture=document.createElement('canvas');
const captureCtx=capture.getContext('2d');
let sentRevision=0;
function stop(message){
  const oldSocket=socket;socket=null;oldSocket?.close();
  cancelDraft();cancelAnimationFrame(frame);stream?.getTracks().forEach(t=>t.stop());stream=null;
  video.srcObject=null;$('stage').classList.remove('live');hands=[];lastVideo=-1;
  $('camera').textContent='Enable camera';$('camera').disabled=false;$('mode').textContent='MANUAL INPUT';
  $('status').textContent=message;paint();
}
function captureFrame(){
  const active=socket;
  if(active?.readyState!==WebSocket.OPEN)return;
  if(video.readyState<2 || video.currentTime===lastVideo){
    frame=requestAnimationFrame(captureFrame);return;
  }
  lastVideo=video.currentTime;
  const width=Math.min(640,video.videoWidth);
  const height=Math.round(width*video.videoHeight/video.videoWidth);
  if(capture.width!==width || capture.height!==height){capture.width=width;capture.height=height}
  captureCtx.drawImage(video,0,0,width,height);
  const draw=voice==='Guitar' && adding && !pointer;
  const capturedRevision=revision;
  capture.toBlob(blob=>{
    if(socket!==active || active.readyState!==WebSocket.OPEN)return;
    if(!blob){stop('Camera frame unavailable. Enable the camera to retry.');return}
    if(capturedRevision!==revision){frame=requestAnimationFrame(captureFrame);return}
    sentRevision=revision;
    active.send(new Blob([Uint8Array.of(Number(draw)),blob]));
  },'image/jpeg',.8);
}
function receiveFrame(result){
  const now=performance.now(),previous=[...hands];
  hands=result.hands.map(coords=>{
    const points=coords.map(([x,y])=>({x,y}));
    const x=1-points[8].x,y=points[8].y;
    const distance=h=>Math.hypot(points[0].x-h.points[0].x,points[0].y-h.points[0].y);
    previous.sort((a,b)=>distance(a)-distance(b));
    const h=previous.length && distance(previous[0])<.19 && now-previous[0].time<250?previous.shift():{};
    if(voice!=='Guitar')keyStrikes(h,x,y,offset).forEach(i=>play(i));
    else if(!pointer && !draft && result.action==='wait' && h.points)pluck(h,{x,y});
    return Object.assign(h,{points,x,y,time:now});
  });
  if(voice==='Guitar' && adding && !pointer){
    if(result.ends)updateDraft(result.ends);
    if(result.action==='place')place();
    if(result.action==='cancel')cancelDraft();
    if(result.hint)$('status').textContent=result.hint;
  }
  $('mode').textContent=hands.length?hands.length+' HAND'+(hands.length===1?'':'S')+' TRACKED':'LOOKING FOR HANDS';
  paint();
}
$('camera').onclick=async()=>{
  if(stream){stop('Camera off. Manual controls are ready.');return}
  const btn=$('camera');btn.disabled=true;btn.textContent='Starting camera…';
  try{
    enableAudio();
    $('status').textContent='Allow camera access to start hand tracking.';
    stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'user',width:{ideal:640},height:{ideal:480}},audio:false});
    video.srcObject=stream;await video.play();
    $('stage').classList.add('live');
    $('status').textContent='Connecting to the local Python tracker…';
    const active=new WebSocket('ws://'+location.host+'/track');socket=active;
    active.onopen=()=>{
      if(socket!==active)return;
      btn.disabled=false;btn.textContent='Stop camera';
      $('status').textContent='Camera ready. Follow the gesture guide for your instrument.';
      captureFrame();
    };
    active.onmessage=e=>{
      if(socket!==active)return;
      try{
        if(sentRevision===revision)receiveFrame(JSON.parse(e.data));
        frame=requestAnimationFrame(captureFrame);
      }catch(error){console.error(error);stop('Frame processing failed. Enable the camera to retry.')}
    };
    active.onclose=()=>{if(socket===active)stop('Python tracker disconnected. Run studio.py and open http://127.0.0.1:8011 to retry.')};
    stream.getVideoTracks()[0].onended=()=>stop('Camera disconnected. Reconnect it and enable the camera again.');
  }catch(e){
    console.error(e);
    const messages={
      NotAllowedError:'Camera access is blocked. Open the site controls beside the address bar and allow Camera. On Mac, also check System Settings → Privacy & Security → Camera for your browser.',
      NotFoundError:'No camera found. Connect a webcam, then click Enable camera again.',
      NotReadableError:'The browser could not open the camera. Close other apps using it, then try again.'
    };
    stop(messages[e.name] || 'Camera startup failed ('+e.name+'). Check your webcam and try again.');

  }
};
window.addEventListener('pagehide',()=>stop('Camera off.'));
select('Guitar');
