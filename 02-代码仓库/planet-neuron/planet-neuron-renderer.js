(() => {
  "use strict";

  const SOURCE_WIDTH = 1672;
  const SOURCE_HEIGHT = 941;
  const INITIAL_ZOOM = 1.08;
  const MAX_EVENTS = 4;

  const VERTEX_SHADER = `#version 300 es
    precision highp float;
    out vec2 vUv;

    void main() {
      vec2 points[3] = vec2[](
        vec2(-1.0, -1.0),
        vec2(3.0, -1.0),
        vec2(-1.0, 3.0)
      );
      vec2 point = points[gl_VertexID];
      vUv = point * 0.5 + 0.5;
      gl_Position = vec4(point, 0.0, 1.0);
    }
  `;

  const FRAGMENT_SHADER = `#version 300 es
    precision highp float;

    in vec2 vUv;
    out vec4 fragColor;

    uniform sampler2D uBackground;
    uniform sampler2D uMidFibers;
    uniform sampler2D uNearFibers;
    uniform sampler2D uPlanet;
    uniform sampler2D uSurface;
    uniform sampler2D uActivity;
    uniform sampler2D uDepth;

    uniform float uTime;
    uniform float uReveal;
    uniform float uPointerEnergy;
    uniform float uDwell;
    uniform float uSignal;
    uniform float uSourceAspect;
    uniform vec2 uCenter;
    uniform vec2 uSpan;
    uniform vec2 uPointer;
    uniform vec2 uParallax;
    uniform vec2 uSignalOrigin;
    uniform vec2 uEventPositions[${MAX_EVENTS}];
    uniform float uEventAges[${MAX_EVENTS}];
    uniform float uEventKinds[${MAX_EVENTS}];

    float sdSegment(vec2 p, vec2 a, vec2 b, out float along) {
      vec2 pa = p - a;
      vec2 ba = b - a;
      along = clamp(dot(pa, ba) / max(dot(ba, ba), 0.000001), 0.0, 1.0);
      return length(pa - ba * along);
    }

    float pulseBand(float phase, float center, float width) {
      float delta = abs(fract(phase - center + 0.5) - 0.5);
      return 1.0 - smoothstep(0.0, width, delta);
    }

    float unitBounds(vec2 uv) {
      return step(0.0, uv.x) * step(uv.x, 1.0) * step(0.0, uv.y) * step(uv.y, 1.0);
    }

    void main() {
      vec2 sourceUv = uCenter + (vUv - 0.5) * uSpan;
      if (sourceUv.x < 0.0 || sourceUv.x > 1.0 || sourceUv.y < 0.0 || sourceUv.y > 1.0) {
        fragColor = vec4(0.006, 0.009, 0.011, 1.0);
        return;
      }

      vec2 farUv = clamp(sourceUv + uParallax * vec2(0.0018, 0.0012), 0.0, 1.0);
      vec2 midUv = clamp(sourceUv + uParallax * vec2(0.0060, 0.0040), 0.0, 1.0);
      vec2 nearUv = clamp(sourceUv + uParallax * vec2(0.0150, 0.0090), 0.0, 1.0);

      vec3 color = texture(uBackground, farUv).rgb * mix(0.92, 1.04, uReveal);
      vec4 midFibers = texture(uMidFibers, midUv);
      float midFlowA = pulseBand(midUv.x * 1.32 - midUv.y * 0.42 - uTime * 0.021, 0.5, 0.026);
      float midFlowB = pulseBand(midUv.y * 1.18 + midUv.x * 0.31 - uTime * 0.013, 0.5, 0.021);
      float midLife = max(midFlowA, midFlowB * 0.62);
      color += midFibers.rgb * midFibers.a * (0.34 + midLife * 0.72 + uReveal * 0.24);

      vec2 planetCenter = vec2(0.54127, 0.48990) - uParallax * vec2(0.0080, 0.0050);
      float planetScale = mix(1.16, 0.72, uReveal) * (1.0 - uDwell * 0.012);
      vec2 planetSize = vec2(0.3780, 0.6504) * planetScale;
      vec2 planetUv = vec2(0.5) + (sourceUv - planetCenter) / planetSize;
      vec2 pointerUv = vec2(0.5) + (uPointer - planetCenter) / planetSize;
      vec2 pointerDelta = planetUv - pointerUv;
      float pointerField = exp(-dot(pointerDelta, pointerDelta) * 54.0) * uPointerEnergy;

      vec2 eventWarp = vec2(0.0);
      for (int i = 0; i < ${MAX_EVENTS}; i++) {
        float age = uEventAges[i];
        float kind = uEventKinds[i];
        if (age >= 0.0 && age <= 1.0 && kind > 0.0) {
          vec2 eventUv = vec2(0.5) + (uEventPositions[i] - planetCenter) / planetSize;
          vec2 eventDelta = planetUv - eventUv;
          float eventDistance = length(eventDelta);
          float envelope = sin(age * 3.14159265) * exp(-eventDistance * eventDistance * 56.0);
          float direction = kind < 1.5 ? -1.0 : 1.0;
          eventWarp += normalize(eventDelta + vec2(0.00001)) * envelope * direction * 0.010;
        }
      }

      vec2 pointerWarp = normalize(pointerDelta + vec2(0.00001)) * pointerField * (0.007 + uDwell * 0.012);
      vec2 warpedPlanetUv = planetUv + pointerWarp + eventWarp;
      float planetBounds = unitBounds(warpedPlanetUv);
      float depth = texture(uDepth, clamp(warpedPlanetUv, 0.0, 1.0)).r * planetBounds;
      float activity = texture(uActivity, clamp(warpedPlanetUv, 0.0, 1.0)).r * planetBounds;
      vec4 planet = texture(uPlanet, clamp(warpedPlanetUv, 0.0, 1.0)) * planetBounds;
      vec4 surface = texture(uSurface, clamp(warpedPlanetUv, 0.0, 1.0)) * planetBounds;

      float bodyShadow = (1.0 - smoothstep(0.47, 0.57, length(planetUv - 0.5))) * planetBounds;
      color *= 1.0 - bodyShadow * 0.16;
      color = mix(color, planet.rgb, planet.a);

      float flowA = pulseBand(planetUv.x * 1.92 + planetUv.y * 0.63 - uTime * 0.041, 0.5, 0.035);
      float flowB = pulseBand(planetUv.y * 1.74 - planetUv.x * 0.36 - uTime * 0.027, 0.5, 0.029);
      float idleSignal = max(flowA * 0.78, flowB * 0.58) * activity;
      float localGather = pointerField * activity * (0.58 + uDwell * 1.42);
      color += surface.rgb * surface.a * (0.08 + idleSignal * 1.30 + localGather * 2.10);
      color += vec3(0.76, 0.62, 0.90) * pointerField * depth * (0.025 + uDwell * 0.055);

      vec2 p0 = planetCenter + vec2(0.0756, -0.003) * planetScale;
      vec2 p1 = planetCenter + vec2(0.1880, 0.006) * planetScale;
      vec2 p2 = vec2(0.8350, 0.5250);
      vec2 p3 = vec2(1.0450, 0.4780);
      float h0; float h1; float h2;
      float d0 = sdSegment(sourceUv, p0, p1, h0);
      float d1 = sdSegment(sourceUv, p1, p2, h1);
      float d2 = sdSegment(sourceUv, p2, p3, h2);
      float distanceToPath = d0;
      float pathPosition = h0 * 0.3;
      if (d1 < distanceToPath) { distanceToPath = d1; pathPosition = 0.3 + h1 * 0.32; }
      if (d2 < distanceToPath) { distanceToPath = d2; pathPosition = 0.62 + h2 * 0.38; }
      float lineCore = 1.0 - smoothstep(0.0009, 0.0052, distanceToPath);
      float lineHalo = 1.0 - smoothstep(0.0025, 0.0115, distanceToPath);

      float restingConnection = uReveal * (lineCore * 0.17 + lineHalo * 0.032);
      color += vec3(0.48, 0.34, 0.61) * restingConnection;

      float signalGlow = 0.0;
      if (uSignal >= 0.0) {
        vec2 signalOriginUv = vec2(0.5) + (uSignalOrigin - planetCenter) / planetSize;
        vec2 signalDelta = planetUv - signalOriginUv;
        float radialDistance = length(signalDelta);
        float radialFront = uSignal * 0.58;
        float surfaceFront = exp(-pow((radialDistance - radialFront) / 0.018, 2.0));
        surfaceFront *= activity * (1.0 - smoothstep(0.0, 0.72, uSignal));
        color += surface.rgb * surface.a * surfaceFront * 3.4;

        float outgoing = clamp((uSignal - 0.20) / 0.80, 0.0, 1.0);
        float headWindow = 1.0 - smoothstep(0.0, 0.024, abs(pathPosition - outgoing));
        float tailWindow = smoothstep(outgoing - 0.44, outgoing - 0.12, pathPosition)
          * (1.0 - smoothstep(outgoing - 0.008, outgoing + 0.030, pathPosition));
        float wakeWindow = smoothstep(-0.04, 0.05, pathPosition)
          * (1.0 - smoothstep(outgoing - 0.02, outgoing + 0.055, pathPosition));
        signalGlow = lineCore * max(headWindow, max(tailWindow * 0.50, wakeWindow * 0.14));
        float signalHalo = lineHalo * max(headWindow * 0.32, tailWindow * 0.10);
        color += vec3(0.92, 0.66, 1.0) * signalGlow * 1.68;
        color += vec3(0.54, 0.31, 0.82) * signalHalo;
      }

      float eventLight = 0.0;
      float eventDark = 0.0;
      for (int i = 0; i < ${MAX_EVENTS}; i++) {
        float age = uEventAges[i];
        float kind = uEventKinds[i];
        if (age >= 0.0 && age <= 1.0 && kind > 0.0) {
          vec2 eventUv = vec2(0.5) + (uEventPositions[i] - planetCenter) / planetSize;
          vec2 eventDelta = planetUv - eventUv;
          float eventDistance = length(eventDelta);
          if (kind < 1.5) {
            float bloom = sin(age * 3.14159265) * exp(-eventDistance * eventDistance * 82.0);
            float ring = (1.0 - smoothstep(0.006, 0.022, abs(eventDistance - age * 0.19))) * (1.0 - age);
            eventLight += (bloom * 1.24 + ring * 0.48) * activity;
          } else {
            float collapse = (1.0 - smoothstep(0.006, 0.020, abs(eventDistance - (1.0 - age) * 0.15))) * (1.0 - age);
            float scar = exp(-eventDistance * eventDistance * 105.0) * smoothstep(0.18, 0.46, age) * (1.0 - smoothstep(0.72, 1.0, age));
            eventLight += collapse * 0.38 * activity;
            eventDark += scar * 0.82 * activity;
          }
        }
      }

      color += vec3(1.0, 0.76, 0.46) * eventLight;
      color *= 1.0 - eventDark;

      float triggerCompression = smoothstep(0.70, 1.0, uDwell) * exp(-dot(pointerDelta, pointerDelta) * 110.0) * activity;
      color *= 1.0 - triggerCompression * 0.42;

      vec4 nearFibers = texture(uNearFibers, nearUv);
      float nearFlow = pulseBand(nearUv.x * 1.08 - nearUv.y * 0.28 - uTime * 0.025, 0.5, 0.024);
      color += nearFibers.rgb * nearFibers.a * (0.48 + nearFlow * 0.88 + uReveal * 0.34);

      float vignette = smoothstep(1.05, 0.2, length((vUv - 0.5) * vec2(1.05, 0.92)));
      color *= mix(0.7, 1.0, vignette);
      color = pow(max(color, 0.0), vec3(0.90));
      fragColor = vec4(color, 1.0);
    }
  `;

  class PlanetNeuronRenderer {
    constructor(canvas) {
      this.canvas = canvas;
      this.gl = canvas.getContext("webgl2", {
        alpha: false,
        antialias: true,
        powerPreference: "high-performance",
      });
      this.ready = false;
      this.time = 0;
      this.reveal = 0;
      this.pointer = { x: 0.54, y: 0.5, energy: 0 };
      this.dwell = 0;
      this.signal = -1;
      this.signalOrigin = { x: 0.54, y: 0.5 };
      this.parallax = { x: 0, y: 0 };
      this.events = [];
      this.viewport = { width: 1, height: 1, dpr: 1 };
      this.center = { x: 0.538, y: 0.49 };
      this.span = { x: 1, y: 1 };
    }

    async initialize(assetRoot) {
      if (!this.gl) throw new Error("WebGL2 is unavailable");
      const gl = this.gl;
      this.program = this.createProgram(VERTEX_SHADER, FRAGMENT_SHADER);
      this.uniforms = this.collectUniforms([
        "uBackground", "uMidFibers", "uNearFibers", "uPlanet", "uSurface", "uActivity", "uDepth",
        "uTime", "uReveal", "uPointerEnergy", "uDwell", "uSignal", "uSourceAspect",
        "uCenter", "uSpan", "uPointer", "uParallax", "uSignalOrigin", "uEventPositions[0]", "uEventAges[0]", "uEventKinds[0]",
      ]);

      const files = [
        "background-far-v3.png", "fibers-mid-v3.png", "fibers-near-v3.png", "planet-core-v3.png",
        "planet-surface-v3.png", "planet-activity-v3.png", "planet-depth-v3.png",
      ];
      const images = await Promise.all(files.map((file) => this.loadImage(`${assetRoot}/${file}`)));
      this.textures = images.map((image) => this.createTexture(image));
      this.resize();
      this.ready = true;
    }

    createShader(type, source) {
      const gl = this.gl;
      const shader = gl.createShader(type);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        const message = gl.getShaderInfoLog(shader);
        gl.deleteShader(shader);
        throw new Error(`Shader compilation failed: ${message}`);
      }
      return shader;
    }

    createProgram(vertexSource, fragmentSource) {
      const gl = this.gl;
      const program = gl.createProgram();
      gl.attachShader(program, this.createShader(gl.VERTEX_SHADER, vertexSource));
      gl.attachShader(program, this.createShader(gl.FRAGMENT_SHADER, fragmentSource));
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        throw new Error(`Program link failed: ${gl.getProgramInfoLog(program)}`);
      }
      return program;
    }

    collectUniforms(names) {
      return Object.fromEntries(names.map((name) => [name, this.gl.getUniformLocation(this.program, name)]));
    }

    loadImage(url) {
      return new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error(`Unable to load ${url}`));
        image.src = url;
      });
    }

    createTexture(image) {
      const gl = this.gl;
      const texture = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
      return texture;
    }

    resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = Math.max(1, Math.round(this.canvas.clientWidth * dpr));
      const height = Math.max(1, Math.round(this.canvas.clientHeight * dpr));
      if (this.canvas.width !== width || this.canvas.height !== height) {
        this.canvas.width = width;
        this.canvas.height = height;
      }
      this.viewport = { width: this.canvas.clientWidth, height: this.canvas.clientHeight, dpr };
      this.gl?.viewport(0, 0, width, height);
      this.updateView();
    }

    updateView() {
      const zoom = INITIAL_ZOOM + (1 - INITIAL_ZOOM) * this.reveal;
      const cover = Math.max(this.viewport.width / SOURCE_WIDTH, this.viewport.height / SOURCE_HEIGHT);
      const initialCenter = { x: 900 / SOURCE_WIDTH, y: 1 - 480 / SOURCE_HEIGHT };
      const finalCenter = { x: 0.5, y: 0.5 };
      this.center.x = initialCenter.x + (finalCenter.x - initialCenter.x) * this.reveal;
      this.center.y = initialCenter.y + (finalCenter.y - initialCenter.y) * this.reveal;
      this.span.x = this.viewport.width / (cover * zoom * SOURCE_WIDTH);
      this.span.y = this.viewport.height / (cover * zoom * SOURCE_HEIGHT);
    }

    screenToSource(clientX, clientY) {
      const rect = this.canvas.getBoundingClientRect();
      const screenX = (clientX - rect.left) / rect.width;
      const screenY = 1 - (clientY - rect.top) / rect.height;
      return {
        x: this.center.x + (screenX - 0.5) * this.span.x,
        y: this.center.y + (screenY - 0.5) * this.span.y,
      };
    }

    isOverPlanet(point) {
      const scale = 1.16 + (0.72 - 1.16) * this.reveal;
      const dx = (point.x - 905 / SOURCE_WIDTH) / (0.1890 * scale);
      const dy = (point.y - (1 - 480 / SOURCE_HEIGHT)) / (0.3252 * scale);
      return Math.hypot(dx, dy) < 0.98;
    }

    setPointer(point, energy) {
      this.pointer.x = point.x;
      this.pointer.y = point.y;
      this.pointer.energy = energy;
    }

    setDwell(value) {
      this.dwell = value;
    }

    setParallax(point) {
      this.parallax.x = point.x;
      this.parallax.y = point.y;
    }

    setReveal(value) {
      this.reveal = Math.min(1, Math.max(0, value));
      this.updateView();
    }

    setSignal(progress, origin = this.signalOrigin) {
      this.signal = progress;
      this.signalOrigin = origin;
    }

    addEvent(kind, position, duration = 2200) {
      if (this.events.length >= MAX_EVENTS) this.events.shift();
      this.events.push({ kind, position, startedAt: performance.now(), duration });
    }

    render(timestamp) {
      if (!this.ready) return;
      const gl = this.gl;
      this.time = timestamp * 0.001;
      this.events = this.events.filter((event) => timestamp - event.startedAt <= event.duration);

      gl.useProgram(this.program);
      this.textures.forEach((texture, index) => {
        gl.activeTexture(gl.TEXTURE0 + index);
        gl.bindTexture(gl.TEXTURE_2D, texture);
      });
      ["uBackground", "uMidFibers", "uNearFibers", "uPlanet", "uSurface", "uActivity", "uDepth"].forEach((name, index) => {
        gl.uniform1i(this.uniforms[name], index);
      });

      gl.uniform1f(this.uniforms.uTime, this.time);
      gl.uniform1f(this.uniforms.uReveal, this.reveal);
      gl.uniform1f(this.uniforms.uPointerEnergy, this.pointer.energy);
      gl.uniform1f(this.uniforms.uDwell, this.dwell);
      gl.uniform1f(this.uniforms.uSignal, this.signal);
      gl.uniform1f(this.uniforms.uSourceAspect, SOURCE_WIDTH / SOURCE_HEIGHT);
      gl.uniform2f(this.uniforms.uCenter, this.center.x, this.center.y);
      gl.uniform2f(this.uniforms.uSpan, this.span.x, this.span.y);
      gl.uniform2f(this.uniforms.uPointer, this.pointer.x, this.pointer.y);
      gl.uniform2f(this.uniforms.uParallax, this.parallax.x, this.parallax.y);
      gl.uniform2f(this.uniforms.uSignalOrigin, this.signalOrigin.x, this.signalOrigin.y);

      const positions = new Float32Array(MAX_EVENTS * 2);
      const ages = new Float32Array(MAX_EVENTS).fill(-1);
      const kinds = new Float32Array(MAX_EVENTS);
      this.events.forEach((event, index) => {
        positions[index * 2] = event.position.x;
        positions[index * 2 + 1] = event.position.y;
        ages[index] = (timestamp - event.startedAt) / event.duration;
        kinds[index] = event.kind === "burst" ? 1 : 2;
      });
      gl.uniform2fv(this.uniforms["uEventPositions[0]"], positions);
      gl.uniform1fv(this.uniforms["uEventAges[0]"], ages);
      gl.uniform1fv(this.uniforms["uEventKinds[0]"], kinds);

      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
  }

  window.PlanetNeuronRenderer = PlanetNeuronRenderer;
})();
