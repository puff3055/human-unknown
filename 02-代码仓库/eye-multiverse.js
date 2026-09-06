(() => {
  'use strict';

  const MAX_EYES = 24;
  const FOCAL_LENGTH = 940;
  const TIMING = Object.freeze({ signal: 180, still: 430, branch: 1030, settled: 1260, launchGap: 300 });
  const root = document.getElementById('multiverse');
  const canvas = document.getElementById('multiverseCanvas');
  const networkCanvas = document.getElementById('networkCanvas');
  const networkFrontCanvas = document.getElementById('networkFrontCanvas');
  const network = networkCanvas.getContext('2d');
  const networkFront = networkFrontCanvas.getContext('2d');
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
    float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash21(i),hash21(i+vec2(1.,0.)),f.x),mix(hash21(i+vec2(0.,1.)),hash21(i+1.),f.x),f.y);}
    float fbm(vec2 p){float v=0.,a=.52;mat2 m=mat2(1.62,1.18,-1.18,1.62);for(int i=0;i<5;i++){v+=a*noise(p);p=m*p+3.17;a*=.48;}return v;}
    float sparseStar(vec2 uv,float scale,float gate,float cluster){
      float aspect=uResolution.x/max(1.,uResolution.y);
      vec2 p=uv*vec2(aspect,1.)*scale,id=floor(p),f=fract(p)-.5;
      float h=hash21(id),allowed=smoothstep(.43,.82,cluster+hash21(id*.071)*.16);
      vec2 o=vec2(hash21(id+7.1),hash21(id+19.7))-.5;
      float d=length(f-o*.56),size=mix(.025,.105,pow(h,19.));
      return (1.-smoothstep(0.,size,d))*step(gate,h)*allowed;
    }

    vec3 cosmos(vec2 uv,float time){
      float aspect=uResolution.x/max(1.,uResolution.y);
      vec2 p=(uv-.5)*vec2(aspect,1.);
      vec2 drift=vec2(time*.00042,-time*.00027)*uMotion;
      float mass=fbm(p*1.18+drift+vec2(1.9,-.7));
      float folds=fbm(p*2.35-drift*.55+vec2(-4.1,3.3));
      float grain=fbm(p*5.1+drift*.28+vec2(7.2,-5.4));
      float spine=pow(clamp(1.-abs(folds*2.-1.),0.,1.),6.);
      float cloud=smoothstep(.31,.70,mass)*smoothstep(.20,.76,folds);
      float filament=spine*smoothstep(.29,.69,mass)*(.28+.72*grain);
      float web=pow(clamp(1.-abs(grain*2.-1.),0.,1.),9.)*smoothstep(.27,.69,folds);
      float dust=smoothstep(.53,.74,fbm(p*3.15+vec2(8.4,2.1)));
      vec3 color=vec3(.0026,.0028,.0115);
      color+=vec3(.036,.036,.098)*cloud;
      color+=vec3(.108,.082,.196)*cloud*cloud*.86;
      color+=vec3(.184,.158,.325)*filament*.76;
      color+=vec3(.092,.084,.168)*web*(.20+.80*cloud);
      color*=1.-dust*.48;
      vec2 parallax=(uPointer-.5)*vec2(.012,-.008)*uMotion;
      float cluster=fbm(p*.78+vec2(2.6,-3.8));
      float s1=sparseStar(uv+parallax,39.,.958,cluster);
      float s2=sparseStar(uv-parallax*.42+vec2(.21,.13),91.,.993,cluster);
      float rare=sparseStar(uv+parallax*.18+vec2(.47,.31),19.,.975,cluster);
      float densityLift=1.+min(.35,uDensity*.006);
      color+=(s1*vec3(.31,.34,.67)+s2*vec3(.62,.55,.96)+rare*vec3(.92,.86,1.08))*densityLift;
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
        q.x/=1.+abs(c.w)*.34+b.w*.075;
        q.x+=c.w*.045;
        q.y/=1.+b.w*.035;
        float r=length(q);
        if(r<1.17){
          float sphere=1.-smoothstep(.955,1.07,r);
          float z=sqrt(max(0.,1.-min(1.,r*r)));
          vec2 refractUv=vUv+q*.012*(.28+z)*(1.-c.z*.36);
          vec3 refracted=cosmos(refractUv,uTime+13.7+c.y)*vec3(.91,.90,1.13);
          color=mix(color,refracted,sphere*(.69-c.z*.18)*a.w);

          float inner=1.-smoothstep(.25,.68,r);
          vec2 gaze=b.xy;
          vec2 textureUv=q*.455+.5-gaze*inner*.11;
          vec2 blurStep=vec2(.0024+.0022*c.z);
          vec4 sharp=texture2D(uEye,textureUv);
          vec4 soft=(texture2D(uEye,textureUv+vec2(blurStep.x,0.))+texture2D(uEye,textureUv-vec2(blurStep.x,0.))+texture2D(uEye,textureUv+vec2(0.,blurStep.y))+texture2D(uEye,textureUv-vec2(0.,blurStep.y)))*.25;
          vec4 tex=mix(sharp,soft,c.z*.72);
          float lum=max(tex.r,max(tex.g,tex.b));
          float detail=smoothstep(.014+.026*c.z,.12+.09*c.z,lum)*tex.a*sphere;
          vec3 eyeLight=pow(max(tex.rgb,vec3(0.)),vec3(.84))*vec3(.95,.89,1.19);
          color+=eyeLight*detail*(1.46-c.z*.54)*a.w;

          vec2 echoUv=textureUv+vec2(.052*b.w*(.65+.35*z),-.008*b.w);
          vec4 echo=texture2D(uEye,echoUv);
          float echoLum=max(echo.r,max(echo.g,echo.b));
          float echoDetail=smoothstep(.08,.38,echoLum)*echo.a*sphere*b.w;
          color+=pow(echo.rgb,vec3(.82))*echoDetail*.31*a.w;

          vec2 organ=q-gaze*.2;
          float pupil=1.-smoothstep(.17,.235,length(organ));
          color=mix(color,vec3(.0003,.0004,.0025),pupil*sphere*.94*a.w);

          float blink=b.z;
          float lidX=organ.x+blink*.052;
          float membraneGate=1.-smoothstep(.90,1.035,r);
          float arch=.14*(1.-clamp(lidX*lidX*1.65,0.,1.));
          float upperEdge=mix(.79,-.54,blink)+arch+lidX*.052;
          float lowerEdge=mix(-.82,-.53,blink)-arch*.10-lidX*.014;
          float upperCover=smoothstep(upperEdge-.027,upperEdge+.027,organ.y);
          float lowerCover=1.-smoothstep(lowerEdge-.031,lowerEdge+.031,organ.y);
          float membrane=max(upperCover,lowerCover)*membraneGate*smoothstep(.018,.095,blink);
          float membraneNoise=fbm(organ*7.2+vec2(c.y*4.1,uTime*.026));
          vec3 membraneColor=vec3(.007,.006,.026)+vec3(.068,.047,.145)*membraneNoise;
          color=mix(color,membraneColor,membrane*.87*a.w);
          float seam=(1.-smoothstep(.006,.024,abs(organ.y-upperEdge)))*membraneGate*blink;
          color+=seam*vec3(.22,.17,.44)*.42*a.w;

          vec2 fixedUv=q*.455+.5;
          vec4 shell=texture2D(uEye,fixedUv);
          float shellLum=max(shell.r,max(shell.g,shell.b));
          float shellDetail=smoothstep(.15+.06*c.z,.53+.09*c.z,shellLum)*shell.a*sphere;
          color+=pow(shell.rgb,vec3(.76))*shellDetail*(.58-c.z*.18)*a.w;

          float fresnel=pow(1.-z,3.0)*sphere;
          color+=fresnel*vec3(.14,.105,.34)*(.51-c.z*.17)*a.w;
          float rim=(1.-smoothstep(.012,.049,abs(r-.91)))*sphere;
          color+=rim*vec3(.23,.17,.50)*(.26-c.z*.08)*a.w;
          vec2 glintCenter=vec2(-.29+c.w*.06,.34);
          float glint=pow(max(0.,1.-length(q-glintCenter)/.24),3.)*sphere;
          color+=glint*vec3(.52,.46,.88)*(.29-c.z*.12)*a.w;
        }
      }
      float vignette=smoothstep(.38,1.05,length((vUv-.5)*vec2(aspect*.70,1.)));
      color*=1.-vignette*.49;
      color=pow(max(color,vec3(0.)),vec3(.86));
      gl_FragColor=vec4(color,1.);
    }
  `;

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const random = (min, max) => min + Math.random() * (max - min);
  const smooth = value => { const t = clamp(value, 0, 1); return t * t * (3 - 2 * t); };
  const easeOut = value => 1 - Math.pow(1 - clamp(value, 0, 1), 3);
  const lerp = (a, b, t) => a + (b - a) * t;
  const pointer = { x: innerWidth * .5, y: innerHeight * .42 };
  const camera = { x: 0, y: 0, z: 0, scale: 1, targetX: 0, targetY: 0, targetZ: 0, targetScale: 1 };
  const eyes = [];
  const threads = [];
  const queue = [];
  const rituals = [];
  let width = innerWidth, height = innerHeight, dpr = 1, lastTime = performance.now(), worldCount = 0;
  let lastLaunchAt = -Infinity, queueTimer = 0, phaseWave = null, attentionEye = null, attentionBranch = null, lastMother = null, nextEyeId = 1;
  let recognition = null, listeningWanted = false, restarting = false, manualFallback = false;
  let recognizedByIndex = new Map(), voiceResetTimer = 0, voicePulseAt = -Infinity;
  let mediaStream = null, analyser = null, audio = null, soundOn = false, voiceLevel = 0;
  let gl = null, program = null, eyeTexture = null, positionBuffer = null, ready = false;
  const eyeA = new Float32Array(MAX_EYES * 4), eyeB = new Float32Array(MAX_EYES * 4), eyeC = new Float32Array(MAX_EYES * 4);

  function projectWorld(x, y, z, radius = 1) {
    const relativeZ = z - camera.z;
    const perspective = clamp(FOCAL_LENGTH / (FOCAL_LENGTH + relativeZ), .34, 1.62);
    const scale = perspective * camera.scale;
    const depth = clamp((relativeZ + 180) / 1180, 0, 1);
    const parallax = (1 - depth) * .032 - depth * .006;
    return {
      x: width * .5 + (x - width * .5 - camera.x) * scale + (pointer.x - width * .5) * parallax,
      y: height * .5 + (y - height * .5 - camera.y) * scale + (pointer.y - height * .5) * parallax * .64,
      r: radius * scale,
      scale,
      depth,
      relativeZ
    };
  }

  function screenEye(eye) { return projectWorld(eye.homeX, eye.homeY, eye.z, eye.radius); }

  class Eye {
    constructor(x, y, radius, options = {}) {
      this.id = nextEyeId++;
      this.homeX = x; this.homeY = y; this.z = options.z ?? random(-40, 260); this.radius = radius;
      this.opacity = options.opacity ?? random(.74, 1); this.materialDepth = options.materialDepth ?? random(.72, 1.04);
      this.rotation = options.rotation ?? random(-.17, .17); this.yaw = options.yaw ?? random(-.2, .2); this.targetYaw = this.yaw; this.seed = random(0, 1000);
      this.parent = options.parent || null; this.children = []; this.generation = this.parent ? this.parent.generation + 1 : 0; this.createdAt = performance.now(); this.busyUntil = 0;
      this.lookX = 0; this.lookY = 0; this.lookTarget = { x, y }; this.nextThought = performance.now() + random(1800, 5200); this.forced = null;
      this.blinkStart = 0; this.blinkAt = performance.now() + random(2200, 8400); this.blinkAmount = 1;
      this.newborn = !!options.newborn; this.birthOpen = this.newborn ? .04 : 1; this.branchAlpha = this.newborn ? 0 : 1; this.strain = 0;
    }
    lookAt(target, now, delay = 0, duration = 1700) { this.forced = { target, start: now + delay, end: now + delay + duration }; }
    chooseThought(now) {
      const self = screenEye(this), others = displayedEyes().filter(eye => eye !== this && eye.branchAlpha > .7);
      if (others.length && Math.random() < .52) {
        const other = others[Math.floor(Math.random() * others.length)];
        this.lookTarget = () => { const target = screenEye(other); return { x: target.x, y: target.y }; };
      } else {
        const reach = Math.min(width, height) * random(.10, .25);
        const target = { x: clamp(self.x + random(-reach, reach), 60, width - 60), y: clamp(self.y + random(-reach, reach), 55, height - 55) };
        this.lookTarget = () => target;
      }
      this.targetYaw = random(-.24, .24); this.nextThought = now + random(2800, 7200);
    }
    closure(now) {
      if (this.newborn) return 1 - this.birthOpen;
      if (!this.blinkStart) return 0;
      const elapsed = now - this.blinkStart;
      if (elapsed < 78) return easeOut(elapsed / 78) * this.blinkAmount;
      if (elapsed < 112) return this.blinkAmount;
      if (elapsed < 278) return (1 - smooth((elapsed - 112) / 166)) * this.blinkAmount;
      this.blinkStart = 0; this.blinkAt = now + random(2800, 9200); return 0;
    }
    update(now, dt) {
      if (now > this.nextThought && (!this.forced || now > this.forced.end)) this.chooseThought(now);
      if (this.forced && now > this.forced.end) this.forced = null;
      let target = typeof this.lookTarget === 'function' ? this.lookTarget() : this.lookTarget;
      if (this.forced && now >= this.forced.start) target = typeof this.forced.target === 'function' ? this.forced.target() : this.forced.target;
      const self = screenEye(this), dx = target.x - self.x, dy = target.y - self.y, distance = Math.max(1, Math.hypot(dx, dy));
      const reach = Math.min(self.r * .18, distance * .078), response = 1 - Math.pow(.86, dt / 16.67);
      this.lookX += (dx / distance * reach - this.lookX) * response; this.lookY += (dy / distance * reach - this.lookY) * response;
      this.yaw += (this.targetYaw - this.yaw) * (1 - Math.pow(.975, dt / 16.67));
      if (!this.newborn && !this.blinkStart && now >= this.blinkAt && !isActiveMother(this)) { this.blinkAmount = Math.random() < .19 ? random(.62, .79) : 1; this.blinkStart = now; }
    }
  }

  function isActiveMother(eye) { return rituals.some(ritual => ritual.mother === eye && !ritual.done); }
  function compile(type, source) { const shader = gl.createShader(type); gl.shaderSource(shader, source); gl.compileShader(shader); if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) { const message = gl.getShaderInfoLog(shader); gl.deleteShader(shader); throw new Error(message); } return shader; }
  function initializeWebGL(image) {
    gl = canvas.getContext('webgl', { alpha: false, antialias: false, premultipliedAlpha: false, powerPreference: 'high-performance' });
    if (!gl) throw new Error('WebGL unavailable');
    const vertex = compile(gl.VERTEX_SHADER, VERTEX_SHADER), fragment = compile(gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
    program = gl.createProgram(); gl.attachShader(program, vertex); gl.attachShader(program, fragment); gl.linkProgram(program); gl.deleteShader(vertex); gl.deleteShader(fragment);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
    positionBuffer = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
    eyeTexture = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, eyeTexture); gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image); ready = true; seedWorld();
  }
  function seedWorld() {
    if (eyes.length) return;
    const base = Math.min(width, height);
    const origin = new Eye(width * .27, height * .39, base * .215, { opacity: .99, z: -72, materialDepth: 1, rotation: -.025, yaw: -.05 });
    const upper = new Eye(width * .77, height * .27, base * .108, { opacity: .82, z: 285, materialDepth: .83, rotation: .12, yaw: .14, parent: origin });
    const lower = new Eye(width * .75, height * .72, base * .084, { opacity: .78, z: 112, materialDepth: .72, rotation: -.13, yaw: -.16, parent: origin });
    origin.children.push(upper, lower); eyes.push(origin, upper, lower); threads.push(makeThread(origin, upper, 0), makeThread(origin, lower, 0)); attentionEye = origin; attentionBranch = origin;
  }
  function makeThread(parent, child, bornAt) { return { a: parent, b: child, bornAt, forming: bornAt > 0, seed: random(0, 1000) }; }
  function displayedEyes() {
    const active = eyes.filter(eye => { if (eye.branchAlpha <= .005) return false; const screen = screenEye(eye); return screen.x + screen.r * 1.3 > 0 && screen.x - screen.r * 1.3 < width && screen.y + screen.r * 1.3 > 0 && screen.y - screen.r * 1.3 < height; });
    const selected = active.length <= MAX_EYES ? active : [active[0], ...active.slice(-(MAX_EYES - 1))]; return selected.sort((a, b) => b.z - a.z);
  }
  function resize() {
    const oldWidth = width, oldHeight = height; width = innerWidth; height = innerHeight;
    if (eyes.length && oldWidth > 0 && oldHeight > 0 && (oldWidth !== width || oldHeight !== height)) { const sx = width / oldWidth, sy = height / oldHeight; eyes.forEach(eye => { eye.homeX *= sx; eye.homeY *= sy; eye.radius *= Math.min(sx, sy); }); camera.x *= sx; camera.y *= sy; camera.targetX *= sx; camera.targetY *= sy; }
    dpr = Math.min(devicePixelRatio || 1, 2);
    for (const target of [canvas, networkCanvas, networkFrontCanvas]) { target.width = Math.round(width * dpr); target.height = Math.round(height * dpr); target.style.width = `${width}px`; target.style.height = `${height}px`; }
    network.setTransform(dpr, 0, 0, dpr, 0, 0); networkFront.setTransform(dpr, 0, 0, dpr, 0, 0);
    const rect = waveCanvas.getBoundingClientRect(); waveCanvas.width = Math.max(1, Math.round(rect.width * dpr)); waveCanvas.height = Math.max(1, Math.round(rect.height * dpr)); waveContext.setTransform(dpr, 0, 0, dpr, 0, 0); if (gl) gl.viewport(0, 0, canvas.width, canvas.height);
  }
  function fillEyeUniforms(now) {
    eyeA.fill(0); eyeB.fill(0); eyeC.fill(0); const visible = displayedEyes();
    visible.forEach((eye, index) => { const offset = index * 4, screen = screenEye(eye), depthOpacity = 1 - screen.depth * .26; eyeA.set([screen.x / width, 1 - screen.y / height, screen.r / height, eye.opacity * eye.branchAlpha * depthOpacity], offset); eyeB.set([eye.lookX / Math.max(1, screen.r), -eye.lookY / Math.max(1, screen.r), eye.closure(now), eye.strain], offset); eyeC.set([eye.rotation, eye.seed * .001, screen.depth, eye.yaw], offset); }); return visible.length;
  }
  function renderScene(now) {
    if (!ready) return;
    gl.useProgram(program); gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer); const position = gl.getAttribLocation(program, 'aPosition'); gl.enableVertexAttribArray(position); gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, eyeTexture); gl.uniform1i(gl.getUniformLocation(program, 'uEye'), 0); gl.uniform2f(gl.getUniformLocation(program, 'uResolution'), canvas.width, canvas.height); gl.uniform2f(gl.getUniformLocation(program, 'uPointer'), pointer.x / width, 1 - pointer.y / height); gl.uniform1f(gl.getUniformLocation(program, 'uTime'), now * .001); gl.uniform1f(gl.getUniformLocation(program, 'uMotion'), reducedMotion ? 0 : 1); gl.uniform1f(gl.getUniformLocation(program, 'uDensity'), worldCount); gl.uniform1i(gl.getUniformLocation(program, 'uEyeCount'), fillEyeUniforms(now)); gl.uniform4fv(gl.getUniformLocation(program, 'uEyeA[0]'), eyeA); gl.uniform4fv(gl.getUniformLocation(program, 'uEyeB[0]'), eyeB); gl.uniform4fv(gl.getUniformLocation(program, 'uEyeC[0]'), eyeC); gl.drawArrays(gl.TRIANGLES, 0, 6);
  }
  function surfacePoint(a, b, amount = .82) { const dx = b.x - a.x, dy = b.y - a.y, distance = Math.max(1, Math.hypot(dx, dy)); return { x: a.x + dx / distance * a.r * amount, y: a.y + dy / distance * a.r * amount }; }
  function curvePoint(start, control, end, t) { const inv = 1 - t; return { x: inv * inv * start.x + 2 * inv * t * control.x + t * t * end.x, y: inv * inv * start.y + 2 * inv * t * control.y + t * t * end.y }; }
  function curveGeometry(thread) {
    const a = screenEye(thread.a), b = screenEye(thread.b), start = surfacePoint(a, b, .81), end = surfacePoint(b, a, .81), dx = end.x - start.x, dy = end.y - start.y, distance = Math.max(1, Math.hypot(dx, dy)), nx = -dy / distance, ny = dx / distance;
    const direction = Math.sin(thread.seed * 1.71) > 0 ? 1 : -1, depthBend = clamp((thread.b.z - thread.a.z) * .08, -42, 42), bend = Math.min(118, distance * .20) * direction;
    return { a, b, start, end, control: { x: (start.x + end.x) * .5 + nx * bend, y: (start.y + end.y) * .5 + ny * bend - depthBend }, nx, ny, distance };
  }
  function traceQuadratic(context, geometry, progress, offset = 0) {
    const start = { x: geometry.start.x + geometry.nx * offset, y: geometry.start.y + geometry.ny * offset }, control = { x: geometry.control.x + geometry.nx * offset, y: geometry.control.y + geometry.ny * offset }, end = { x: geometry.end.x + geometry.nx * offset, y: geometry.end.y + geometry.ny * offset }, t = clamp(progress, 0, 1), partialControl = { x: lerp(start.x, control.x, t), y: lerp(start.y, control.y, t) }, partialEnd = curvePoint(start, control, end, t);
    context.beginPath(); context.moveTo(start.x, start.y); context.quadraticCurveTo(partialControl.x, partialControl.y, partialEnd.x, partialEnd.y); context.stroke(); return partialEnd;
  }
  function branchHead(eye) { if (!eye) return null; let current = eye; while (current.parent && current.parent.parent) current = current.parent; return current; }
  function isInAttentionBranch(eye) { if (!attentionBranch) return false; return branchHead(eye) === attentionBranch || eye === attentionBranch; }
  function drawThreads(now, visible) {
    const displayed = new Set(visible); network.save(); network.globalCompositeOperation = 'screen'; let phaseBoost = 0;
    if (phaseWave) { const phaseAge = (now - phaseWave.at) / 1150; if (phaseAge >= 1) phaseWave = null; else if (phaseAge >= 0) phaseBoost = Math.sin(Math.PI * phaseAge) * .11; }
    for (const thread of threads) {
      if (!displayed.has(thread.a) || !displayed.has(thread.b)) continue;
      const geometry = curveGeometry(thread), age = thread.bornAt ? smooth((now - thread.bornAt) / 560) : 1, depth = (geometry.a.depth + geometry.b.depth) * .5, focused = isInAttentionBranch(thread.a) || isInAttentionBranch(thread.b), active = thread.forming || rituals.some(ritual => ritual.mother === thread.a && ritual.newborn === thread.b && !ritual.done), base = ((active ? .38 : focused ? .15 : .078) + phaseBoost) * (1 - depth * .52);
      network.save(); network.lineCap = 'round'; network.strokeStyle = `rgba(82,67,177,${(active ? .052 : .027) * (1 - depth * .4)})`; network.lineWidth = active ? 32 : 23; network.shadowColor = 'rgba(100,78,226,.21)'; network.shadowBlur = active ? 25 : 18; traceQuadratic(network, geometry, age); network.restore();
      for (let strand = -2; strand <= 2; strand++) { const core = strand === 0, offset = strand * (1.9 + Math.min(2.8, geometry.distance / 170)); network.strokeStyle = `rgba(${core ? '168,151,255' : '111,94,213'},${base * (core ? 1 : .29)})`; network.lineWidth = core ? (active ? 1.28 : .72) : .38; traceQuadratic(network, geometry, age, offset); }
      if (active) { const progress = clamp((now - thread.bornAt) / Math.max(1, TIMING.branch - TIMING.still), 0, 1), head = curvePoint(geometry.start, geometry.control, geometry.end, progress), glow = network.createRadialGradient(head.x, head.y, 0, head.x, head.y, 15); glow.addColorStop(0, 'rgba(247,243,255,.95)'); glow.addColorStop(.2, 'rgba(178,158,255,.72)'); glow.addColorStop(1, 'rgba(96,70,224,0)'); network.fillStyle = glow; network.beginPath(); network.arc(head.x, head.y, 15, 0, Math.PI * 2); network.fill(); }
    }
    network.restore(); network.save(); network.globalCompositeOperation = 'destination-out'; network.fillStyle = '#000';
    for (const eye of visible) { const screen = screenEye(eye); network.beginPath(); network.arc(screen.x, screen.y, screen.r * .79, 0, Math.PI * 2); network.fill(); }
    network.restore();
  }
  function drawWraps(now, visible) {
    const displayed = new Set(visible); networkFront.save(); networkFront.globalCompositeOperation = 'screen'; networkFront.lineCap = 'round';
    for (const thread of threads) {
      if (!displayed.has(thread.a) || !displayed.has(thread.b)) continue;
      const geometry = curveGeometry(thread), age = thread.bornAt ? smooth((now - thread.bornAt) / 560) : 1; if (age < .18) continue;
      const active = thread.forming, focused = isInAttentionBranch(thread.a) || isInAttentionBranch(thread.b), alpha = active ? .45 : focused ? .18 : .08;
      for (const item of [{ eye: geometry.a, toward: geometry.b }, { eye: geometry.b, toward: geometry.a }]) { const angle = Math.atan2(item.toward.y - item.eye.y, item.toward.x - item.eye.x); networkFront.strokeStyle = `rgba(162,145,250,${alpha * (1 - item.eye.depth * .45)})`; networkFront.lineWidth = active ? 1.05 : .48; networkFront.beginPath(); networkFront.arc(item.eye.x, item.eye.y, item.eye.r * .815, angle - .23, angle + .23); networkFront.stroke(); }
    }
    networkFront.restore();
  }
  function drawVoiceSignal(now) {
    networkFront.save(); networkFront.globalCompositeOperation = 'screen';
    for (const ritual of rituals) {
      const elapsed = now - ritual.startedAt, mother = screenEye(ritual.mother);
      if (elapsed <= TIMING.signal) {
        const progress = easeOut(elapsed / TIMING.signal), dock = voicePanel.getBoundingClientRect(), origin = { x: dock.left + 31, y: dock.top + 31 }, end = surfacePoint(mother, origin, .82), control = { x: (origin.x + end.x) * .5 + 44, y: (origin.y + end.y) * .5 - 28 }, head = curvePoint(origin, control, end, progress), tail = curvePoint(origin, control, end, Math.max(0, progress - .34)), gradient = networkFront.createLinearGradient(tail.x, tail.y, head.x, head.y);
        gradient.addColorStop(0, 'rgba(116,87,235,0)'); gradient.addColorStop(.72, 'rgba(166,145,255,.62)'); gradient.addColorStop(1, 'rgba(248,244,255,.98)'); networkFront.strokeStyle = gradient; networkFront.lineWidth = 1.55; networkFront.beginPath(); networkFront.moveTo(tail.x, tail.y); networkFront.quadraticCurveTo((tail.x + head.x) * .5 + 8, (tail.y + head.y) * .5 - 6, head.x, head.y); networkFront.stroke();
        const glow = networkFront.createRadialGradient(head.x, head.y, 0, head.x, head.y, 19); glow.addColorStop(0, 'rgba(250,247,255,.98)'); glow.addColorStop(.2, 'rgba(185,167,255,.76)'); glow.addColorStop(1, 'rgba(95,65,220,0)'); networkFront.fillStyle = glow; networkFront.beginPath(); networkFront.arc(head.x, head.y, 19, 0, Math.PI * 2); networkFront.fill();
      }
      if (elapsed >= TIMING.signal && elapsed <= TIMING.still) { const hold = smooth((elapsed - TIMING.signal) / (TIMING.still - TIMING.signal)), radius = mother.r * (.88 + hold * .035); networkFront.strokeStyle = `rgba(197,184,255,${.13 + Math.sin(hold * Math.PI) * .22})`; networkFront.lineWidth = .75; networkFront.beginPath(); networkFront.arc(mother.x, mother.y, radius, -.58, .82); networkFront.stroke(); }
    }
    networkFront.restore();
  }
  function drawNetwork(now) { network.clearRect(0, 0, width, height); networkFront.clearRect(0, 0, width, height); const visible = displayedEyes(); drawThreads(now, visible); drawWraps(now, visible); drawVoiceSignal(now); }
  function drawWaveform(now) {
    const cssWidth = waveCanvas.width / dpr, cssHeight = waveCanvas.height / dpr; waveContext.clearRect(0, 0, cssWidth, cssHeight); const gradient = waveContext.createLinearGradient(0, 0, cssWidth, 0); gradient.addColorStop(0, 'rgba(116,96,224,0)'); gradient.addColorStop(.14, 'rgba(158,139,255,.48)'); gradient.addColorStop(.5, 'rgba(224,216,255,.9)'); gradient.addColorStop(.86, 'rgba(158,139,255,.48)'); gradient.addColorStop(1, 'rgba(116,96,224,0)'); waveContext.strokeStyle = gradient; waveContext.lineWidth = 1.15; waveContext.beginPath(); let level = 0;
    if (analyser) { const data = new Uint8Array(analyser.fftSize); analyser.getByteTimeDomainData(data); for (let index = 0; index < data.length; index++) { const normalized = (data[index] - 128) / 128; level += normalized * normalized; const x = index / (data.length - 1) * cssWidth, y = cssHeight * .5 + normalized * cssHeight * .42; if (index === 0) waveContext.moveTo(x, y); else waveContext.lineTo(x, y); } voiceLevel = Math.sqrt(level / data.length); }
    else { const pulse = clamp(1 - (now - voicePulseAt) / 420, 0, 1); for (let index = 0; index <= 180; index++) { const t = index / 180, envelope = Math.exp(-Math.pow((t - .55) * 7, 2)), wave = Math.sin(t * 88) * envelope * pulse, x = t * cssWidth, y = cssHeight * .5 + wave * cssHeight * .34; if (index === 0) waveContext.moveTo(x, y); else waveContext.lineTo(x, y); } voiceLevel *= .9; }
    waveContext.stroke(); if (analyser && voiceLevel > .028 && root.dataset.state === 'listening') setVoiceState('hearing', '听到声音', '正在识别…');
  }
  function setVoiceState(state, label, hint = '') { root.dataset.state = state; voiceStateNode.textContent = label; transcriptNode.textContent = hint; microphoneIcon.src = state === 'denied' ? 'assets/tabler-microphone-off.svg' : 'assets/tabler-microphone.svg'; let ariaLabel = '开启麦克风'; if (manualFallback || state === 'fallback') ariaLabel = '点击发出 hey'; else if (listeningWanted) ariaLabel = '停止聆听'; listenButton.setAttribute('aria-label', ariaLabel); }
  function resetVoiceSoon(delay = 760) { clearTimeout(voiceResetTimer); voiceResetTimer = setTimeout(() => { if (listeningWanted) setVoiceState('listening', '正在听…', '说出 hey'); else if (!manualFallback) setVoiceState('idle', '让它们听见你', '麦克风未开启'); }, delay); }
  function nearestEyeToPointer(candidates = displayedEyes()) { let winner = null, best = Infinity; for (const eye of candidates) { const screen = screenEye(eye), distance = Math.hypot(pointer.x - screen.x, pointer.y - screen.y) / Math.max(42, screen.r); if (distance < best) { best = distance; winner = eye; } } return winner; }
  function branchForAttention(anchor) { if (!anchor) return null; if (anchor.parent) return branchHead(anchor); if (!anchor.children.length) return anchor; return nearestEyeToPointer(anchor.children) || anchor; }
  function isDescendantOf(eye, ancestor) { let current = eye; while (current) { if (current === ancestor) return true; current = current.parent; } return false; }
  function selectMother(now) {
    const visible = displayedEyes(), busy = new Set(rituals.flatMap(item => [item.mother, item.newborn]).filter(Boolean)), eligible = visible.filter(eye => !busy.has(eye) && !eye.newborn && eye.branchAlpha > .92 && eye.busyUntil <= now), fallback = eligible.length ? eligible : visible.filter(eye => !eye.newborn), anchor = nearestEyeToPointer(fallback);
    if (!anchor || worldCount < 8) return anchor || visible[0];
    const branch = branchForAttention(anchor); let candidates = fallback.filter(eye => isDescendantOf(eye, branch) && eye.children.length === 0); if (!candidates.length) candidates = fallback.filter(eye => isDescendantOf(eye, branch));
    if (worldCount >= 21) { const band = candidates.filter(eye => Math.abs(eye.z - anchor.z) < 260); if (band.length) candidates = band; }
    if (worldCount >= 55) { const deepestGeneration = Math.max(...candidates.map(eye => eye.generation)); candidates = candidates.filter(eye => eye.generation >= deepestGeneration - 1); }
    return nearestEyeToPointer(candidates) || anchor;
  }
  function spawnVolume(mother) {
    const base = Math.min(width, height), visible = displayedEyes(), childRadius = clamp(mother.radius * random(.64, .79), base * .052, base * .14); let best = null, bestScore = -Infinity;
    for (let index = 0; index < 48; index++) {
      const angle = random(-Math.PI, Math.PI);
      const distance = base * random(.19, worldCount < 8 ? .30 : .25) / Math.max(.62, camera.scale);
      const depthBias = worldCount >= 21 ? .68 : .55;
      const depthSign = Math.random() < depthBias ? 1 : -1;
      const zDelta = depthSign * base * random(.17, .46);
      const point = {
        x: clamp(mother.homeX + Math.cos(angle) * distance, -base * .10, width + base * .10),
        y: clamp(mother.homeY + Math.sin(angle) * distance * .78, -base * .06, height * .85),
        z: clamp(mother.z + zDelta, -230, 1160 + worldCount * 9),
        radius: childRadius
      };
      const projected = projectWorld(point.x, point.y, point.z, childRadius);
      const gap = visible.reduce((value, eye) => {
        const other = screenEye(eye);
        return Math.min(value, Math.hypot(projected.x - other.x, projected.y - other.y) - (projected.r + other.r) * .72);
      }, Infinity);
      const edge = Math.min(projected.x + projected.r * .45, width - projected.x + projected.r * .45, projected.y + projected.r * .45, height * .84 - projected.y + projected.r * .45);
      const overlapPenalty = gap < 16 ? (16 - gap) * 4.2 : 0;
      const headerPenalty = projected.y - projected.r < 94 && projected.x + projected.r > width * .72 ? 190 : 0;
      const dockPenalty = projected.y + projected.r > height * .72 && projected.x > width * .24 && projected.x < width * .76 ? 150 : 0;
      const depthSeparation = Math.min(180, Math.abs(zDelta)) * .18;
      const score = gap * 1.65 + Math.min(74, edge) + depthSeparation - overlapPenalty - headerPenalty - dockPenalty + random(-8, 8);
      if (score > bestScore) { best = point; bestScore = score; }
    }
    return best || { x: mother.homeX + base * .23, y: mother.homeY - base * .12, z: mother.z + base * .28, radius: childRadius };
  }
  function receiveHey(source = 'voice', spoken = 'hey') { queue.push({ source, spoken, at: performance.now() }); voicePulseAt = performance.now(); const waiting = queue.length + rituals.filter(item => !item.committed).length; setVoiceState('accepted', '听见了', waiting > 1 ? `已接收 ×${waiting}` : '正在定位分支'); status.textContent = `已接收 ${waiting} 声 hey。`; ensureAudio(); playCue('heard', attentionEye || eyes[0]); scheduleRitualPump(); }
  function scheduleRitualPump() { if (!queue.length || queueTimer) return; const delay = Math.max(0, TIMING.launchGap - (performance.now() - lastLaunchAt)); queueTimer = setTimeout(() => { queueTimer = 0; startRitual(); if (queue.length) scheduleRitualPump(); }, delay); }
  function startRitual() {
    if (!queue.length || !eyes.length) return; const now = performance.now(), signal = queue.shift(), mother = selectMother(now), target = spawnVolume(mother), ritual = { startedAt: now, signal, mother, target, origin: { x: mother.homeX, y: mother.homeY, z: mother.z }, newborn: null, committed: false, done: false };
    rituals.push(ritual); lastLaunchAt = now; lastMother = mother; mother.busyUntil = now + TIMING.settled; attentionEye = mother; attentionBranch = branchForAttention(mother); root.dataset.process = 'branch'; setVoiceState('accepted', '听见了', '分支已锁定');
    displayedEyes().forEach(eye => eye.lookAt(() => { const targetEye = screenEye(mother); return { x: targetEye.x, y: targetEye.y }; }, now, random(22, 118), 820)); mother.lookAt(() => pointer, now, 0, 1180); mother.targetYaw = clamp((pointer.x - screenEye(mother).x) / Math.max(1, screenEye(mother).r) * .16, -.28, .28);
    const midpointX = (mother.homeX + target.x) * .5, midpointY = (mother.homeY + target.y) * .5; camera.targetX = lerp(camera.targetX, (midpointX - width * .5) * .15, .52); camera.targetY = lerp(camera.targetY, (midpointY - height * .5) * .12, .52); camera.targetZ = clamp(camera.targetZ + (target.z > mother.z ? 22 : 9), -20, 460); playCue('focus', mother);
  }
  function createChild(ritual, now) {
    if (ritual.newborn) return; const mother = ritual.mother, child = new Eye(ritual.origin.x, ritual.origin.y, ritual.target.radius, { newborn: true, opacity: mother.opacity * random(.88, .97), materialDepth: clamp(mother.materialDepth + random(-.08, .08), .68, 1.05), rotation: mother.rotation + random(-.16, .16), yaw: mother.yaw + random(-.12, .12), z: ritual.origin.z, parent: mother }); child.lookX = mother.lookX; child.lookY = mother.lookY; mother.children.push(child); eyes.push(child); const thread = makeThread(mother, child, now); threads.push(thread); ritual.newborn = child; ritual.thread = thread; setVoiceState('accepted', '正在分裂', '新的现实正在穿过母体'); playCue('birth', mother);
  }
  function updateDensity(now) {
    const occupancy = displayedEyes().reduce((sum, eye) => { const screen = screenEye(eye); return sum + Math.PI * screen.r * screen.r; }, 0) / Math.max(1, width * height); let density = 'sparse', scale = 1;
    if (worldCount >= 55 || occupancy > .48) { density = 'deep'; scale = .68; } else if (worldCount >= 21 || occupancy > .36) { density = 'constellation'; scale = .76; } else if (worldCount >= 8 || occupancy > .25) { density = 'family'; scale = .89; }
    const changed = root.dataset.density !== density; root.dataset.density = density; camera.targetScale = Math.max(.61, scale - Math.max(0, worldCount - 55) * .0009); if (changed && density !== 'sparse') phaseWave = { at: now, density };
  }
  function commitRitual(ritual, now) { if (ritual.committed) return; ritual.committed = true; worldCount++; countNode.textContent = String(worldCount).padStart(2, '0'); ritual.newborn.newborn = false; ritual.newborn.birthOpen = 1; ritual.newborn.lookAt(() => pointer, now, 22, 1120); ritual.thread.forming = false; attentionEye = ritual.newborn; attentionBranch = branchHead(ritual.newborn); status.textContent = `第 ${worldCount} 个新现实已经形成，并与母世界保持连接。`; setVoiceState('accepted', '新世界已回应', `现实 ${String(worldCount).padStart(2, '0')} · 连接已建立`); playCue('open', ritual.newborn); updateDensity(now); resetVoiceSoon(680); }
  function updateRituals(now) {
    const timeScale = reducedMotion ? 5 : 1;
    for (const ritual of rituals) { const elapsed = (now - ritual.startedAt) * timeScale, mother = ritual.mother; if (elapsed < TIMING.signal) { mother.strain = easeOut(elapsed / TIMING.signal) * .26; continue; } if (elapsed < TIMING.still) { mother.strain = .26 + smooth((elapsed - TIMING.signal) / (TIMING.still - TIMING.signal)) * .12; continue; } createChild(ritual, now); const child = ritual.newborn, progress = clamp((elapsed - TIMING.still) / (TIMING.branch - TIMING.still), 0, 1), travel = smooth(progress), tension = Math.sin(Math.PI * progress), dx = ritual.target.x - ritual.origin.x, dy = ritual.target.y - ritual.origin.y, distance = Math.max(1, Math.hypot(dx, dy)), normalX = -dy / distance, normalY = dx / distance, arc = Math.sin(Math.PI * travel) * Math.min(42, distance * .14) * (Math.sin(child.seed) > 0 ? 1 : -1); mother.strain = .12 + tension * .64; child.homeX = lerp(ritual.origin.x, ritual.target.x, travel) + normalX * arc; child.homeY = lerp(ritual.origin.y, ritual.target.y, travel) + normalY * arc; child.z = lerp(ritual.origin.z, ritual.target.z, travel); child.branchAlpha = smooth((elapsed - TIMING.still + 32) / 190); child.birthOpen = clamp((elapsed - TIMING.still) / 350, .04, 1); if (elapsed >= TIMING.branch) commitRitual(ritual, now); if (elapsed >= TIMING.settled) { mother.strain = 0; ritual.done = true; } }
    for (let index = rituals.length - 1; index >= 0; index--) if (rituals[index].done) rituals.splice(index, 1); root.dataset.process = rituals.length ? 'branch' : 'idle';
  }
  function normalizedHeyCount(text) { const value = text.toLowerCase().replace(/[.,!?;:。，！？]/g, ' '), english = value.match(/\b(?:h+e+y+|hei+|hai+|hay+|hi+|he)\b/g) || [], chinese = value.match(/[嗨嘿]/g) || []; return english.length + chinese.length; }
  function bestAlternative(result) { let best = result[0], bestCount = normalizedHeyCount(best?.transcript || ''); for (let index = 1; index < result.length; index++) { const candidate = result[index], count = normalizedHeyCount(candidate.transcript || ''); if (count > bestCount || (count === bestCount && (candidate.confidence || 0) > (best?.confidence || 0))) { best = candidate; bestCount = count; } } return { alternative: best, count: bestCount }; }
  function setupRecognition() {
    if (!SpeechRecognition) return false; recognition = new SpeechRecognition(); recognition.continuous = true; recognition.interimResults = true; recognition.maxAlternatives = 10; recognition.lang = 'en-US';
    recognition.onstart = () => { restarting = false; recognizedByIndex = new Map(); setVoiceState('listening', '正在听…', '说出 hey'); }; recognition.onsoundstart = () => setVoiceState('hearing', '听到声音', '正在识别…'); recognition.onspeechstart = () => setVoiceState('hearing', '听到声音', '正在识别…'); recognition.onspeechend = () => { if (root.dataset.state === 'hearing') setVoiceState('hearing', '正在识别', transcriptNode.textContent); };
    recognition.onresult = event => { for (let index = event.resultIndex; index < event.results.length; index++) { const result = event.results[index], { alternative, count } = bestAlternative(result), spoken = (alternative?.transcript || '').trim(), accepted = recognizedByIndex.get(index) || 0; if (!result.isFinal) setVoiceState('hearing', count ? '识别到 hey' : '正在识别', spoken || '…'); if (count > accepted) { recognizedByIndex.set(index, count); for (let item = accepted; item < count; item++) receiveHey('voice', spoken || 'hey'); } if (result.isFinal && count === 0 && accepted === 0) { setVoiceState('listening', '没有听清 hey', spoken || '请再说一次'); resetVoiceSoon(1150); } } };
    recognition.onnomatch = () => { setVoiceState('listening', '没有听清 hey', '请再说一次'); resetVoiceSoon(1150); }; recognition.onerror = event => { if (event.error === 'not-allowed' || event.error === 'service-not-allowed') { listeningWanted = false; manualFallback = false; setVoiceState('denied', '无法使用麦克风', '点击重试'); listenButton.disabled = false; } else if (event.error !== 'no-speech' && event.error !== 'aborted') { listeningWanted = false; manualFallback = true; setVoiceState('fallback', '语音识别不可用', '点击麦克风发出 hey'); listenButton.disabled = false; } }; recognition.onend = () => { if (!listeningWanted || restarting) return; restarting = true; setTimeout(() => { try { recognition.start(); } catch (_) { restarting = false; } }, 180); }; return true;
  }
  async function startMicrophone() {
    listenButton.disabled = true; manualFallback = false; setVoiceState('requesting', '正在等待麦克风权限', ''); ensureAudio();
    try { if (!navigator.mediaDevices?.getUserMedia) throw new Error('mediaDevices unavailable'); mediaStream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 } }); const source = audio.ctx.createMediaStreamSource(mediaStream); analyser = audio.ctx.createAnalyser(); analyser.fftSize = 1024; analyser.smoothingTimeConstant = .42; source.connect(analyser); listeningWanted = true; listenButton.disabled = false; if (!recognition && !setupRecognition()) { listeningWanted = false; manualFallback = true; setVoiceState('fallback', '语音识别不可用', '点击麦克风发出 hey'); return; } try { recognition.start(); } catch (_) { setVoiceState('listening', '正在听…', '说出 hey'); } }
    catch (_) { listeningWanted = false; manualFallback = false; listenButton.disabled = false; setVoiceState('denied', '无法使用麦克风', '点击重试'); }
  }
  function stopMicrophone() { listeningWanted = false; manualFallback = false; if (recognition) { try { recognition.stop(); } catch (_) {} } if (mediaStream) { mediaStream.getTracks().forEach(track => track.stop()); mediaStream = null; } analyser = null; setVoiceState('idle', '让它们听见你', '麦克风未开启'); }
  function ensureAudio() { if (audio) { if (audio.ctx.state === 'suspended') audio.ctx.resume(); return; } const AudioContext = window.AudioContext || window.webkitAudioContext; if (!AudioContext) return; const context = new AudioContext(), master = context.createGain(); master.gain.value = soundOn ? .15 : 0; master.connect(context.destination); audio = { ctx: context, master }; }
  function playCue(kind, eye) { if (!soundOn || !audio || !eye) return; const context = audio.ctx, now = context.currentTime, oscillator = context.createOscillator(), gain = context.createGain(), panner = context.createStereoPanner ? context.createStereoPanner() : null, frequency = { heard: [360, 250], focus: [142, 185], birth: [82, 176], open: [178, 470] }[kind] || [110, 230]; oscillator.type = kind === 'heard' ? 'sine' : 'triangle'; oscillator.frequency.setValueAtTime(frequency[0], now); oscillator.frequency.exponentialRampToValueAtTime(frequency[1], now + .52); gain.gain.setValueAtTime(.0001, now); gain.gain.exponentialRampToValueAtTime(.046, now + .035); gain.gain.exponentialRampToValueAtTime(.0001, now + .64); oscillator.connect(gain); if (panner) { gain.connect(panner); panner.pan.value = clamp((screenEye(eye).x / width - .5) * 1.6, -1, 1); panner.connect(audio.master); } else gain.connect(audio.master); oscillator.start(now); oscillator.stop(now + .66); }
  function updateAttention() { if (rituals.length) return; const next = nearestEyeToPointer(); if (next) { attentionEye = next; attentionBranch = branchForAttention(next); } }
  function updateCamera(dt) { const response = 1 - Math.pow(.94, dt / 16.67); camera.x += (camera.targetX - camera.x) * response; camera.y += (camera.targetY - camera.y) * response; camera.z += (camera.targetZ - camera.z) * response; camera.scale += (camera.targetScale - camera.scale) * response; }
  function frame(now) { const dt = Math.min(40, now - lastTime); lastTime = now; updateRituals(now); updateCamera(dt); eyes.forEach(eye => eye.update(now, dt)); renderScene(now); drawNetwork(now); drawWaveform(now); requestAnimationFrame(frame); }
  listenButton.addEventListener('click', () => { if (manualFallback) { receiveHey('manual', 'hey'); return; } if (listeningWanted) stopMicrophone(); else startMicrophone(); });
  soundButton.addEventListener('click', () => { ensureAudio(); soundOn = !soundOn; soundButton.setAttribute('aria-pressed', String(soundOn)); soundButton.setAttribute('aria-label', soundOn ? '关闭声音' : '开启声音'); soundIcon.src = soundOn ? 'assets/tabler-volume.svg' : 'assets/tabler-volume-off.svg'; if (audio) audio.master.gain.setTargetAtTime(soundOn ? .15 : 0, audio.ctx.currentTime, .08); });
  root.addEventListener('pointermove', event => { pointer.x = event.clientX; pointer.y = event.clientY; root.dataset.input = event.pointerType === 'touch' ? 'touch' : 'pointer'; updateAttention(); });
  addEventListener('resize', resize); document.addEventListener('visibilitychange', () => { if (document.hidden) stopMicrophone(); });
  root.dataset.density = 'sparse'; resize();
  const eyeImage = new Image(); eyeImage.decoding = 'async'; eyeImage.onload = () => { try { initializeWebGL(eyeImage); resize(); } catch (error) { console.error(error); setVoiceState('fallback', '视觉渲染暂时不可用', '请更新浏览器'); } }; eyeImage.onerror = () => setVoiceState('fallback', '眼睛素材加载失败', '请刷新页面'); eyeImage.src = 'assets/eye-orb-source-cutout.png'; requestAnimationFrame(frame);
  const qaParams = new URLSearchParams(location.search);
  const qaDemo = qaParams.get('demo');
  const qaDelay = Math.max(0, Number(qaParams.get('demoDelay')) || 520);
  if (qaDemo === 'hey') setTimeout(() => receiveHey('test', 'hey'), qaDelay);
  if (qaDemo === 'depth') setTimeout(() => { pointer.x = width * .77; pointer.y = height * .27; updateAttention(); receiveHey('test', 'hey'); }, qaDelay);
  if (qaDemo === 'triple') setTimeout(() => { for (let index = 0; index < 3; index++) setTimeout(() => receiveHey('test', 'hey'), index * 100); }, qaDelay);
  if (qaDemo === 'density') setTimeout(() => { for (let index = 0; index < 8; index++) setTimeout(() => receiveHey('test', 'hey'), index * 55); }, qaDelay);
  window.eyeMultiverse = Object.freeze({ sayHey: (count = 1) => { for (let index = 0; index < count; index++) setTimeout(() => receiveHey('test', 'hey'), index * 100); }, aimAt: id => { const eye = eyes.find(item => item.id === Number(id)); if (eye) { const screen = screenEye(eye); pointer.x = screen.x; pointer.y = screen.y; updateAttention(); } }, get count() { return worldCount; }, get process() { return rituals.length ? 'branch' : 'idle'; }, get active() { return rituals.length; }, get eyes() { return eyes.length; }, get threads() { return threads.length; }, get stage() { return root.dataset.density; }, get selectedMother() { return lastMother?.id || null; }, get depthRange() { return eyes.reduce((range, eye) => [Math.min(range[0], eye.z), Math.max(range[1], eye.z)], [Infinity, -Infinity]); }, timing: TIMING });
})();
