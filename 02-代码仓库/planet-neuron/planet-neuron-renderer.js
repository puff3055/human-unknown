(() => {
  "use strict";

  const SOURCE_WIDTH = 1672;
  const SOURCE_HEIGHT = 941;
  const INITIAL_ZOOM = 1.66;
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

    uniform sampler2D uSource;
    uniform sampler2D uPlanet;
    uniform sampler2D uSurface;
    uniform sampler2D uOuter;
    uniform sampler2D uPlanetMask;
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

    void main() {
      vec2 sourceUv = uCenter + (vUv - 0.5) * uSpan;
      if (sourceUv.x < 0.0 || sourceUv.x > 1.0 || sourceUv.y < 0.0 || sourceUv.y > 1.0) {
        fragColor = vec4(0.006, 0.009, 0.011, 1.0);
        return;
      }

      float planetMask = texture(uPlanetMask, sourceUv).r;
      float depth = texture(uDepth, sourceUv).r;
      float activity = texture(uActivity, sourceUv).r;

      vec2 pointerDelta = sourceUv - uPointer;
      pointerDelta.x *= uSourceAspect;
      float pointerField = exp(-dot(pointerDelta, pointerDelta) * 210.0) * uPointerEnergy * planetMask;

      float slowField = sin(sourceUv.y * 14.0 + uTime * 0.19 + sin(sourceUv.x * 9.0 - uTime * 0.11));
      slowField += sin(sourceUv.x * 18.0 - uTime * 0.13 + sin(sourceUv.y * 7.0 + uTime * 0.07)) * 0.55;
      vec2 livingWarp = vec2(
        sin(sourceUv.y * 21.0 + uTime * 0.17),
        cos(sourceUv.x * 17.0 - uTime * 0.12)
      ) * depth * slowField * 0.00062;
      vec2 pointerWarp = -normalize(pointerDelta + vec2(0.00001)) * pointerField * (0.0018 + uDwell * 0.0018);
      vec2 warpedUv = clamp(sourceUv + livingWarp + pointerWarp, 0.0, 1.0);

      vec3 color = texture(uSource, warpedUv).rgb * mix(0.78, 0.91, uReveal);
      vec4 planet = texture(uPlanet, warpedUv);
      vec4 surface = texture(uSurface, warpedUv + livingWarp * 1.8);
      vec4 outer = texture(uOuter, sourceUv + vec2(slowField, -slowField) * 0.00032);

      float flowA = pulseBand(sourceUv.x * 1.9 + sourceUv.y * 0.61 - uTime * 0.030 + sin(sourceUv.y * 18.0) * 0.045, 0.5, 0.032);
      float flowB = pulseBand(sourceUv.y * 1.7 - sourceUv.x * 0.38 - uTime * 0.019 + sin(sourceUv.x * 14.0) * 0.038, 0.5, 0.026);
      float idleSignal = max(flowA * 0.72, flowB * 0.52) * activity * planetMask;

      float outerFlow = pulseBand(sourceUv.x * 1.14 - sourceUv.y * 0.35 - uTime * 0.010, 0.5, 0.018);
      float outerLife = outer.a * (0.045 + outerFlow * 0.25 + uReveal * 0.09);
      color += outer.rgb * outerLife * 0.68;

      float localGather = pointerField * activity * (0.50 + uDwell * 1.08);
      color += surface.rgb * surface.a * (idleSignal * 1.48 + localGather * 1.62);
      color += planet.rgb * planet.a * pointerField * 0.030;

      float signalGlow = 0.0;
      if (uSignal >= 0.0) {
        vec2 signalDelta = sourceUv - uSignalOrigin;
        signalDelta.x *= uSourceAspect;
        float radialDistance = length(signalDelta);
        float radialFront = uSignal * 0.27;
        float surfaceFront = exp(-pow((radialDistance - radialFront) / 0.010, 2.0));
        surfaceFront *= activity * planetMask * (1.0 - smoothstep(0.0, 0.82, uSignal));
        color += surface.rgb * surface.a * surfaceFront * 2.8;

        vec2 p0 = vec2(0.6178, 0.5271);
        vec2 p1 = vec2(0.7117, 0.5027);
        vec2 p2 = vec2(0.8373, 0.4931);
        vec2 p3 = vec2(1.0450, 0.4780);
        float h0; float h1; float h2;
        float d0 = sdSegment(sourceUv, p0, p1, h0);
        float d1 = sdSegment(sourceUv, p1, p2, h1);
        float d2 = sdSegment(sourceUv, p2, p3, h2);
        float distanceToPath = d0;
        float pathPosition = h0 * 0.3;
        if (d1 < distanceToPath) { distanceToPath = d1; pathPosition = 0.3 + h1 * 0.32; }
        if (d2 < distanceToPath) { distanceToPath = d2; pathPosition = 0.62 + h2 * 0.38; }

        float outgoing = clamp((uSignal - 0.28) / 0.72, 0.0, 1.0);
        float headWindow = 1.0 - smoothstep(0.0, 0.011, abs(pathPosition - outgoing));
        float tailWindow = smoothstep(outgoing - 0.22, outgoing - 0.06, pathPosition) * (1.0 - smoothstep(outgoing, outgoing + 0.018, pathPosition));
        float lineCore = 1.0 - smoothstep(0.0008, 0.0052, distanceToPath);
        signalGlow = lineCore * max(headWindow, tailWindow * 0.54);
        color += vec3(0.91, 0.72, 1.0) * signalGlow * 1.55;
      }

      float eventLight = 0.0;
      float eventDark = 0.0;
      for (int i = 0; i < ${MAX_EVENTS}; i++) {
        float age = uEventAges[i];
        float kind = uEventKinds[i];
        if (age >= 0.0 && age <= 1.0 && kind > 0.0) {
          vec2 eventDelta = sourceUv - uEventPositions[i];
          eventDelta.x *= uSourceAspect;
          float eventDistance = length(eventDelta);
          if (kind < 1.5) {
            float bloom = sin(age * 3.14159265) * exp(-eventDistance * eventDistance * 820.0);
            float ring = (1.0 - smoothstep(0.002, 0.012, abs(eventDistance - age * 0.075))) * (1.0 - age);
            eventLight += (bloom * 1.18 + ring * 0.44) * (0.03 + activity * 0.97);
          } else {
            float collapse = (1.0 - smoothstep(0.002, 0.012, abs(eventDistance - (1.0 - age) * 0.055))) * (1.0 - age);
            float scar = exp(-eventDistance * eventDistance * 1300.0) * smoothstep(0.22, 0.5, age) * (1.0 - smoothstep(0.68, 1.0, age));
            eventLight += collapse * 0.34 * (0.03 + activity * 0.97);
            eventDark += scar * 0.78 * activity;
          }
        }
      }

      color += vec3(1.0, 0.76, 0.46) * eventLight;
      color *= 1.0 - eventDark;

      float triggerCompression = uDwell > 0.82 ? smoothstep(0.82, 1.0, uDwell) * exp(-dot(pointerDelta, pointerDelta) * 720.0) : 0.0;
      color *= 1.0 - triggerCompression * 0.32;
      color += vec3(0.82, 0.61, 1.0) * pointerField * (0.012 + uDwell * 0.024);

      float vignette = smoothstep(1.05, 0.2, length((vUv - 0.5) * vec2(1.05, 0.92)));
      color *= mix(0.7, 1.0, vignette);
      color = pow(max(color, 0.0), vec3(0.96));
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
        "uSource", "uPlanet", "uSurface", "uOuter", "uPlanetMask", "uActivity", "uDepth",
        "uTime", "uReveal", "uPointerEnergy", "uDwell", "uSignal", "uSourceAspect",
        "uCenter", "uSpan", "uPointer", "uSignalOrigin", "uEventPositions[0]", "uEventAges[0]", "uEventKinds[0]",
      ]);

      const files = [
        "source-enhanced@2x.png", "planet-layer@2x.png", "surface-network-layer@2x.png", "outer-fibers-layer@2x.png",
        "planet-mask@2x.png", "activity-map@2x.png", "depth-map@2x.png",
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
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
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
      const dx = (point.x - 905 / SOURCE_WIDTH) * (SOURCE_WIDTH / SOURCE_HEIGHT);
      const dy = point.y - (1 - 480 / SOURCE_HEIGHT);
      return Math.hypot(dx, dy) < 0.323;
    }

    setPointer(point, energy) {
      this.pointer.x = point.x;
      this.pointer.y = point.y;
      this.pointer.energy = energy;
    }

    setDwell(value) {
      this.dwell = value;
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
      ["uSource", "uPlanet", "uSurface", "uOuter", "uPlanetMask", "uActivity", "uDepth"].forEach((name, index) => {
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
