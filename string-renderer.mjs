import {vibration} from './instrument.mjs';

export function drawString(ctx,[a,b],w,h,{age=-1,hit=.5,reduced=false,draft=false,label=''}={}){
  const dx=(b.x-a.x)*w,dy=(b.y-a.y)*h,length=Math.hypot(dx,dy);
  if(!length)return false;
  const active=age>=0 && age<1400;
  const moving=active && !reduced;
  const energy=active?Math.exp(-age/340):0;
  const color=draft?'#ffe7b4':'#efffdc';
  ctx.save();
  ctx.translate(a.x*w,a.y*h);ctx.rotate(Math.atan2(dy,dx));
  ctx.lineCap='round';ctx.lineJoin='round';
  const stroke=(points,color,width)=>{
    ctx.beginPath();ctx.strokeStyle=color;ctx.lineWidth=width;
    points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.stroke();
  };
  const strand=lag=>Array.from({length:65},(_,j)=>{
    const t=j/64;
    return [length*t,moving?vibration(t,hit,Math.max(0,age-lag)):0];
  });
  // Time-offset strands leave a short luminous trace without frame-history buffers.
  if(moving){
    for(const lag of [48,24]){
      ctx.globalAlpha=energy*(lag===48?.18:.32);
      stroke(strand(lag),'#caff91',1);
    }
  }
  ctx.globalAlpha=1;
  ctx.shadowColor=active?'#d4ff84':color;ctx.shadowBlur=active?5+energy*15:4;
  stroke(strand(0),color,1.25);
  ctx.shadowBlur=0;
  ctx.globalAlpha=.35+energy*.25;
  stroke([[0,-3],[length,-3]],color,.7);
  for(let x=24;x<length-12;x+=24){
    const major=Math.round(x/24)%4===0;
    stroke([[x,-5],[x,major?-12:-9]],color,1);
  }
  ctx.globalAlpha=1;
  for(const x of [0,length]){
    ctx.shadowColor=color;ctx.shadowBlur=6;
    ctx.beginPath();ctx.strokeStyle=color;ctx.lineWidth=1.5;
    ctx.ellipse(x,0,3.5,5.5,.3,0,Math.PI*2);ctx.stroke();
    stroke([[x-2,10],[x+2,-11]],color,1.2);
  }
  if(moving && age<520){
    const progress=age/520;
    ctx.globalAlpha=(1-progress)**2;ctx.shadowBlur=7;
    for(let i=0;i<18;i++){
      const angle=i*2.39996,speed=35+(i%5)*13;
      const x=length*hit+Math.cos(angle)*speed*progress;
      const y=Math.sin(angle)*speed*progress+20*progress*progress;
      const tail=2+4*(1-progress);
      stroke([[x,y],[x+Math.cos(angle)*tail,y+Math.sin(angle)*tail]],'#ffffd6',1.2);
    }
  }
  ctx.restore();
  if(label){
    ctx.save();ctx.globalAlpha=.65;ctx.fillStyle=color;
    ctx.fillText(label,(a.x+b.x)*w/2,(a.y+b.y)*h/2-18);ctx.restore();
  }
  return moving;
}
