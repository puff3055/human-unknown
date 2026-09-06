(() => {
  "use strict";

  const SOURCE_WIDTH = 1672;
  const SOURCE_HEIGHT = 941;
  const INITIAL_ZOOM = 1.48;
  const MAX_EVENTS = 6;

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

    uniform sampler2D uMaster;
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

    float pulseBand(float phase, float center, float width) {
      float delta = abs(fract(phase - center + 0.5) - 0.5);
      return 1.0 - smoothstep(0.0, width, delta);
    }

    float sdSegment(vec2 p, vec2 a, vec2 b, out float along) {
      vec2 pa = p - a;
      vec2 ba = b - a;
      along = clamp(dot(pa, ba) / max(dot(ba, ba), 0.000001), 0.0, 1.0);
      return length(pa - ba * along);
    }

    vec2 pathMetric(vec2 p, vec2 a, vec2 b, vec2 c, vec2 d) {
      float h0; float h1; float h2;
      float d0 = sdSegment(p, a, b, h0);
      float d1 = sdSegment(p, b, c, h1);
      float d2 = sdSegment(p, c, d, h2);
      float distanceToPath = d0;
      float pathPosition = h0 * 0.32;
      if (d1 < distanceToPath) {
        distanceToPath = d1;
        pathPosition = 0.32 + h1 * 0.34;
      }
      if (d2 < distanceToPath) {
        distanceToPath = d2;
        pathPosition = 0.66 + h2 * 0.34;
      }
      return vec2(distanceToPath, pathPosition);
    }

    float travellingWindow(vec2 metric, float progress, float strength) {
      float head = 1.0 - smoothstep(0.0, 0.026, abs(metric.y - progress));
      float tail = smoothstep(progress - 0.42, progress - 0.12, metric.y)
        * (1.0 - smoothstep(progress - 0.01, progress + 0.035, metric.y));
      return max(head, tail * 0.55) * strength;
    }

    void main() {
      vec2 sourceUv = uCenter + (vUv - 0.5) * uSpan;
      if (sourceUv.x < 0.0 || sourceUv.x > 1.0 || sourceUv.y < 0.0 || sourceUv.y > 1.0) {
        fragColor = vec4(0.004, 0.006, 0.007, 1.0);
        return;
      }

      vec2 heroCenter = vec2(0.5410, 0.4950);
      vec2 heroDelta = sourceUv - heroCenter;
      vec2 heroMetric = vec2(heroDelta.x / 0.205, heroDelta.y / 0.325);
      float heroMask = 1.0 - smoothstep(0.90, 1.08, length(heroMetric));

      float baseDepth = texture(uDepth, sourceUv).r;
      vec2 depthParallax = uParallax * mix(vec2(0.0012, 0.0008), vec2(0.0058, 0.0034), baseDepth);

      vec2 pointerDelta = sourceUv - uPointer;
      pointerDelta.x *= uSourceAspect;
      float pointerDistance = length(pointerDelta);
      float pointerField = exp(-pointerDistance * pointerDistance * 210.0) * uPointerEnergy * heroMask;

      vec2 eventWarp = vec2(0.0);
      for (int i = 0; i < ${MAX_EVENTS}; i++) {
        float age = uEventAges[i];
        float kind = uEventKinds[i];
        if (age >= 0.0 && age <= 1.0 && kind > 0.0) {
          vec2 delta = sourceUv - uEventPositions[i];
          delta.x *= uSourceAspect;
          float distanceToEvent = length(delta);
          float envelope = sin(age * 3.14159265) * exp(-distanceToEvent * distanceToEvent * 92.0);
          float direction = kind < 1.5 ? -1.0 : 1.0;
          eventWarp += normalize(delta + vec2(0.00001)) * envelope * direction * 0.0046;
        }
      }

      vec2 pointerWarp = -normalize(pointerDelta + vec2(0.00001))
        * pointerField * (0.0035 + uDwell * 0.0080);
      pointerWarp.x /= uSourceAspect;
      vec2 warpedUv = clamp(sourceUv + depthParallax + pointerWarp + eventWarp, 0.0, 1.0);

      vec3 color = texture(uMaster, warpedUv).rgb;
      float activity = texture(uActivity, warpedUv).r;
      float depth = texture(uDepth, warpedUv).r;
      color *= mix(0.91, 1.025, uReveal);

      float flowA = pulseBand(warpedUv.x * 1.57 + warpedUv.y * 0.48 - uTime * 0.026, 0.5, 0.025);
      float flowB = pulseBand(warpedUv.y * 1.42 - warpedUv.x * 0.37 - uTime * 0.017, 0.5, 0.021);
      float flowC = pulseBand((warpedUv.x + warpedUv.y) * 1.08 - uTime * 0.011, 0.5, 0.017);
      float idleConduction = max(flowA * 0.74, max(flowB * 0.54, flowC * 0.34)) * activity;
      color += vec3(0.72, 0.48, 0.22) * idleConduction * (0.18 + depth * 0.26);
      color += vec3(0.42, 0.27, 0.62) * idleConduction * 0.09;

      float localGather = pointerField * activity * (0.72 + uDwell * 2.45);
      color += vec3(0.93, 0.70, 0.42) * localGather * 0.52;
      color += vec3(0.66, 0.42, 0.94) * localGather * 0.28;

      float gatherRadius = mix(0.105, 0.018, uDwell);
      float gatheringFront = 1.0 - smoothstep(0.006, 0.022, abs(pointerDistance - gatherRadius));
      color += vec3(0.78, 0.52, 0.92) * gatheringFront * activity * uPointerEnergy * (0.22 + uDwell * 0.50);

      float triggerCompression = smoothstep(0.70, 1.0, uDwell)
        * exp(-pointerDistance * pointerDistance * 390.0) * heroMask;
      color *= 1.0 - triggerCompression * 0.36;

      vec2 aspectScale = vec2(uSourceAspect, 1.0);
      vec2 pathA = pathMetric(
        sourceUv * aspectScale,
        vec2(0.624, 0.535) * aspectScale,
        vec2(0.742, 0.515) * aspectScale,
        vec2(0.842, 0.478) * aspectScale,
        vec2(0.932, 0.442) * aspectScale
      );
      vec2 pathB = pathMetric(
        sourceUv * aspectScale,
        vec2(0.594, 0.338) * aspectScale,
        vec2(0.445, 0.244) * aspectScale,
        vec2(0.235, 0.246) * aspectScale,
        vec2(0.075, 0.328) * aspectScale
      );

      if (uSignal >= 0.0) {
        vec2 originDelta = sourceUv - uSignalOrigin;
        originDelta.x *= uSourceAspect;
        float surfaceDistance = length(originDelta);
        float surfaceFront = 1.0 - smoothstep(0.005, 0.025, abs(surfaceDistance - uSignal * 0.36));
        surfaceFront *= activity * heroMask * (1.0 - smoothstep(0.42, 0.74, uSignal));
        color += vec3(0.94, 0.68, 1.0) * surfaceFront * 1.15;

        float progressA = clamp((uSignal - 0.16) / 0.76, 0.0, 1.0);
        float progressB = clamp((uSignal - 0.24) / 0.70, 0.0, 1.0);
        float windowA = travellingWindow(pathA, progressA, 1.0);
        float windowB = travellingWindow(pathB, progressB, 0.90);
        float corridorA = 1.0 - smoothstep(0.008, 0.058, pathA.x);
        float corridorB = 1.0 - smoothstep(0.008, 0.066, pathB.x);
        float filamentSignal = activity * (corridorA * windowA + corridorB * windowB) * 2.25;
        float headA = (1.0 - smoothstep(0.0015, 0.012, pathA.x))
          * (1.0 - smoothstep(0.0, 0.021, abs(pathA.y - progressA)));
        float headB = (1.0 - smoothstep(0.0015, 0.012, pathB.x))
          * (1.0 - smoothstep(0.0, 0.021, abs(pathB.y - progressB)));
        color += vec3(0.94, 0.68, 1.0) * filamentSignal * 0.92;
        color += vec3(0.92, 0.71, 1.0) * (headA + headB * 0.84) * 0.34;

        vec2 rightDelta = (sourceUv - vec2(0.932, 0.442)) * aspectScale;
        vec2 leftDelta = (sourceUv - vec2(0.075, 0.328)) * aspectScale;
        float arrival = smoothstep(0.72, 0.84, uSignal) * (1.0 - smoothstep(0.91, 1.0, uSignal));
        float rightArrival = exp(-dot(rightDelta, rightDelta) * 92.0) * arrival;
        float leftArrival = exp(-dot(leftDelta, leftDelta) * 72.0) * arrival;
        color += vec3(0.96, 0.69, 0.36) * rightArrival * 1.16;
        color *= 1.0 - leftArrival * 0.42;
      }

      float eventLight = 0.0;
      float eventDark = 0.0;
      for (int i = 0; i < ${MAX_EVENTS}; i++) {
        float age = uEventAges[i];
        float kind = uEventKinds[i];
        if (age >= 0.0 && age <= 1.0 && kind > 0.0) {
          vec2 delta = sourceUv - uEventPositions[i];
          delta.x *= uSourceAspect;
          float distanceToEvent = length(delta);
          if (kind < 1.5) {
            float bloom = sin(age * 3.14159265) * exp(-distanceToEvent * distanceToEvent * 120.0);
            float ring = (1.0 - smoothstep(0.006, 0.021, abs(distanceToEvent - age * 0.12))) * (1.0 - age);
            eventLight += bloom * 0.74 + ring * 0.42;
          } else {
            float collapse = (1.0 - smoothstep(0.006, 0.022, abs(distanceToEvent - (1.0 - age) * 0.105))) * (1.0 - age);
            float scar = exp(-distanceToEvent * distanceToEvent * 145.0)
              * smoothstep(0.18, 0.44, age) * (1.0 - smoothstep(0.76, 1.0, age));
            eventLight += collapse * 0.20;
            eventDark += scar * 0.68;
          }
        }
      }
      color += vec3(1.0, 0.72, 0.34) * eventLight * (0.34 + activity * 0.66);
      color *= 1.0 - eventDark * (0.42 + activity * 0.58);

      float nebulaDepth = (1.0 - depth) * uReveal;
      color += color * nebulaDepth * 0.035;
      float vignette = smoothstep(1.08, 0.18, length((vUv - 0.5) * vec2(1.05, 0.92)));
      color *= mix(0.65, 1.0, vignette);
      color = pow(max(color, 0.0), vec3(0.91));
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
      this.center = { x: 0.54, y: 0.495 };
      this.span = { x: 1, y: 1 };
    }

    async initialize(assetRoot) {
      if (!this.gl) throw new Error("WebGL2 is unavailable");
      const gl = this.gl;
      this.program = this.createProgram(VERTEX_SHADER, FRAGMENT_SHADER);
      this.uniforms = this.collectUniforms([
        "uMaster", "uActivity", "uDepth", "uTime", "uReveal", "uPointerEnergy", "uDwell",
        "uSignal", "uSourceAspect", "uCenter", "uSpan", "uPointer", "uParallax", "uSignalOrigin",
        "uEventPositions[0]", "uEventAges[0]", "uEventKinds[0]",
      ]);

      const files = ["network-master-v4.png", "network-activity-v4.png", "network-depth-v4.png"];
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
      const initialCenter = { x: 0.541, y: 0.495 };
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
      const dx = (point.x - 0.541) / 0.205;
      const dy = (point.y - 0.495) / 0.325;
      return Math.hypot(dx, dy) < 0.96;
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
      ["uMaster", "uActivity", "uDepth"].forEach((name, index) => {
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
