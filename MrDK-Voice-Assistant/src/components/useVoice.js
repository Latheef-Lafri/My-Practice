import {useCallback,useEffect,useRef,useState} from 'react';
const WAKE_RE=/(?:\b(?:hey|hi|hello)\s*)?(?:\b(?:mr|mister|master)\.?\s*)?\b(?:d\s*\.?\s*k|dee\s*kay|dk)\b|மிஸ்டர்\s*டிகே|ஹே\s*டிகே/i;
export function wakePhrase(text){
  const match=String(text||'').match(WAKE_RE);
  if(!match)return null;
  const remaining=text.slice((match.index||0)+match[0].length).replace(/^[\s,.:;!?-]+/,'').trim();
  return {remaining};
}
function encodeWav(chunks,sampleRate){
  let total=0;chunks.forEach(c=>total+=c.length);
  if(total<1)throw Error('Empty microphone recording');
  const original=new Float32Array(total);let offset=0;
  for(const c of chunks){original.set(c,offset);offset+=c.length;}
  const target=16000,ratio=sampleRate/target,frames=Math.floor(total/ratio);
  const b=new ArrayBuffer(44+frames*2),view=new DataView(b);
  function str(p,s){for(let i=0;i<s.length;i++)view.setUint8(p+i,s.charCodeAt(i));}
  str(0,'RIFF');view.setUint32(4,36+frames*2,true);str(8,'WAVE');str(12,'fmt ');
  view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,1,true);
  view.setUint32(24,target,true);view.setUint32(28,target*2,true);view.setUint16(32,2,true);view.setUint16(34,16,true);
  str(36,'data');view.setUint32(40,frames*2,true);
  for(let i=0;i<frames;i++){
    const start=Math.floor(i*ratio),end=Math.min(total,Math.floor((i+1)*ratio));
    let v=0;for(let j=start;j<end;j++)v+=original[j];v/=Math.max(1,end-start);
    v=Math.max(-1,Math.min(1,v));view.setInt16(44+i*2,v<0?v*0x8000:v*0x7fff,true);
  }
  return new Uint8Array(b);
}

/** Offline speech input through whisper.cpp, including experimental transcript-based wake word. */
export function useVoice({wakeEnabled,threshold,onCommand,onWake,onTranscript,onError}){
  const [phase,setPhase]=useState('idle');
  const [micActive,setMicActive]=useState(false);
  const levelRef=useRef(0),runtime=useRef(null),busy=useRef(false),mode=useRef('off'),lastActivation=useRef(0);
  const handlers=useRef({});handlers.current={onCommand,onWake,onTranscript,onError};
  const enabledRef=useRef(wakeEnabled);enabledRef.current=wakeEnabled;
  const thresholdRef=useRef(threshold);thresholdRef.current=Number(threshold)||.018;
  const end=useCallback(async()=>{
    mode.current='off';busy.current=false;levelRef.current=0;
    const r=runtime.current;runtime.current=null;
    if(r){try{r.processor.disconnect();r.source.disconnect();r.stream.getTracks().forEach(t=>t.stop());await r.context.close();}catch{/* disposed */}}
    setMicActive(false);setPhase('idle');
  },[]);
  const processAudio=useCallback(async(chunks,sampleRate)=>{
    if(!chunks.length)return;
    busy.current=true;setPhase('transcribing');
    try{
      const text=String(await window.mrdk.transcribe(encodeWav(chunks,sampleRate))).trim();
      handlers.current.onTranscript?.(text);
      const current=mode.current;
      if(current==='wake'){
        const found=wakePhrase(text);
        if(found){
          lastActivation.current=Date.now();
          if(found.remaining.length>2){
            setPhase('thinking');await handlers.current.onCommand?.(found.remaining);
            mode.current=enabledRef.current?'wake':'off';
          }else{
            setPhase('speaking');await handlers.current.onWake?.();
            mode.current='command';
            lastActivation.current=Date.now();
          }
        }
      } else if(current==='command'){
        if(text.length>1){setPhase('thinking');await handlers.current.onCommand?.(text);}
        mode.current=enabledRef.current?'wake':'off';
      }
    }catch(err){handlers.current.onError?.(err.message||String(err));mode.current=enabledRef.current?'wake':'off';}
    finally{
      busy.current=false;
      if(mode.current==='off')await end();
      else setPhase(mode.current==='command'?'listening':'wake');
    }
  },[end]);
  const begin=useCallback(async(nextMode='command')=>{
    if(runtime.current){mode.current=nextMode;lastActivation.current=Date.now();setPhase(nextMode==='wake'?'wake':'listening');return;}
    if(!navigator.mediaDevices?.getUserMedia)throw Error('Microphone access is not available');
    const stream=await navigator.mediaDevices.getUserMedia({audio:{channelCount:1,echoCancellation:true,noiseSuppression:true,autoGainControl:true},video:false});
    const Ctx=window.AudioContext||window.webkitAudioContext;
    const context=new Ctx();await context.resume();
    const source=context.createMediaStreamSource(stream),processor=context.createScriptProcessor(4096,1,1);
    source.connect(processor);processor.connect(context.destination);
    const data={context,source,processor,stream,chunks:[],pre:[],recording:false,startAt:0,lastSound:0,frames:0};
    runtime.current=data;mode.current=nextMode;lastActivation.current=Date.now();
    processor.onaudioprocess=ev=>{
      const output=ev.outputBuffer.getChannelData(0);output.fill(0);
      const r=runtime.current;if(!r||busy.current||mode.current==='off')return;
      const samples=ev.inputBuffer.getChannelData(0);
      const chunk=new Float32Array(samples);
      let sq=0;for(let i=0;i<chunk.length;i+=4)sq+=chunk[i]*chunk[i];
      const rms=Math.sqrt(sq/Math.ceil(chunk.length/4));
      levelRef.current=levelRef.current*.73+rms*.27;
      const sound=rms>thresholdRef.current;
      const now=Date.now();
      if(mode.current==='command'&&!r.recording&&now-lastActivation.current>15000){
        if(enabledRef.current){mode.current='wake';setPhase('wake');}else void end();
        return;
      }
      if(!r.recording){
        r.pre.push(chunk);if(r.pre.length>4)r.pre.shift();
        if(!sound)return;
        r.recording=true;r.chunks=[...r.pre];r.startAt=now;r.lastSound=now;r.frames=r.chunks.length;
      }else{
        r.chunks.push(chunk);r.frames++;
        if(sound)r.lastSound=now;
      }
      const elapsed=now-r.startAt;
      if((elapsed>750&&now-r.lastSound>650)||(elapsed>7800)){
        const chunks=r.chunks;r.chunks=[];r.pre=[];r.recording=false;
        if(elapsed>=420)void processAudio(chunks,context.sampleRate);
      }
    };
    setMicActive(true);setPhase(nextMode==='wake'?'wake':'listening');
  },[end,processAudio]);
  useEffect(()=>{if(wakeEnabled)begin('wake').catch(e=>handlers.current.onError?.(e.message));else if(mode.current==='wake')void end();},[wakeEnabled,begin,end]);
  useEffect(()=>()=>{const r=runtime.current;if(r){r.stream.getTracks().forEach(t=>t.stop());r.processor.disconnect();void r.context.close();}},[]);
  const push=useCallback(async()=>{
    if(mode.current==='command'&&micActive){await end();return;}
    await begin('command');
  },[begin,end,micActive]);
  return {phase,micActive,levelRef,push,stop:end};
}
