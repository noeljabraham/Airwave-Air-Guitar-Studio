export const instruments = {
  Guitar: {notes:[], layout:'FREE STRINGS', guide:'Touch each thumb to its index finger. Hold both pinches for a quarter-second and pull your hands clearly apart, then release either pinch to place the string. Repeat to add another string. Cross strings to hear them together. With a mouse or touch, drag to draw.'},
  Piano: {notes:[60,62,64,65,67,69,71,72], layout:'8 KEYS / C MAJOR', guide:'Lower your index fingertip onto a key. Lift above the keys to play again.'},
  Marimba: {notes:[60,62,64,65,67,69,71,72], layout:'8 BARS / C MAJOR', guide:'Strike a bar with your index fingertip. Lift above the bars for the next strike.'}
};
export const shortcuts='asdfghjk';
const wholeNoteName = n => ['C','C♯','D','D♯','E','F','F♯','G','G♯','A','A♯','B'][n%12]+(Math.floor(n/12)-1);
export const noteName = n => wholeNoteName(Math.floor(n))+(Number.isInteger(n)?'':' +'+Math.round((n%1)*100)+'¢');
export function keyStrikes(hand,x,y,offset){
  if(x<.1 || x>=.9){hand.armed=false;return []}
  const top=.45+offset;
  if(y<top-.025) hand.armed=true;
  if(hand.armed && y>=top){hand.armed=false;return [Math.floor((x-.1)*10)]}
  return [];
}

export function intersects([a,b],[c,d]){
  const turn=(p,q,r)=>(q.x-p.x)*(r.y-p.y)-(q.y-p.y)*(r.x-p.x);
  const apart=(axis)=>Math.max(a[axis],b[axis])<Math.min(c[axis],d[axis]) ||
    Math.max(c[axis],d[axis])<Math.min(a[axis],b[axis]);
  return !apart('x') && !apart('y') && turn(a,b,c)*turn(a,b,d)<=0 && turn(c,d,a)*turn(c,d,b)<=0;
}

export function tuning([a,b],used,aspect){
  const length=Math.hypot(a.x-b.x,(a.y-b.y)/aspect);
  const base=Math.max(40,Math.min(83,Math.round(52-12*Math.log2(length/.45))));
  // Keep equal-length strings distinguishable, starting with the nearest free note.
  for(let step=1;;step/=2){
    for(let n=0;n<=48/step;n++){
      for(const midi of [base+n*step,base-n*step]){
        if(midi>=36 && midi<=84 && !used.includes(midi))return midi;
      }
    }
  }
}

export function vibration(t,hit,age){
  if(t<=0||t>=1||age<0||age>=1400)return 0;
  const shape=t<hit?t/hit:(1-t)/(1-hit);
  const wave=Math.sin(Math.PI*t)*Math.sin(6*Math.PI*t-age*.035);
  return 22*Math.exp(-age/340)*(shape*Math.cos(age*.04)+.35*wave);
}
