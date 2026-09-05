(() => {
  'use strict';

  const MAX_EYES = 24;
  const root = document.getElementById('multiverse');
  const canvas = document.getElementById('multiverseCanvas');
  const networkCanvas = document.getElementById('networkCanvas');
  const network = networkCanvas.getContext('2d');
  const waveCanvas = document.getElementById('voiceWave');
  const waveContext = waveCanvas.getContext('2d');
  const listenButton = document.getElementById('listenButton');
  const manualButton = document.getElementById('manualButton');
  const soundButton = document.getElementById('soundButton');
  const titleNode = document.getElementById('invitationTitle');
  const instruction = document.getElementById('instruction');
  const voiceStateNode = document.getElementById('voiceState');
  const transcriptNode = document.getElementById('transcript');
  const countNode = document.getElementById('count');
  const fallback = document.getElementById('fallback');
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
    uniform int uEyeCount;
    uniform vec4 uEyeA[MAX_EYES];
    uniform vec4 uEyeB[MAX_EYES];
    uniform vec4 uEyeC[MAX_EYES];

    float hash21(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
    float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash21(i),hash21(i+vec2(1,0)),f.x),mix(hash21(i+vec2(0,1)),hash21(i+1.),f.x),f.y);}
    float fbm(vec2 p){float v=0.,a=.52;mat2 m=mat2(1.62,1.18,-1.18,1.62);for(int i=0;i<5;i++){v+=a*noise(p);p=m*p+3.17;a*=.48;}return v;}
    float stars(vec2 uv,float scale,float gate){vec2 p=uv*scale,id=floor(p),f=fract(p)-.5;float h=hash21(id);vec2 o=vec2(hash21(id+7.1),hash21(id+19.7))-.5;float d=length(f-o*.58);float size=mix(.035,.115,pow(h,18.));return smoothstep(size,0.,d)*step(gate,h);}

    vec3 cosmos(vec2 uv,float time){
      float aspect=uResolution.x/max(1.,uResolution.y);
      vec2 p=(uv-.5)*vec2(aspect,1.);
      vec2 drift=vec2(time*.0024,-time*.0015)*uMotion;
      float n1=fbm(p*2.15+drift+vec2(1.8,-.4));
      float n2=fbm(p*4.1-drift*.7+vec2(-3.2,4.7));
      float band=exp(-abs(p.y*.78+p.x*.22+.11*sin(p.x*2.7+n1*2.))*5.4);
      float cloud=smoothstep(.38,.83,n1)*(.28+.72*n2)*band;
      vec3 color=vec3(.0025,.003,.014);
      color+=vec3(.022,.018,.082)*cloud;
      color+=vec3(.055,.035,.16)*pow(cloud,2.)*.72;
      color+=vec3(.015,.022,.07)*smoothstep(.54,.88,n2)*.32;
      vec2 parallax=(uPointer-.5)*vec2(.018,-.012)*uMotion;
      float s1=stars(uv+parallax,72.,.952);
      float s2=stars(uv-parallax*.45+vec2(.17,.09),138.,.972);
      float s3=stars(uv+parallax*.18+vec2(.37,.22),235.,.987);
      color+=s1*vec3(.34,.36,.72)+s2*vec3(.52,.43,.92)+s3*vec3(.78,.72,1.);
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
        q.x/=1.+b.w*.075;q.y/=1.+b.w*.035;
        float r=length(q);
        if(r<1.16){
          float sphere=1.-smoothstep(.96,1.065,r);
          float z=sqrt(max(0.,1.-min(1.,r*r)));
          vec2 refractUv=vUv+q*.010*(.3+z)*(1.-c.z*.18);
          vec3 refracted=cosmos(refractUv,uTime+13.7+c.y)*vec3(.9,.88,1.12);
          color=mix(color,refracted,sphere*.62*a.w);

          float inner=1.-smoothstep(.27,.62,r);
          vec2 gaze=b.xy;
          vec2 textureUv=q*.455+.5-gaze*inner*.105;
          vec4 tex=texture2D(uEye,textureUv);
          float lum=max(tex.r,max(tex.g,tex.b));
          float detail=smoothstep(.018,.13,lum)*tex.a*sphere;
          vec3 eyeLight=pow(max(tex.rgb,vec3(0.)),vec3(.88))*vec3(.92,.86,1.18);
          color+=eyeLight*detail*1.34*a.w;

          vec2 organ=q-gaze*.2;
          float pupil=1.-smoothstep(.17,.235,length(organ));
          color=mix(color,vec3(.0004,.0005,.003),pupil*sphere*.93*a.w);

          float blink=b.z;
          float lidX=organ.x+blink*.045;
          float membraneGate=1.-smoothstep(.72,.91,length(organ));
          float curve=.105*(1.-clamp(lidX*lidX*2.2,0.,1.));
          float upperEdge=mix(.68,-.39,blink)+curve+organ.x*.025;
          float lowerEdge=mix(-.68,-.27,blink)-curve*.18;
          float upperCover=smoothstep(upperEdge-.026,upperEdge+.026,organ.y);
          float lowerCover=1.-smoothstep(lowerEdge-.026,lowerEdge+.026,organ.y);
          float membrane=max(upperCover,lowerCover)*membraneGate*smoothstep(.02,.10,blink);
          float membraneNoise=fbm(organ*7.+vec2(c.y*4.1,uTime*.04));
          vec3 membraneColor=vec3(.009,.006,.035)+vec3(.065,.043,.13)*membraneNoise;
          color=mix(color,membraneColor,membrane*.91*a.w);
          float seam=(1.-smoothstep(.006,.025,abs(organ.y-upperEdge)))*membraneGate*blink;
          color+=seam*vec3(.20,.15,.42)*.42*a.w;

          vec2 fixedUv=q*.455+.5;
          vec4 shell=texture2D(uEye,fixedUv);
          float shellLum=max(shell.r,max(shell.g,shell.b));
          float shellDetail=smoothstep(.16,.55,shellLum)*shell.a*sphere;
          color+=pow(shell.rgb,vec3(.78))*shellDetail*.52*a.w;

          float fresnel=pow(1.-z,3.2)*sphere;
          color+=fresnel*vec3(.12,.09,.31)*(.42+.58*c.z)*a.w;
          float rim=(1.-smoothstep(.012,.045,abs(r-.91)))*sphere;
          color+=rim*vec3(.20,.15,.46)*.22*a.w;
          vec2 glintCenter=vec2(-.29,.34);
          float glint=pow(max(0.,1.-length(q-glintCenter)/.24),3.)*sphere;
          color+=glint*vec3(.48,.42,.82)*.26*a.w;
        }
      }
      float vignette=smoothstep(.36,1.03,length((vUv-.5)*vec2(aspect*.72,1.)));
      color*=1.-vignette*.52;
      color=pow(max(color,vec3(0.)),vec3(.88));
      gl_FragColor=vec4(color,1.);
    }
  `;

  const clamp = (value,min,max) => Math.max(min,Math.min(max,value));
  const random = (min,max) => min+Math.random()*(max-min);
  const smooth = value => {const t=clamp(value,0,1);return t*t*(3-2*t);};
  const easeOut = value => 1-Math.pow(1-clamp(value,0,1),3);
  const pointer = {x:innerWidth*.5,y:innerHeight*.42};
  const eyes = [], threads = [], queue = [];
  let width=innerWidth,height=innerHeight,dpr=1,lastTime=performance.now(),worldCount=0,cameraScale=1;
  let ritual=null,recognition=null,listeningWanted=false,restarting=false,processedFinal=new Set();
  let mediaStream=null,analyser=null,audio=null,soundOn=true,voiceLevel=0;
  let gl=null,program=null,eyeTexture=null,positionBuffer=null,ready=false;
  const eyeA=new Float32Array(MAX_EYES*4),eyeB=new Float32Array(MAX_EYES*4),eyeC=new Float32Array(MAX_EYES*4);

  class Eye{
    constructor(x,y,r,options={}){
      this.x=this.homeX=x;this.y=this.homeY=y;this.radius=r;
      this.opacity=options.opacity??random(.72,1);this.depth=options.depth??random(.7,1.05);
      this.rotation=options.rotation??random(-.17,.17);this.seed=random(0,1000);
      this.lookX=0;this.lookY=0;this.lookTarget={x,y};this.nextThought=performance.now()+random(1400,4200);this.forced=null;
      this.blinkStart=0;this.blinkAt=performance.now()+random(1900,7600);this.blinkAmount=1;
      this.newborn=!!options.newborn;this.birthOpen=this.newborn?0:1;this.branchAlpha=this.newborn?0:1;this.strain=0;
    }
    lookAt(target,now,delay=0,duration=1700){this.forced={target,start:now+delay,end:now+delay+duration};}
    chooseThought(now){const others=eyes.filter(eye=>eye!==this&&eye.branchAlpha>.6);if(others.length&&Math.random()<.46){const other=others[Math.floor(Math.random()*others.length)];this.lookTarget={x:other.x,y:other.y};}else{const reach=Math.min(width,height)*random(.12,.28);this.lookTarget={x:clamp(this.homeX+random(-reach,reach),60,width-60),y:clamp(this.homeY+random(-reach,reach),55,height-55)};}this.nextThought=now+random(2300,6200);}
    closure(now){if(this.newborn)return 1-this.birthOpen;if(!this.blinkStart)return 0;const elapsed=now-this.blinkStart;if(elapsed<78)return easeOut(elapsed/78)*this.blinkAmount;if(elapsed<118)return this.blinkAmount;if(elapsed<278)return(1-smooth((elapsed-118)/160))*this.blinkAmount;this.blinkStart=0;this.blinkAt=now+random(2500,8500);return 0;}
    update(now,dt){if(now>this.nextThought&&(!this.forced||now>this.forced.end))this.chooseThought(now);if(this.forced&&now>this.forced.end)this.forced=null;let target=this.lookTarget;if(this.forced&&now>=this.forced.start)target=typeof this.forced.target==='function'?this.forced.target():this.forced.target;const dx=target.x-this.x,dy=target.y-this.y,distance=Math.max(1,Math.hypot(dx,dy)),reach=Math.min(this.radius*.18,distance*.075),response=1-Math.pow(.87,dt/16.67);this.lookX+=(dx/distance*reach-this.lookX)*response;this.lookY+=(dy/distance*reach-this.lookY)*response;if(!this.newborn&&!this.blinkStart&&now>=this.blinkAt&&(!ritual||ritual.mother!==this)){this.blinkAmount=Math.random()<.2?.7:1;this.blinkStart=now;}}
  }

  function compile(type,source){const shader=gl.createShader(type);gl.shaderSource(shader,source);gl.compileShader(shader);if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS)){const message=gl.getShaderInfoLog(shader);gl.deleteShader(shader);throw new Error(message);}return shader;}
  function initializeWebGL(image){gl=canvas.getContext('webgl',{alpha:false,antialias:false,premultipliedAlpha:false,powerPreference:'high-performance'});if(!gl)throw new Error('WebGL unavailable');const vertex=compile(gl.VERTEX_SHADER,VERTEX_SHADER),fragment=compile(gl.FRAGMENT_SHADER,FRAGMENT_SHADER);program=gl.createProgram();gl.attachShader(program,vertex);gl.attachShader(program,fragment);gl.linkProgram(program);gl.deleteShader(vertex);gl.deleteShader(fragment);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(program));positionBuffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,positionBuffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);eyeTexture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,eyeTexture);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);ready=true;seedWorld();}
  function seedWorld(){if(eyes.length)return;const base=Math.min(width,height);[[.35,.33,.18,.98,1,-.03],[.74,.28,.098,.86,.78,.11],[.72,.7,.073,.74,.62,-.13]].forEach(([x,y,r,opacity,depth,rotation])=>eyes.push(new Eye(x*width,y*height,r*base,{opacity,depth,rotation})));threads.push({a:eyes[0],b:eyes[1],bornAt:0},{a:eyes[0],b:eyes[2],bornAt:0});}
  function visibleEyes(){const active=eyes.filter(eye=>eye.branchAlpha>.005);if(active.length<=MAX_EYES)return active;return[active[0],...active.slice(-(MAX_EYES-1))];}
  function resize(){width=innerWidth;height=innerHeight;dpr=Math.min(devicePixelRatio||1,2);for(const target of [canvas,networkCanvas]){target.width=Math.round(width*dpr);target.height=Math.round(height*dpr);target.style.width=`${width}px`;target.style.height=`${height}px`;}network.setTransform(dpr,0,0,dpr,0,0);const rect=waveCanvas.getBoundingClientRect();waveCanvas.width=Math.max(1,Math.round(rect.width*dpr));waveCanvas.height=Math.max(1,Math.round(rect.height*dpr));waveContext.setTransform(dpr,0,0,dpr,0,0);if(gl)gl.viewport(0,0,canvas.width,canvas.height);}
  function fillEyeUniforms(now){eyeA.fill(0);eyeB.fill(0);eyeC.fill(0);const visible=visibleEyes();visible.forEach((eye,index)=>{const offset=index*4,r=eye.radius*cameraScale,screenX=width/2+(eye.x-width/2)*cameraScale,screenY=height/2+(eye.y-height/2)*cameraScale;eyeA.set([screenX/width,1-screenY/height,r/height,eye.opacity*eye.branchAlpha],offset);eyeB.set([eye.lookX/Math.max(1,eye.radius),-eye.lookY/Math.max(1,eye.radius),eye.closure(now),eye.strain],offset);eyeC.set([eye.rotation,eye.seed*.001,eye.depth,0],offset);});return visible.length;}
  function renderScene(now){if(!ready)return;gl.useProgram(program);gl.bindBuffer(gl.ARRAY_BUFFER,positionBuffer);const position=gl.getAttribLocation(program,'aPosition');gl.enableVertexAttribArray(position);gl.vertexAttribPointer(position,2,gl.FLOAT,false,0,0);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,eyeTexture);gl.uniform1i(gl.getUniformLocation(program,'uEye'),0);gl.uniform2f(gl.getUniformLocation(program,'uResolution'),canvas.width,canvas.height);gl.uniform2f(gl.getUniformLocation(program,'uPointer'),pointer.x/width,1-pointer.y/height);gl.uniform1f(gl.getUniformLocation(program,'uTime'),now*.001);gl.uniform1f(gl.getUniformLocation(program,'uMotion'),reducedMotion?0:1);gl.uniform1i(gl.getUniformLocation(program,'uEyeCount'),fillEyeUniforms(now));gl.uniform4fv(gl.getUniformLocation(program,'uEyeA[0]'),eyeA);gl.uniform4fv(gl.getUniformLocation(program,'uEyeB[0]'),eyeB);gl.uniform4fv(gl.getUniformLocation(program,'uEyeC[0]'),eyeC);gl.drawArrays(gl.TRIANGLES,0,6);}

  function surfacePoint(eye,target){const dx=target.x-eye.x,dy=target.y-eye.y,d=Math.max(1,Math.hypot(dx,dy));return{x:eye.x+dx/d*eye.radius*.82,y:eye.y+dy/d*eye.radius*.82};}
  function curvePoint(start,end,bend,t){const inv=1-t,cx=(start.x+end.x)/2+bend.x,cy=(start.y+end.y)/2+bend.y;return{x:inv*inv*start.x+2*inv*t*cx+t*t*end.x,y:inv*inv*start.y+2*inv*t*cy+t*t*end.y};}
  function drawNetwork(now){network.clearRect(0,0,width,height);network.save();network.globalCompositeOperation='screen';const displayed=new Set(visibleEyes());for(const thread of threads){if(!displayed.has(thread.a)||!displayed.has(thread.b))continue;const start=surfacePoint(thread.a,thread.b),end=surfacePoint(thread.b,thread.a),age=thread.bornAt?clamp((now-thread.bornAt)/900,0,1):1,bend={x:Math.sin(thread.a.seed)*25,y:Math.cos(thread.b.seed)*20},base=thread.forming?.3+(1-age)*.36:.14;for(let strand=-1;strand<=1;strand++){network.strokeStyle=`rgba(139,119,239,${base*(strand?0.34:1)})`;network.lineWidth=strand?0.45:0.75;network.beginPath();network.moveTo(start.x,start.y+strand*3);network.quadraticCurveTo((start.x+end.x)/2+bend.x+strand*12,(start.y+end.y)/2+bend.y-strand*8,start.x+(end.x-start.x)*age,start.y+(end.y-start.y)*age+strand*2);network.stroke();}}
    if(ritual&&ritual.stage==='signal'){const p=easeOut((now-ritual.stageAt)/720),origin={x:width*.5,y:height*.58},end=surfacePoint(ritual.mother,origin),point=curvePoint(origin,end,{x:38,y:-16},p),tail=curvePoint(origin,end,{x:38,y:-16},Math.max(0,p-.16)),gradient=network.createLinearGradient(tail.x,tail.y,point.x,point.y);gradient.addColorStop(0,'rgba(116,87,235,0)');gradient.addColorStop(1,'rgba(229,220,255,.82)');network.strokeStyle=gradient;network.lineWidth=1.2;network.beginPath();network.moveTo(tail.x,tail.y);network.lineTo(point.x,point.y);network.stroke();const glow=network.createRadialGradient(point.x,point.y,0,point.x,point.y,18);glow.addColorStop(0,'rgba(245,241,255,.96)');glow.addColorStop(.25,'rgba(176,156,255,.72)');glow.addColorStop(1,'rgba(95,65,220,0)');network.fillStyle=glow;network.beginPath();network.arc(point.x,point.y,18,0,Math.PI*2);network.fill();}network.restore();}

  function drawWaveform(now){const cssWidth=waveCanvas.width/dpr,cssHeight=waveCanvas.height/dpr;waveContext.clearRect(0,0,cssWidth,cssHeight);const gradient=waveContext.createLinearGradient(0,0,cssWidth,0);gradient.addColorStop(0,'rgba(116,96,224,0)');gradient.addColorStop(.18,'rgba(158,139,255,.62)');gradient.addColorStop(.5,'rgba(224,216,255,.94)');gradient.addColorStop(.82,'rgba(158,139,255,.62)');gradient.addColorStop(1,'rgba(116,96,224,0)');waveContext.strokeStyle=gradient;waveContext.lineWidth=1.25;waveContext.beginPath();let level=0;if(analyser){const data=new Uint8Array(analyser.fftSize);analyser.getByteTimeDomainData(data);for(let i=0;i<data.length;i++){const normalized=(data[i]-128)/128;level+=normalized*normalized;const x=i/(data.length-1)*cssWidth,y=cssHeight*.5+normalized*cssHeight*.42;if(i===0)waveContext.moveTo(x,y);else waveContext.lineTo(x,y);}voiceLevel=Math.sqrt(level/data.length);}else{waveContext.moveTo(0,cssHeight*.5);waveContext.lineTo(cssWidth,cssHeight*.5);voiceLevel*=.9;}waveContext.stroke();if(analyser&&voiceLevel>.035&&root.dataset.state==='listening')setVoiceState('hearing','听到声音',transcriptNode.textContent);}

  function setVoiceState(state,label,transcript=''){root.dataset.state=state;voiceStateNode.textContent=label;transcriptNode.textContent=transcript;}
  function setCopy(title,primary,secondary){titleNode.textContent=title;instruction.innerHTML=`${primary}<span>${secondary}</span>`;}
  function spawnPoint(mother){const base=Math.min(width,height),margin=base*.1,displayed=visibleEyes();let best={x:width*.58,y:height*.45},bestGap=-Infinity;for(let i=0;i<28;i++){const angle=random(-Math.PI,Math.PI),distance=base*random(.2,.31),point={x:clamp(mother.homeX+Math.cos(angle)*distance,margin,width-margin),y:clamp(mother.homeY+Math.sin(angle)*distance,margin,height-margin)},gap=displayed.reduce((value,eye)=>Math.min(value,Math.hypot(point.x-eye.homeX,point.y-eye.homeY)-eye.radius),Infinity);if(gap>bestGap){best=point;bestGap=gap;}}return best;}
  function receiveHey(source='voice',spoken='hey'){queue.push({source,spoken,at:performance.now()});const waiting=queue.length+(ritual?1:0),feedback=source==='voice'?`“${spoken}”`:'手动信号';setVoiceState('accepted',`识别到 hey ×${waiting}`,feedback);setCopy('它们听见了你','信号正在进入网络','SIGNAL ENTERING THE MULTIVERSE');status.textContent=`已接收 ${waiting} 声 hey。`;playCue('heard',eyes[0]);if(!ritual)startRitual();}
  function startRitual(){if(!queue.length||!eyes.length)return;const now=performance.now(),signal=queue.shift(),displayed=visibleEyes(),pool=displayed.slice(Math.max(0,displayed.length-7)),mother=pool[Math.floor(Math.random()*pool.length)],target=spawnPoint(mother),angle=Math.atan2(target.y-mother.y,target.x-mother.x);ritual={stage:'signal',stageAt:now,signal,mother,target,angle,newborn:null};root.dataset.process='signal';displayed.forEach((eye,index)=>eye.lookAt(()=>mother,now,90+index*random(45,120),3000));}
  function enterStage(stage,now){ritual.stage=stage;ritual.stageAt=now;root.dataset.process=stage;const{mother,target}=ritual;if(stage==='destabilize'){setCopy('现实开始失稳','两种可能正在分开','REALITY DESTABILIZING');mother.lookAt(()=>pointer,now,60,2100);playCue('focus',mother);}else if(stage==='branch'){setCopy('现实正在分岔','新的宇宙与它共用同一段记忆','A NEW REALITY IS BRANCHING');const child=new Eye(mother.x,mother.y,clamp(mother.radius*random(.58,.72),38,78),{newborn:true,opacity:mother.opacity*.94,depth:mother.depth+.05,rotation:mother.rotation+random(-.08,.08)});child.lookX=mother.lookX;child.lookY=mother.lookY;child.branchAlpha=.02;eyes.push(child);threads.push({a:mother,b:child,bornAt:now,forming:true});ritual.newborn=child;playCue('birth',mother);}else if(stage==='sever'){setCopy('新的现实正在脱离','它将开始独立观察','SEPARATING FROM THE SOURCE');ritual.newborn.newborn=false;ritual.newborn.birthOpen=1;playCue('sever',ritual.newborn);}else if(stage==='formed'){worldCount++;countNode.textContent=String(worldCount).padStart(2,'0');ritual.newborn.lookAt(()=>pointer,now,240,1900);setCopy('新的现实已经形成','再说一声 <b>hey</b>','LET ANOTHER REALITY BRANCH');setVoiceState(listeningWanted?'listening':'idle',listeningWanted?'正在听 · 再说一声 hey':'麦克风未开启','');status.textContent=`第 ${worldCount} 个新现实已经形成。`;playCue('open',ritual.newborn);}}
  function updateRitual(now){if(!ritual)return;const elapsed=now-ritual.stageAt,{mother,target,newborn}=ritual;if(ritual.stage==='signal'){mother.strain=0;if(elapsed>720)enterStage('destabilize',now);}else if(ritual.stage==='destabilize'){mother.strain=smooth(elapsed/900);if(elapsed>1280)enterStage('branch',now);}else if(ritual.stage==='branch'){const p=smooth(elapsed/1120),travel=easeOut(elapsed/1120);mother.strain=1-p*.46;newborn.branchAlpha=clamp(elapsed/320,0,1);newborn.homeX=mother.x+(target.x-mother.x)*travel;newborn.homeY=mother.y+(target.y-mother.y)*travel;newborn.x=newborn.homeX;newborn.y=newborn.homeY;newborn.birthOpen=clamp((elapsed-430)/540,0,1);if(elapsed>1180)enterStage('sever',now);}else if(ritual.stage==='sever'){mother.strain=Math.max(0,1-elapsed/390);if(elapsed>540)enterStage('formed',now);}else if(ritual.stage==='formed'&&elapsed>1250){const thread=threads.find(item=>item.a===mother&&item.b===newborn);if(thread)thread.forming=false;ritual=null;root.dataset.process='idle';cameraScale=Math.max(.58,1-Math.log2(worldCount+1)*.045);if(queue.length)setTimeout(startRitual,380);}}

  function normalizedHeyCount(text){const value=text.toLowerCase().replace(/[.,!?;:。，！？]/g,' ');const english=value.match(/\b(?:hey+|hei|hay|hi)\b/g)||[];const chinese=value.match(/[嗨嘿黑]/g)||[];return english.length+chinese.length;}
  function bestAlternative(result){let best=result[0],bestCount=normalizedHeyCount(best?.transcript||'');for(let index=1;index<result.length;index++){const candidate=result[index],count=normalizedHeyCount(candidate.transcript||'');if(count>bestCount||(count===bestCount&&(candidate.confidence||0)>(best?.confidence||0))){best=candidate;bestCount=count;}}return{alternative:best,count:bestCount};}
  function setupRecognition(){if(!SpeechRecognition)return false;recognition=new SpeechRecognition();recognition.continuous=true;recognition.interimResults=true;recognition.maxAlternatives=5;recognition.lang='en-US';recognition.onstart=()=>{restarting=false;processedFinal=new Set();setVoiceState('listening','正在听 · 说 hey','');setCopy('它们正在听你','说出 <b>hey</b>','每一声都会产生一个新分支');};recognition.onspeechstart=()=>setVoiceState('hearing','听到声音','正在识别…');recognition.onresult=event=>{let interim='';for(let index=event.resultIndex;index<event.results.length;index++){const result=event.results[index],{alternative,count}=bestAlternative(result),spoken=(alternative?.transcript||'').trim();if(!result.isFinal){interim+=spoken;setVoiceState('hearing','正在识别',interim||'…');continue;}if(processedFinal.has(index))continue;processedFinal.add(index);if(count>0){for(let item=0;item<count;item++)setTimeout(()=>receiveHey('voice',spoken),item*220);}else{setVoiceState('listening','没有听清 hey',spoken||'请再说一次');setTimeout(()=>{if(listeningWanted&&!ritual)setVoiceState('listening','正在听 · 说 hey','');},1300);}}};recognition.onnomatch=()=>setVoiceState('listening','没有听清 hey','请再说一次');recognition.onerror=event=>{if(event.error==='not-allowed'||event.error==='service-not-allowed'){listeningWanted=false;setVoiceState('denied','麦克风未开启','可以按 H 或点击体验');listenButton.hidden=false;listenButton.disabled=false;listenButton.textContent='重新开启麦克风';}else if(event.error!=='no-speech'&&event.error!=='aborted'){setVoiceState('fallback','语音识别暂时不可用','可以按 H 或点击体验');}};recognition.onend=()=>{if(!listeningWanted||restarting)return;restarting=true;setTimeout(()=>{try{recognition.start();}catch(_){restarting=false;}},260);};return true;}
  async function startMicrophone(){listenButton.disabled=true;listenButton.textContent='正在等待授权…';setVoiceState('requesting','正在等待麦克风授权','');setCopy('让它们听见你','浏览器将请求麦克风权限','只有开启后，它们才能接收 hey');ensureAudio();try{if(!navigator.mediaDevices?.getUserMedia)throw new Error('mediaDevices unavailable');mediaStream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true}});const source=audio.ctx.createMediaStreamSource(mediaStream);analyser=audio.ctx.createAnalyser();analyser.fftSize=1024;analyser.smoothingTimeConstant=.52;source.connect(analyser);listeningWanted=true;listenButton.hidden=true;listenButton.disabled=false;if(!recognition&&!setupRecognition()){setVoiceState('fallback','浏览器无法识别 hey','声纹已开启，可以按 H 体验');return;}try{recognition.start();}catch(_){setVoiceState('listening','正在听 · 说 hey','');}}catch(error){listeningWanted=false;setVoiceState('denied','麦克风未开启','可以按 H 或点击体验');listenButton.hidden=false;listenButton.disabled=false;listenButton.textContent='重新开启麦克风';fallback.textContent='没有获得麦克风权限。你仍然可以使用按钮或 H 键体验。';fallback.hidden=false;}}
  function ensureAudio(){if(audio){if(audio.ctx.state==='suspended')audio.ctx.resume();return;}const AudioContext=window.AudioContext||window.webkitAudioContext;if(!AudioContext)return;const context=new AudioContext(),master=context.createGain();master.gain.value=soundOn?.15:0;master.connect(context.destination);audio={ctx:context,master};}
  function playCue(kind,eye){if(!soundOn||!audio||!eye)return;const context=audio.ctx,now=context.currentTime,oscillator=context.createOscillator(),gain=context.createGain(),panner=context.createStereoPanner?context.createStereoPanner():null,frequency={heard:[360,250],focus:[142,185],birth:[82,176],sever:[220,94],open:[178,470]}[kind]||[110,230];oscillator.type=kind==='heard'?'sine':'triangle';oscillator.frequency.setValueAtTime(frequency[0],now);oscillator.frequency.exponentialRampToValueAtTime(frequency[1],now+.7);gain.gain.setValueAtTime(.0001,now);gain.gain.exponentialRampToValueAtTime(.055,now+.045);gain.gain.exponentialRampToValueAtTime(.0001,now+.82);oscillator.connect(gain);if(panner){gain.connect(panner);panner.pan.value=clamp((eye.x/width-.5)*1.6,-1,1);panner.connect(audio.master);}else gain.connect(audio.master);oscillator.start(now);oscillator.stop(now+.86);}

  function frame(now){const dt=Math.min(40,now-lastTime);lastTime=now;updateRitual(now);eyes.forEach(eye=>eye.update(now,dt));renderScene(now);drawNetwork(now);drawWaveform(now);requestAnimationFrame(frame);}
  listenButton.addEventListener('click',startMicrophone);
  manualButton.addEventListener('click',()=>{ensureAudio();receiveHey('manual','hey');});
  soundButton.addEventListener('click',()=>{ensureAudio();soundOn=!soundOn;soundButton.setAttribute('aria-pressed',String(soundOn));soundButton.setAttribute('aria-label',soundOn?'关闭声音':'开启声音');if(audio)audio.master.gain.setTargetAtTime(soundOn?.15:0,audio.ctx.currentTime,.08);});
  root.addEventListener('pointermove',event=>{pointer.x=event.clientX;pointer.y=event.clientY;root.dataset.input=event.pointerType==='touch'?'touch':'pointer';});
  addEventListener('keydown',event=>{root.dataset.input='keyboard';if(event.key.toLowerCase()==='h'&&!event.repeat){ensureAudio();receiveHey('manual','hey');}});
  addEventListener('resize',resize);
  document.addEventListener('visibilitychange',()=>{if(document.hidden){if(recognition){listeningWanted=false;try{recognition.stop();}catch(_){}}if(mediaStream){mediaStream.getTracks().forEach(track=>track.stop());mediaStream=null;analyser=null;}setVoiceState('idle','麦克风未开启','');listenButton.hidden=false;listenButton.textContent='开启麦克风';}});

  resize();
  const eyeImage=new Image();eyeImage.decoding='async';eyeImage.onload=()=>{try{initializeWebGL(eyeImage);resize();}catch(error){console.error(error);setVoiceState('fallback','视觉渲染暂时不可用','请更新浏览器');}};eyeImage.onerror=()=>setVoiceState('fallback','眼睛素材加载失败','请刷新页面');eyeImage.src='assets/eye-orb-source-cutout.png';requestAnimationFrame(frame);
  window.eyeMultiverse=Object.freeze({sayHey:()=>receiveHey('test','test hey'),get count(){return worldCount;},get process(){return ritual?.stage||'idle';},get eyes(){return eyes.length;}});
})();
