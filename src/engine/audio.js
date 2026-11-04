let context=null,master=null,ambience=[],enabled=false;
function getContext(){
 if(context)return context;
 const AudioContextClass=window.AudioContext||window.webkitAudioContext;
 if(!AudioContextClass)return null;
 context=new AudioContextClass();master=context.createGain();master.gain.value=.22;master.connect(context.destination);return context;
}
export function isAirportAudioEnabled(){return enabled;}
export async function setAirportAudioEnabled(value){
 if(!value){enabled=false;if(context&&master){master.gain.setTargetAtTime(0,context.currentTime,.12);ambience.forEach(node=>{try{node.stop();}catch{}});ambience=[];}return false;}
 const ctx=getContext();if(!ctx)return false;if(ctx.state==='suspended')await ctx.resume();enabled=true;master.gain.setTargetAtTime(.22,ctx.currentTime,.4);
 if(!ambience.length){
  const low=ctx.createOscillator(),lowGain=ctx.createGain();low.type='sine';low.frequency.value=54;lowGain.gain.value=.035;low.connect(lowGain);lowGain.connect(master);low.start();
  const high=ctx.createOscillator(),highGain=ctx.createGain();high.type='triangle';high.frequency.value=93;highGain.gain.value=.008;high.connect(highGain);highGain.connect(master);high.start();ambience=[low,high];
 }
 return true;
}
export function playAirportSound(kind='radio'){
 if(!enabled||!context||!master)return;
 const presets={arrival:[660,880],departure:[523,784],alert:[440,330],radio:[740,620],service:[392,523]};
 (presets[kind]||presets.radio).forEach((frequency,index)=>{
  const oscillator=context.createOscillator(),gain=context.createGain();oscillator.type=kind==='radio'?'square':'sine';oscillator.frequency.value=frequency;
  gain.gain.setValueAtTime(.0001,context.currentTime+index*.16);gain.gain.exponentialRampToValueAtTime(kind==='alert'?.09:.035,context.currentTime+index*.16+.025);
  gain.gain.exponentialRampToValueAtTime(.0001,context.currentTime+index*.16+.22);oscillator.connect(gain);gain.connect(master);
  oscillator.start(context.currentTime+index*.16);oscillator.stop(context.currentTime+index*.16+.24);
 });
}