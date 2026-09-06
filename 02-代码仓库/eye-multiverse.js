(() => {
  'use strict';

  const MAX_EYES = 24;
  const TIMING = Object.freeze({ signal: 320, branch: 900, settled: 1250, launchGap: 380 });
  const root = document.getElementById('multiverse');
  const canvas = document.getElementById('multiverseCanvas');
  const networkCanvas = document.getElementById('networkCanvas');
  const network = networkCanvas.getContext('2d');
  const waveCanvas = document.getElementById('voiceWave');
  const waveContext = waveCanvas.getContext('2d');
  const voicePanel = document.getElementById('voicePanel');
  const listenButton = document.getElementById('listenButton');
  const microphoneIcon = document.getElementById('microphoneIcon');
  const soundButton = document.getElementById('soundButton');
  const soundIcon = document.getElementById('soundIcon');
  const voiceStateNode = document.getElementById('voiceState');
  const transcriptNode = document.getElementById('transcript');
  const countNode = document.getElementById('count');
  const status = document.getElementById('status');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  const VERTEX_SHADER = `
    precision highp float;
    attribute vec2 aPosition;
    varying vec2 vUv;
    void main(){vUv=aPosition*.5+.5;gl_Position=vec4(aPosition,0.,1.);}
  `;

  const FRAGMENT_SHADER = `
    precision highp float;
    #define MAX_EYES ${MAX_EYES}
    varying vec2 vUv;
    uniform sampler2D uEye;
    uniform vec2 uResolution;
    uniform vec2 uPointer;
    uniform float uTime;
    uniform float uMotion;
    uniform float uDensity;
    uniform int uEyeCount;
    uniform vec4 uEyeA[MAX_EYES];
    uniform vec4 uEyeB[MAX_EYES];
    uniform vec4 uEyeC[MAX_EYES];

    float hash21(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
    float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash21(i),hash21(i+vec2(1,0)),f.x),mix(hash21(i+vec2(0,1)),hash21(i+1.),f.x),f.y);}
    float fbm(vec2 p){float v=0.,a=.52;mat2 m=mat2(1.62,1.18,-1.18,1.62);for(int i=0;i<5;i++){v+=a*noise(p);p=m*p+3.17;a*=.48;}return v;}
    float stars(vec2 uv,float scale,float gate){vec2 p=uv*scale,id=floor(p),f=fract(p)-.5;float h=hash21(id);vec2 o=vec2(hash21(id+7.1),hash21(id+19.7))-.5;float d=length(f-o*.58);float size=mix(.038,.125,pow(h,17.));return smoothstep(size,0.,d)*step(gate,h);}

    vec3 cosmos(vec2 uv,float time){
      float aspect=uResolution.x/max(1.,uResolution.y);
      vec2 p=(uv-.5)*vec2(aspect,1.);
      vec2 drift=vec2(time*.0022,-time*.00135)*uMotion;
      float n1=fbm(p*2.08+drift+vec2(1.8,-.4));
      float n2=fbm(p*4.0-drift*.7+vec2(-3.2,4.7));
      float n3=fbm(p*7.2+drift*.35+vec2(8.3,-6.1));
      float band=exp(-abs(p.y*.72+p.x*.20+.11*sin(p.x*2.7+n1*2.))*4.9);
      float cloud=smoothstep(.35,.82,n1)*(.32+.68*n2)*band;
      float ridge=pow(clamp(1.-abs(n2*2.-1.),0.,1.),7.);
      float filament=ridge*smoothstep(.48,.86,n3)*(.22+.78*band);
      vec3 color=vec3(.004,.0045,.017);
      color+=vec3(.030,.025,.10)*cloud;
      color+=vec3(.073,.046,.19)*pow(cloud,2.)*.86;
      color+=vec3(.018,.026,.078)*smoothstep(.52,.88,n2)*.38;
      color+=vec3(.12,.095,.27)*filament*.9;
      vec2 parallax=(uPointer-.5)*vec2(.018,-.012)*uMotion;
      float s1=stars(uv+parallax,70.,.946);
      float s2=stars(uv-parallax*.45+vec2(.17,.09),136.,.967);
      float s3=stars(uv+parallax*.18+vec2(.37,.22),230.,.984);
      float densityLift=1.+min(1.2,uDensity*.018);
      color+=(s1*vec3(.38,.42,.78)+s2*vec3(.58,.49,.98)+s3*vec3(.88,.82,1.08))*densityLift;
      return color;
    }

    void main(){
      float aspect=uResolution.x/max(1.,uResolution.y);
      vec3 color=cosmos(vUv,uTime);
      for(int i=0;i<MAX_EYES;i++){
        if(i>=uEyeCount)break;
        vec4 a=uEyeA[i];vec4 b=uEyeB[i];vec4 c=uEyeC[i];
        vec2 q=(vUv-a.xy)*vec2(aspect,1.)/max(.0001,a.z);
        float cs=cos(c.x),sn=sin(c.x);q=mat2(cs,-sn,sn,cs)*q;
        q.x/=1.+b.w*.065;q.y/=1.+b.w*.025;
        float r=length(q);
        if(r<1.16){
          float sphere=1.-smoothstep(.96,1.065,r);
          float z=sqrt(max(0.,1.-min(1.,r*r)));
          vec2 refractUv=vUv+q*.011*(.3+z)*(1.-c.z*.17);
          vec3 refracted=cosmos(refractUv,uTime+13.7+c.y)*vec3(.91,.89,1.13);
          color=mix(color,refracted,sphere*.67*a.w);

          float inner=1.-smoothstep(.26,.66,r);
          vec2 gaze=b.xy;
          vec2 textureUv=q*.455+.5-gaze*inner*.105;
          vec4 tex=texture2D(uEye,textureUv);
          float lum=max(tex.r,max(tex.g,tex.b));
          float detail=smoothstep(.016,.125,lum)*tex.a*sphere;
          vec3 eyeLight=pow(max(tex.rgb,vec3(0.)),vec3(.84))*vec3(.95,.88,1.2);
          color+=eyeLight*detail*1.43*a.w;

          vec2 echoUv=textureUv+vec2(.052*b.w*(.65+.35*z),-.008*b.w);
          vec4 echo=texture2D(uEye,echoUv);
          float echoLum=max(echo.r,max(echo.g,echo.b));
          float echoDetail=smoothstep(.08,.38,echoLum)*echo.a*sphere*b.w;
          color+=pow(echo.rgb,vec3(.82))*echoDetail*.3*a.w;

          vec2 organ=q-gaze*.2;
          float pupil=1.-smoothstep(.17,.235,length(organ));
          color=mix(color,vec3(.0004,.0005,.003),pupil*sphere*.93*a.w);

          float blink=b.z;
          float lidX=organ.x+blink*.048;
          float membraneGate=1.-smoothstep(.91,1.035,r);
          float arch=.15*(1.-clamp(lidX*lidX*1.65,0.,1.));
          float upperEdge=mix(.78,-.43,blink)+arch+lidX*.036;
          float lowerEdge=mix(-.78,-.34,blink)-arch*.13-lidX*.012;
          float upperCover=smoothstep(upperEdge-.032,upperEdge+.032,organ.y);
          float lowerCover=1.-smoothstep(lowerEdge-.034,lowerEdge+.034,organ.y);
          float membrane=max(upperCover,lowerCover)*membraneGate*smoothstep(.018,.095,blink);
          float membraneNoise=fbm(organ*7.+vec2(c.y*4.1,uTime*.035));
          vec3 membraneColor=vec3(.008,.006,.029)+vec3(.072,.049,.15)*membraneNoise;
          color=mix(color,membraneColor,membrane*.89*a.w);
          float seam=(1.-smoothstep(.006,.027,abs(organ.y-upperEdge)))*membraneGate*blink;
          color+=seam*vec3(.23,.17,.46)*.46*a.w;

          vec2 fixedUv=q*.455+.5;
          vec4 shell=texture2D(uEye,fixedUv);
          float shellLum=max(shell.r,max(shell.g,shell.b));
          float shellDetail=smoothstep(.15,.53,shellLum)*shell.a*sphere;
          color+=pow(shell.rgb,vec3(.76))*shellDetail*.56*a.w;

          float fresnel=pow(1.-z,3.05)*sphere;
          color+=fresnel*vec3(.14,.105,.34)*(.43+.57*c.z)*a.w;
          float rim=(1.-smoothstep(.012,.048,abs(r-.91)))*sphere;
          color+=rim*vec3(.23,.17,.50)*.24*a.w;
          vec2 glintCenter=vec2(-.29,.34);
          float glint=pow(max(0.,1.-length(q-glintCenter)/.24),3.)*sphere;
          color+=glint*vec3(.52,.46,.88)*.28*a.w;
        }
      }
      float vignette=smoothstep(.38,1.05,length((vUv-.5)*vec2(aspect*.70,1.)));
      color*=1.-vignette*.47;
      color=pow(max(color,vec3(0.)),vec3(.86));
      gl_FragColor=vec4(color,1.);
    }
  `;

  const clamp = (value,min,max) => Math.max(min,Math.min(max,value));
  const random = (min,max) => min+Math.random()*(max-min);
  const smooth = value => {const t=clamp(value,0,1);return t*t*(3-2*t);};
  const easeOut = value => 1-Math.pow(1-clamp(value,0,1),3);
  const pointer = {x:innerWidth*.5,y:innerHeight*.42};
  const eyes = [];
  const threads = [];
  const queue = [];
  const rituals = [];
  let width=innerWidth,height=innerHeight,dpr=1,lastTime=performance.now(),worldCount=0;
  let cameraScale=1,targetCameraScale=1,lastLaunchAt=-Infinity,queueTimer=0,phaseWave=null;
  let recognition=null,listeningWanted=false,restarting=false,manualFallback=false;
  let recognizedByIndex=new Map(),voiceResetTimer=0,voicePulseAt=-Infinity;
  let mediaStream=null,analyser=null,audio=null,soundOn=false,voiceLevel=0;
  let gl=null,program=null,eyeTexture=null,positionBuffer=null,ready=false;
  const eyeA=new Float32Array(MAX_EYES*4),eyeB=new Float32Array(MAX_EYES*4),eyeC=new Float32Array(MAX_EYES*4);

  class Eye {
    constructor(x,y,r,options={}) {
      this.x=this.homeX=x;this.y=this.homeY=y;this.radius=r;
      this.opacity=options.opacity??random(.72,1);this.depth=options.depth??random(.7,1.05);
      this.rotation=options.rotation??random(-.17,.17);this.seed=random(0,1000);
      this.lookX=0;this.lookY=0;this.lookTarget={x,y};this.nextThought=performance.now()+random(1400,4200);this.forced=null;
      this.blinkStart=0;this.blinkAt=performance.now()+random(1900,7600);this.blinkAmount=1;
      this.newborn=!!options.newborn;this.birthOpen=this.newborn ? .08 : 1;this.branchAlpha=this.newborn ? .04 : 1;this.strain=0;
    }
    lookAt(target,now,delay=0,duration=1700){this.forced={target,start:now+delay,end:now+delay+duration};}
    chooseThought(now){const others=eyes.filter(eye=>eye!==this&&eye.branchAlpha>.6);if(others.length&&Math.random()<.46){const other=others[Math.floor(Math.random()*others.length)];this.lookTarget={x:other.x,y:other.y};}else{const reach=Math.min(width,height)*random(.12,.28);this.lookTarget={x:clamp(this.homeX+random(-reach,reach),60,width-60),y:clamp(this.homeY+random(-reach,reach),55,height-55)};}this.nextThought=now+random(2300,6200);}
    closure(now){if(this.newborn)return 1-this.birthOpen;if(!this.blinkStart)return 0;const elapsed=now-this.blinkStart;if(elapsed<76)return easeOut(elapsed/76)*this.blinkAmount;if(elapsed<112)return this.blinkAmount;if(elapsed<272)return(1-smooth((elapsed-112)/160))*this.blinkAmount;this.blinkStart=0;this.blinkAt=now+random(2500,8500);return 0;}
    update(now,dt){if(now>this.nextThought&&(!this.forced||now>this.forced.end))this.chooseThought(now);if(this.forced&&now>this.forced.end)this.forced=null;let target=this.lookTarget;if(this.forced&&now>=this.forced.start)target=typeof this.forced.target==='function'?this.forced.target():this.forced.target;const dx=target.x-this.x,dy=target.y-this.y,distance=Math.max(1,Math.hypot(dx,dy)),reach=Math.min(this.radius*.18,distance*.075),response=1-Math.pow(.87,dt/16.67);this.lookX+=(dx/distance*reach-this.lookX)*response;this.lookY+=(dy/distance*reach-this.lookY)*response;if(!this.newborn&&!this.blinkStart&&now>=this.blinkAt&&!isActiveMother(this)){this.blinkAmount=Math.random()<.2 ? .7 : 1;this.blinkStart=now;}}
  }

  function isActiveMother(eye){return rituals.some(ritual=>ritual.mother===eye&&!ritual.done);}
  function compile(type,source){const shader=gl.createShader(type);gl.shaderSource(shader,source);gl.compileShader(shader);if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS)){const message=gl.getShaderInfoLog(shader);gl.deleteShader(shader);throw new Error(message);}return shader;}
  function initializeWebGL(image){gl=canvas.getContext('webgl',{alpha:false,antialias:false,premultipliedAlpha:false,powerPreference:'high-performance'});if(!gl)throw new Error('WebGL unavailable');const vertex=compile(gl.VERTEX_SHADER,VERTEX_SHADER),fragment=compile(gl.FRAGMENT_SHADER,FRAGMENT_SHADER);program=gl.createProgram();gl.attachShader(program,vertex);gl.attachShader(program,fragment);gl.linkProgram(program);gl.deleteShader(vertex);gl.deleteShader(fragment);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(program));positionBuffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,positionBuffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);eyeTexture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,eyeTexture);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);ready=true;seedWorld();}
  function seedWorld(){if(eyes.length)return;const base=Math.min(width,height);[[.29,.37,.205,.99,1,-.03],[.76,.28,.092,.87,.78,.11],[.74,.7,.072,.76,.62,-.13]].forEach(([x,y,r,opacity,depth,rotation])=>eyes.push(new Eye(x*width,y*height,r*base,{opacity,depth,rotation})));threads.push({a:eyes[0],b:eyes[1],bornAt:0},{a:eyes[0],b:eyes[2],bornAt:0});}
  function visibleEyes(){const active=eyes.filter(eye=>eye.branchAlpha>.005);if(active.length<=MAX_EYES)return active;return[active[0],...active.slice(-(MAX_EYES-1))];}
  function resize(){width=innerWidth;height=innerHeight;dpr=Math.min(devicePixelRatio||1,2);for(const target of [canvas,networkCanvas]){target.width=Math.round(width*dpr);target.height=Math.round(height*dpr);target.style.width=`${width}px`;target.style.height=`${height}px`;}network.setTransform(dpr,0,0,dpr,0,0);const rect=waveCanvas.getBoundingClientRect();waveCanvas.width=Math.max(1,Math.round(rect.width*dpr));waveCanvas.height=Math.max(1,Math.round(rect.height*dpr));waveContext.setTransform(dpr,0,0,dpr,0,0);if(gl)gl.viewport(0,0,canvas.width,canvas.height);}
  function screenEye(eye){return{x:width/2+(eye.x-width/2)*cameraScale,y:height/2+(eye.y-height/2)*cameraScale,r:eye.radius*cameraScale};}
  function fillEyeUniforms(now){eyeA.fill(0);eyeB.fill(0);eyeC.fill(0);const visible=visibleEyes();visible.forEach((eye,index)=>{const offset=index*4,screen=screenEye(eye);eyeA.set([screen.x/width,1-screen.y/height,screen.r/height,eye.opacity*eye.branchAlpha],offset);eyeB.set([eye.lookX/Math.max(1,eye.radius),-eye.lookY/Math.max(1,eye.radius),eye.closure(now),eye.strain],offset);eyeC.set([eye.rotation,eye.seed*.001,eye.depth,0],offset);});return visible.length;}
  function renderScene(now){if(!ready)return;gl.useProgram(program);gl.bindBuffer(gl.ARRAY_BUFFER,positionBuffer);const position=gl.getAttribLocation(program,'aPosition');gl.enableVertexAttribArray(position);gl.vertexAttribPointer(position,2,gl.FLOAT,false,0,0);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,eyeTexture);gl.uniform1i(gl.getUniformLocation(program,'uEye'),0);gl.uniform2f(gl.getUniformLocation(program,'uResolution'),canvas.width,canvas.height);gl.uniform2f(gl.getUniformLocation(program,'uPointer'),pointer.x/width,1-pointer.y/height);gl.uniform1f(gl.getUniformLocation(program,'uTime'),now*.001);gl.uniform1f(gl.getUniformLocation(program,'uMotion'),reducedMotion?0:1);gl.uniform1f(gl.getUniformLocation(program,'uDensity'),worldCount);gl.uniform1i(gl.getUniformLocation(program,'uEyeCount'),fillEyeUniforms(now));gl.uniform4fv(gl.getUniformLocation(program,'uEyeA[0]'),eyeA);gl.uniform4fv(gl.getUniformLocation(program,'uEyeB[0]'),eyeB);gl.uniform4fv(gl.getUniformLocation(program,'uEyeC[0]'),eyeC);gl.drawArrays(gl.TRIANGLES,0,6);}

  function surfacePoint(a,b){const dx=b.x-a.x,dy=b.y-a.y,d=Math.max(1,Math.hypot(dx,dy));return{x:a.x+dx/d*a.r*.82,y:a.y+dy/d*a.r*.82};}
  function curvePoint(start,end,bend,t){const inv=1-t,cx=(start.x+end.x)/2+bend.x,cy=(start.y+end.y)/2+bend.y;return{x:inv*inv*start.x+2*inv*t*cx+t*t*end.x,y:inv*inv*start.y+2*inv*t*cy+t*t*end.y};}
  function drawNetwork(now){
    network.clearRect(0,0,width,height);network.save();network.globalCompositeOperation='screen';const displayed=new Set(visibleEyes());
    let phaseBoost=0;if(phaseWave){const phaseAge=(now-phaseWave.at)/1050;if(phaseAge>=1)phaseWave=null;else if(phaseAge>=0)phaseBoost=Math.sin(Math.PI*phaseAge)*.2;}
    for(const thread of threads){if(!displayed.has(thread.a)||!displayed.has(thread.b))continue;const a=screenEye(thread.a),b=screenEye(thread.b),start=surfacePoint(a,b),end=surfacePoint(b,a),age=thread.bornAt?clamp((now-thread.bornAt)/700,0,1):1,bend={x:Math.sin(thread.a.seed)*25,y:Math.cos(thread.b.seed)*20},base=(thread.forming ? .31+(1-age)*.28 : .12)+phaseBoost;for(let strand=-1;strand<=1;strand++){network.strokeStyle=`rgba(139,119,239,${base*(strand?0.32:1)})`;network.lineWidth=strand ? .42 : .72;network.beginPath();network.moveTo(start.x,start.y+strand*3);network.quadraticCurveTo((start.x+end.x)/2+bend.x+strand*12,(start.y+end.y)/2+bend.y-strand*8,start.x+(end.x-start.x)*age,start.y+(end.y-start.y)*age+strand*2);network.stroke();}}
    for(const ritual of rituals){
      const elapsed=now-ritual.startedAt;if(elapsed<0||elapsed>TIMING.signal)continue;
      const p=easeOut(elapsed/TIMING.signal),dock=voicePanel.getBoundingClientRect(),origin={x:dock.left+31,y:dock.top+31},mother=screenEye(ritual.mother),end=surfacePoint(mother,origin),bend={x:42,y:-22},head=curvePoint(origin,end,bend,p),tailProgress=Math.max(0,p-.31),tail=curvePoint(origin,end,bend,tailProgress),flare=clamp((p-.54)/.46,0,1);
      for(let strand=-1;strand<=1;strand++){
        const offset=strand*2.8*(1-p),gradient=network.createLinearGradient(tail.x,tail.y,head.x,head.y);
        gradient.addColorStop(0,'rgba(116,87,235,0)');gradient.addColorStop(.7,`rgba(155,132,255,${strand ? .26 : .58})`);gradient.addColorStop(1,`rgba(244,239,255,${strand ? .72 : .98})`);
        network.strokeStyle=gradient;network.lineWidth=strand ? .72 : 1.65;network.beginPath();network.moveTo(tail.x,tail.y+offset);network.quadraticCurveTo((tail.x+head.x)/2+strand*4,(tail.y+head.y)/2-strand*6,head.x,head.y);network.stroke();
      }
      const glowRadius=20+flare*12,glow=network.createRadialGradient(head.x,head.y,0,head.x,head.y,glowRadius);glow.addColorStop(0,'rgba(250,247,255,.98)');glow.addColorStop(.18,'rgba(185,167,255,.82)');glow.addColorStop(1,'rgba(95,65,220,0)');network.fillStyle=glow;network.beginPath();network.arc(head.x,head.y,glowRadius,0,Math.PI*2);network.fill();
      if(flare>0){const seed=ritual.mother.seed;for(let spark=0;spark<7;spark++){const angle=seed+spark*2.399+now*.0002,distance=mother.r*(.69+.2*Math.sin(seed+spark*1.7)),sx=mother.x+Math.cos(angle)*distance,sy=mother.y+Math.sin(angle)*distance*.78;network.fillStyle=`rgba(217,207,255,${(.12+.42*flare)*(spark%3===0?1:.58)})`;network.beginPath();network.arc(sx,sy,spark%3===0?1.35:.7,0,Math.PI*2);network.fill();}}
    }
    network.restore();
  }

  function drawWaveform(now){
    const cssWidth=waveCanvas.width/dpr,cssHeight=waveCanvas.height/dpr;waveContext.clearRect(0,0,cssWidth,cssHeight);const gradient=waveContext.createLinearGradient(0,0,cssWidth,0);gradient.addColorStop(0,'rgba(116,96,224,0)');gradient.addColorStop(.14,'rgba(158,139,255,.48)');gradient.addColorStop(.5,'rgba(224,216,255,.9)');gradient.addColorStop(.86,'rgba(158,139,255,.48)');gradient.addColorStop(1,'rgba(116,96,224,0)');waveContext.strokeStyle=gradient;waveContext.lineWidth=1.15;waveContext.beginPath();let level=0;
    if(analyser){const data=new Uint8Array(analyser.fftSize);analyser.getByteTimeDomainData(data);for(let i=0;i<data.length;i++){const normalized=(data[i]-128)/128;level+=normalized*normalized;const x=i/(data.length-1)*cssWidth,y=cssHeight*.5+normalized*cssHeight*.42;if(i===0)waveContext.moveTo(x,y);else waveContext.lineTo(x,y);}voiceLevel=Math.sqrt(level/data.length);}else{const pulse=clamp(1-(now-voicePulseAt)/420,0,1);for(let i=0;i<=180;i++){const t=i/180,envelope=Math.exp(-Math.pow((t-.55)*7,2)),wave=Math.sin(t*88)*envelope*pulse, x=t*cssWidth,y=cssHeight*.5+wave*cssHeight*.34;if(i===0)waveContext.moveTo(x,y);else waveContext.lineTo(x,y);}voiceLevel*=.9;}
    waveContext.stroke();if(analyser&&voiceLevel>.028&&root.dataset.state==='listening')setVoiceState('hearing','听到声音','正在识别…');
  }

  function setVoiceState(state,label,hint=''){root.dataset.state=state;voiceStateNode.textContent=label;transcriptNode.textContent=hint;const unavailable=state==='denied';microphoneIcon.src=unavailable?'assets/tabler-microphone-off.svg':'assets/tabler-microphone.svg';listenButton.setAttribute('aria-label',state==='idle'||state==='denied'?'开启麦克风':state==='fallback'?'点击发出 hey':'停止聆听');}
  function resetVoiceSoon(delay=760){clearTimeout(voiceResetTimer);voiceResetTimer=setTimeout(()=>{if(listeningWanted)setVoiceState('listening','正在听…','说出 hey');else if(!manualFallback)setVoiceState('idle','让它们听见你','麦克风未开启');},delay);}
  function spawnPoint(mother){const base=Math.min(width,height),margin=base*.09,displayed=visibleEyes();let best={x:width*.58,y:height*.45},bestGap=-Infinity;for(let i=0;i<34;i++){const angle=random(-Math.PI,Math.PI),distance=base*random(.19,.29),point={x:clamp(mother.homeX+Math.cos(angle)*distance,margin,width-margin),y:clamp(mother.homeY+Math.sin(angle)*distance,margin,height*.79)},gap=displayed.reduce((value,eye)=>Math.min(value,Math.hypot(point.x-eye.homeX,point.y-eye.homeY)-eye.radius),Infinity);if(gap>bestGap){best=point;bestGap=gap;}}return best;}
  function receiveHey(source='voice',spoken='hey'){queue.push({source,spoken,at:performance.now()});voicePulseAt=performance.now();const waiting=queue.length+rituals.filter(item=>!item.committed).length;setVoiceState('accepted','HEY',waiting>1?`已接收 ×${waiting}`:'已接收');status.textContent=`已接收 ${waiting} 声 hey。`;ensureAudio();playCue('heard',eyes[0]);scheduleRitualPump();resetVoiceSoon(720);}
  function scheduleRitualPump(){if(!queue.length||queueTimer)return;const delay=Math.max(0,TIMING.launchGap-(performance.now()-lastLaunchAt));queueTimer=setTimeout(()=>{queueTimer=0;startRitual();if(queue.length)scheduleRitualPump();},delay);}
  function startRitual(){if(!queue.length||!eyes.length)return;const now=performance.now(),signal=queue.shift(),displayed=visibleEyes(),busy=new Set(rituals.flatMap(item=>[item.mother,item.newborn]).filter(Boolean)),pool=displayed.filter(eye=>!busy.has(eye)&&!eye.newborn).slice(-9),mother=(pool.length?pool:displayed)[Math.floor(Math.random()*(pool.length||displayed.length))],target=spawnPoint(mother),ritual={startedAt:now,signal,mother,target,newborn:null,committed:false,done:false};rituals.push(ritual);lastLaunchAt=now;root.dataset.process='branch';displayed.forEach(eye=>eye.lookAt(()=>mother,now,random(34,150),880));mother.lookAt(()=>pointer,now,18,1120);playCue('focus',mother);}
  function createChild(ritual,now){if(ritual.newborn)return;const mother=ritual.mother,child=new Eye(mother.x,mother.y,clamp(mother.radius*random(.58,.72),38,82),{newborn:true,opacity:mother.opacity*.95,depth:mother.depth+.05,rotation:mother.rotation+random(-.09,.09)});child.lookX=mother.lookX;child.lookY=mother.lookY;eyes.push(child);threads.push({a:mother,b:child,bornAt:now,forming:true});ritual.newborn=child;playCue('birth',mother);}
  function updateDensity(now){let density='sparse',scale=1;if(worldCount>=55){density='coherence';scale=.62;}else if(worldCount>=21){density='constellation';scale=.76;}else if(worldCount>=8){density='cluster';scale=.9;}const changed=root.dataset.density!==density;root.dataset.density=density;targetCameraScale=Math.max(.56,scale-Math.max(0,worldCount-55)*.0012);if(changed&&worldCount>=8)phaseWave={at:now,density};}
  function commitRitual(ritual,now){if(ritual.committed)return;ritual.committed=true;worldCount++;countNode.textContent=String(worldCount).padStart(2,'0');ritual.newborn.newborn=false;ritual.newborn.birthOpen=1;ritual.newborn.lookAt(()=>pointer,now,40,1100);const thread=threads.find(item=>item.a===ritual.mother&&item.b===ritual.newborn);if(thread)thread.forming=false;status.textContent=`第 ${worldCount} 个新现实已经形成。`;playCue('open',ritual.newborn);updateDensity(now);}
  function updateRituals(now){for(const ritual of rituals){const elapsed=(now-ritual.startedAt)/(reducedMotion ? .16 : 1),mother=ritual.mother;if(elapsed<TIMING.signal){mother.strain=easeOut(elapsed/TIMING.signal)*.48;continue;}createChild(ritual,now);const child=ritual.newborn,branchProgress=clamp((elapsed-TIMING.signal)/(TIMING.branch-TIMING.signal),0,1),travel=easeOut(branchProgress),tension=Math.sin(Math.PI*branchProgress);mother.strain=.14+tension*.72;child.branchAlpha=clamp((elapsed-TIMING.signal+70)/170,0,1);child.homeX=mother.x+(ritual.target.x-mother.x)*travel;child.homeY=mother.y+(ritual.target.y-mother.y)*travel;child.x=child.homeX;child.y=child.homeY;child.birthOpen=clamp((elapsed-470)/250,0,1);if(elapsed>=TIMING.branch)commitRitual(ritual,now);if(elapsed>=TIMING.settled){mother.strain=0;ritual.done=true;}}
    for(let i=rituals.length-1;i>=0;i--){if(rituals[i].done)rituals.splice(i,1);}root.dataset.process=rituals.length?'branch':'idle';
  }

  function normalizedHeyCount(text){const value=text.toLowerCase().replace(/[.,!?;:。，！？]/g,' ');const english=value.match(/\b(?:h+e+y+|hei+|hai+|hay+|hi+|he)\b/g)||[];const chinese=value.match(/[嗨嘿黑海]/g)||[];return english.length+chinese.length;}
  function bestAlternative(result){let best=result[0],bestCount=normalizedHeyCount(best?.transcript||'');for(let index=1;index<result.length;index++){const candidate=result[index],count=normalizedHeyCount(candidate.transcript||'');if(count>bestCount||(count===bestCount&&(candidate.confidence||0)>(best?.confidence||0))){best=candidate;bestCount=count;}}return{alternative:best,count:bestCount};}
  function setupRecognition(){if(!SpeechRecognition)return false;recognition=new SpeechRecognition();recognition.continuous=true;recognition.interimResults=true;recognition.maxAlternatives=10;recognition.lang='zh-CN';recognition.onstart=()=>{restarting=false;recognizedByIndex=new Map();setVoiceState('listening','正在听…','说出 hey');};recognition.onsoundstart=()=>setVoiceState('hearing','听到声音','正在识别…');recognition.onspeechstart=()=>setVoiceState('hearing','听到声音','正在识别…');recognition.onspeechend=()=>{if(root.dataset.state==='hearing')setVoiceState('hearing','正在识别',transcriptNode.textContent);};recognition.onresult=event=>{for(let index=event.resultIndex;index<event.results.length;index++){const result=event.results[index],{alternative,count}=bestAlternative(result),spoken=(alternative?.transcript||'').trim(),accepted=recognizedByIndex.get(index)||0;if(!result.isFinal)setVoiceState('hearing',count?'识别到 hey':'正在识别',spoken||'…');if(count>accepted){recognizedByIndex.set(index,count);for(let item=accepted;item<count;item++)receiveHey('voice',spoken||'hey');}if(result.isFinal&&count===0&&accepted===0){setVoiceState('listening','没有听清 hey',spoken||'请再说一次');resetVoiceSoon(1150);}}};recognition.onnomatch=()=>{setVoiceState('listening','没有听清 hey','请再说一次');resetVoiceSoon(1150);};recognition.onerror=event=>{if(event.error==='not-allowed'||event.error==='service-not-allowed'){listeningWanted=false;manualFallback=false;setVoiceState('denied','无法使用麦克风','点击重试');listenButton.disabled=false;}else if(event.error!=='no-speech'&&event.error!=='aborted'){listeningWanted=false;manualFallback=true;setVoiceState('fallback','语音识别不可用','点击麦克风发出 hey');listenButton.disabled=false;}};recognition.onend=()=>{if(!listeningWanted||restarting)return;restarting=true;setTimeout(()=>{try{recognition.start();}catch(_){restarting=false;}},180);};return true;}
  async function startMicrophone(){listenButton.disabled=true;manualFallback=false;setVoiceState('requesting','正在等待麦克风权限','');ensureAudio();try{if(!navigator.mediaDevices?.getUserMedia)throw new Error('mediaDevices unavailable');mediaStream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true,channelCount:1}});const source=audio.ctx.createMediaStreamSource(mediaStream);analyser=audio.ctx.createAnalyser();analyser.fftSize=1024;analyser.smoothingTimeConstant=.42;source.connect(analyser);listeningWanted=true;listenButton.disabled=false;if(!recognition&&!setupRecognition()){listeningWanted=false;manualFallback=true;setVoiceState('fallback','语音识别不可用','点击麦克风发出 hey');return;}try{recognition.start();}catch(_){setVoiceState('listening','正在听…','说出 hey');}}catch(_){listeningWanted=false;manualFallback=false;listenButton.disabled=false;setVoiceState('denied','无法使用麦克风','点击重试');}}
  function stopMicrophone(){listeningWanted=false;manualFallback=false;if(recognition){try{recognition.stop();}catch(_){}}if(mediaStream){mediaStream.getTracks().forEach(track=>track.stop());mediaStream=null;}analyser=null;setVoiceState('idle','让它们听见你','麦克风未开启');}
  function ensureAudio(){if(audio){if(audio.ctx.state==='suspended')audio.ctx.resume();return;}const AudioContext=window.AudioContext||window.webkitAudioContext;if(!AudioContext)return;const context=new AudioContext(),master=context.createGain();master.gain.value=soundOn ? .15 : 0;master.connect(context.destination);audio={ctx:context,master};}
  function playCue(kind,eye){if(!soundOn||!audio||!eye)return;const context=audio.ctx,now=context.currentTime,oscillator=context.createOscillator(),gain=context.createGain(),panner=context.createStereoPanner?context.createStereoPanner():null,frequency={heard:[360,250],focus:[142,185],birth:[82,176],open:[178,470]}[kind]||[110,230];oscillator.type=kind==='heard'?'sine':'triangle';oscillator.frequency.setValueAtTime(frequency[0],now);oscillator.frequency.exponentialRampToValueAtTime(frequency[1],now+.52);gain.gain.setValueAtTime(.0001,now);gain.gain.exponentialRampToValueAtTime(.046,now+.035);gain.gain.exponentialRampToValueAtTime(.0001,now+.64);oscillator.connect(gain);if(panner){gain.connect(panner);panner.pan.value=clamp((eye.x/width-.5)*1.6,-1,1);panner.connect(audio.master);}else gain.connect(audio.master);oscillator.start(now);oscillator.stop(now+.66);}

  function frame(now){const dt=Math.min(40,now-lastTime);lastTime=now;updateRituals(now);cameraScale+=(targetCameraScale-cameraScale)*(1-Math.pow(.91,dt/16.67));eyes.forEach(eye=>eye.update(now,dt));renderScene(now);drawNetwork(now);drawWaveform(now);requestAnimationFrame(frame);}
  listenButton.addEventListener('click',()=>{if(manualFallback){receiveHey('manual','hey');return;}if(listeningWanted)stopMicrophone();else startMicrophone();});
  soundButton.addEventListener('click',()=>{ensureAudio();soundOn=!soundOn;soundButton.setAttribute('aria-pressed',String(soundOn));soundButton.setAttribute('aria-label',soundOn?'关闭声音':'开启声音');soundIcon.src=soundOn?'assets/tabler-volume.svg':'assets/tabler-volume-off.svg';if(audio)audio.master.gain.setTargetAtTime(soundOn ? .15 : 0,audio.ctx.currentTime,.08);});
  root.addEventListener('pointermove',event=>{pointer.x=event.clientX;pointer.y=event.clientY;root.dataset.input=event.pointerType==='touch'?'touch':'pointer';});
  addEventListener('resize',resize);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stopMicrophone();});

  root.dataset.density='sparse';
  resize();
  const eyeImage=new Image();eyeImage.decoding='async';eyeImage.onload=()=>{try{initializeWebGL(eyeImage);resize();}catch(error){console.error(error);setVoiceState('fallback','视觉渲染暂时不可用','请更新浏览器');}};eyeImage.onerror=()=>setVoiceState('fallback','眼睛素材加载失败','请刷新页面');eyeImage.src='assets/eye-orb-source-cutout.png';requestAnimationFrame(frame);
  const qaDemo=new URLSearchParams(location.search).get('demo');if(qaDemo==='hey')setTimeout(()=>receiveHey('test','hey'),520);if(qaDemo==='triple')setTimeout(()=>{for(let i=0;i<3;i++)setTimeout(()=>receiveHey('test','hey'),i*120);},520);if(qaDemo==='density')setTimeout(()=>{for(let i=0;i<8;i++)setTimeout(()=>receiveHey('test','hey'),i*60);},520);
  window.eyeMultiverse=Object.freeze({sayHey:(count=1)=>{for(let i=0;i<count;i++)setTimeout(()=>receiveHey('test','hey'),i*120);},get count(){return worldCount;},get process(){return rituals.length?'branch':'idle';},get active(){return rituals.length;},get eyes(){return eyes.length;},timing:TIMING});
})();
