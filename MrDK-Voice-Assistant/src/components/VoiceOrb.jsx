import React,{useEffect,useRef} from 'react';
export default function VoiceOrb({phase='idle',levelRef,compact=false}){
  const canvasRef=useRef(null),phaseRef=useRef(phase);phaseRef.current=phase;
  useEffect(()=>{
    const canvas=canvasRef.current,ctx=canvas.getContext('2d');let raf,frame=0;
    function render(){
      const box=canvas.getBoundingClientRect(),dpr=Math.min(window.devicePixelRatio||1,2);
      const w=box.width,h=box.height;
      if(canvas.width!==Math.round(w*dpr)||canvas.height!==Math.round(h*dpr)){canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);}
      ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);
      let p=phaseRef.current,t=frame/60,live=Math.min(1,(levelRef?.current||0)*14);
      const listen=p==='listening'||p==='wake',think=p==='thinking'||p==='transcribing',talk=p==='speaking';
      const energy=listen?Math.max(.13,live):talk?.76:think?.38:.09;
      const cx=w/2,cy=h/2,r=Math.min(w,h)*.29;
      const light=ctx.createRadialGradient(cx,cy,0,cx,cy,r*2);
      light.addColorStop(0,'rgba(93,75,255,.23)');light.addColorStop(.52,'rgba(35,180,255,.09)');light.addColorStop(1,'rgba(0,0,0,0)');
      ctx.fillStyle=light;ctx.beginPath();ctx.arc(cx,cy,r*2,0,Math.PI*2);ctx.fill();
      for(let ring=2;ring>=0;ring--){
        const radius=r+ring*12;
        ctx.beginPath();
        for(let k=0;k<=180;k++){
          const a=k/180*Math.PI*2;
          const wave=(Math.sin(a*9+t*(think?4:7)+ring)+Math.cos(a*14-t*5))*energy*5;
          const rr=radius+wave+(think?Math.sin(t*2+ring)*3:0);
          const x=cx+Math.cos(a)*rr,y=cy+Math.sin(a)*rr;
          k?ctx.lineTo(x,y):ctx.moveTo(x,y);
        }
        ctx.closePath();ctx.strokeStyle=['#46dbff','#806efb','#e975ec'][ring];ctx.lineWidth=ring?1.7:3;
        ctx.shadowColor=ctx.strokeStyle;ctx.shadowBlur=listen?20:10;ctx.globalAlpha=1-ring*.25;ctx.stroke();
      }
      ctx.globalAlpha=1;ctx.shadowBlur=0;
      const gradient=ctx.createRadialGradient(cx-r*.32,cy-r*.4,0,cx,cy,r);
      gradient.addColorStop(0,'#29458c');gradient.addColorStop(.5,'#18245c');gradient.addColorStop(1,'#0c153c');
      ctx.fillStyle=gradient;ctx.beginPath();ctx.arc(cx,cy,r-4,0,Math.PI*2);ctx.fill();
      const count=compact?19:29,gap=r*1.48/count,bw=gap*.53;
      for(let i=0;i<count;i++){
        const center=(count-1)/2,env=Math.pow(Math.max(0,1-Math.abs(i-center)/(center+1)),.9);
        const amp=.18+Math.abs(Math.sin(i*1.2+t*(listen?10:6))*.6+Math.cos(i*.5-t*3)*.3);
        const height=4+Math.min(r*.86,(env*amp*energy*r*.95));
        const x=cx+(i-center)*gap;
        const g=ctx.createLinearGradient(0,cy-height/2,0,cy+height/2);
        g.addColorStop(0,i<center?'#da8cff':'#72e4ff');g.addColorStop(1,i<center?'#a970ff':'#2b9cfb');
        ctx.fillStyle=g;ctx.shadowColor=i<center?'#c184ff':'#46c9ff';ctx.shadowBlur=8;
        ctx.beginPath();ctx.roundRect(x-bw/2,cy-height/2,bw,height,bw/2);ctx.fill();
      }
      ctx.shadowBlur=0;
      frame++;raf=requestAnimationFrame(render);
    }
    render();return()=>cancelAnimationFrame(raf);
  },[compact,levelRef]);
  return <canvas className={`orb-canvas ${compact?'orb-small':''}`} ref={canvasRef} aria-label={`Voice orb: ${phase}`}/>;
}
