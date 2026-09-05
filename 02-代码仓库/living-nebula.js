(() => {
  'use strict';

  const IMAGE_WIDTH = 1672;
  const IMAGE_HEIGHT = 941;

  const VERTEX_SHADER = `
    precision highp float;

    attribute vec2 aPosition;
    varying vec2 vUv;

    void main() {
      vUv = aPosition * 0.5 + 0.5;
      gl_Position = vec4(aPosition, 0.0, 1.0);
    }
  `;

  const FRAGMENT_SHADER = `
    precision highp float;

    varying vec2 vUv;

    uniform sampler2D uTexture;
    uniform vec2 uResolution;
    uniform vec2 uImageSize;
    uniform vec2 uGazePx;
    uniform vec2 uPointerPx;
    uniform float uTime;
    uniform float uBreath;
    uniform float uHold;
    uniform float uAwareness;
    uniform float uStudy;
    uniform float uSignalProgress;
    uniform float uApproach;
    uniform float uAwaken;
    uniform float uMotion;

    float luminance(vec3 color) {
      return dot(color, vec3(0.2126, 0.7152, 0.0722));
    }

    float hash21(vec2 point) {
      point = fract(point * vec2(123.34, 456.21));
      point += dot(point, point + 45.32);
      return fract(point.x * point.y);
    }

    vec2 coverUv(vec2 screenUv) {
      float screenAspect = uResolution.x / max(1.0, uResolution.y);
      float imageAspect = uImageSize.x / max(1.0, uImageSize.y);
      vec2 visible = vec2(1.0);

      if (screenAspect > imageAspect) {
        visible.y = imageAspect / screenAspect;
      } else {
        visible.x = screenAspect / imageAspect;
      }

      return vec2(0.5) + (screenUv - vec2(0.5)) * visible;
    }

    float sphereMask(vec2 sourceUv, vec2 center, float radius) {
      float imageAspect = uImageSize.x / max(1.0, uImageSize.y);
      vec2 delta = (sourceUv - center) * vec2(imageAspect, 1.0);
      return 1.0 - smoothstep(radius * 0.72, radius * 1.48, length(delta));
    }

    void main() {
      float screenAspect = uResolution.x / max(1.0, uResolution.y);
      vec2 metric = (vUv - vec2(0.5)) * vec2(screenAspect, 1.0) * 2.0;
      float radius = length(metric);
      vec2 radial = metric / max(radius, 0.0001);
      vec2 tangent = vec2(-radial.y, radial.x);

      vec2 baseSourceUv = coverUv(vUv);
      float planetNeighborhood = max(
        sphereMask(baseSourceUv, vec2(0.5927, 0.8278), 0.0510),
        max(
          sphereMask(baseSourceUv, vec2(0.7081, 0.7056), 0.0790),
          sphereMask(baseSourceUv, vec2(0.3206, 0.3592), 0.0570)
        )
      );

      vec2 gazeMetric = vec2(uGazePx.x, -uGazePx.y)
        * 2.0 / max(1.0, uResolution.y);
      float gazeLength = length(gazeMetric);
      vec2 gazeDirection = gazeMetric / max(gazeLength, 0.0001);

      float pupilResponse = 1.0 - smoothstep(0.43, 1.02, radius);
      float middleResponse = smoothstep(0.45, 0.72, radius)
        * (1.0 - smoothstep(1.28, 1.82, radius));
      float tissueResponse = smoothstep(0.34, 0.58, radius)
        * (1.0 - smoothstep(1.43, 1.92, radius));
      float outerAnchor = 1.0 - smoothstep(1.54, 1.98, radius);
      float pupilEdge = smoothstep(0.32, 0.44, radius)
        * (1.0 - smoothstep(0.69, 0.87, radius));

      vec2 deformation = gazeMetric
        * (pupilResponse * 0.98 + middleResponse * 0.36)
        * uAwareness;

      float facing = dot(radial, gazeDirection);
      deformation += radial
        * (-facing * gazeLength)
        * (pupilEdge * 0.42 + middleResponse * 0.20)
        * uAwareness;

      float gazeBend = radial.x * gazeDirection.y - radial.y * gazeDirection.x;
      deformation += tangent
        * gazeBend
        * gazeLength
        * 0.105
        * middleResponse
        * uAwareness;

      float breathStrength = uBreath * (1.0 - uHold * 0.72);
      float spatialBreath = breathStrength
        * (0.78 + 0.22 * sin(atan(metric.y, metric.x) * 3.0 + radius * 2.4));
      float microRhythm = (
        sin(uTime * 1.71 + radius * 5.1 + atan(metric.y, metric.x) * 2.0) * 0.12
        + sin(uTime * 0.93 - radius * 3.7) * 0.055
      ) * uMotion;
      deformation += radial
        * (spatialBreath + microRhythm)
        * (pupilEdge * 0.024 + tissueResponse * 0.014);

      float awakeningField = pupilEdge + middleResponse * 0.52;
      deformation += radial
        * uAwaken
        * (pupilEdge * 0.025 + tissueResponse * 0.008);
      deformation += tangent
        * sin(atan(metric.y, metric.x) * 4.0 - radius * 5.8)
        * uAwaken
        * middleResponse
        * 0.0045;

      float innerAfterwave = sin(uTime * 0.23 - radius * 7.5 + atan(metric.y, metric.x) * 1.7);
      deformation += radial
        * innerAfterwave
        * 0.0032
        * tissueResponse
        * uMotion
        * (1.0 - uHold * 0.6);

      float membraneShear = sin(
        uTime * 0.075
        + radius * 5.2
        + atan(metric.y, metric.x) * 2.6
      );
      deformation += tangent
        * membraneShear
        * 0.0042
        * middleResponse
        * uMotion;

      float gatheringField = smoothstep(0.66, 0.84, radius)
        * (1.0 - smoothstep(1.48, 1.83, radius));
      deformation += radial
        * (pupilEdge * 0.040 - gatheringField * 0.026)
        * uApproach;

      vec2 pointerMetric = vec2(uPointerPx.x, -uPointerPx.y)
        * 2.0 / max(1.0, uResolution.y);
      vec2 towardPointer = pointerMetric - metric;
      float pointerDistance = length(towardPointer);
      float localInterest = 1.0 - smoothstep(0.07, 0.72, pointerDistance);
      float curiosityField = localInterest * tissueResponse * uStudy;
      deformation += towardPointer / max(pointerDistance, 0.0001)
        * curiosityField
        * 0.040;

      float signalRadius = mix(0.035, 0.82, uSignalProgress);
      float signalWidth = mix(0.045, 0.105, uSignalProgress);
      float signalAngle = atan(towardPointer.y, towardPointer.x);
      float signalBranchField = 0.50
        + sin(signalAngle * 4.5 + pointerDistance * 10.0 + radius * 4.0) * 0.30
        + sin(signalAngle * -7.0 + pointerDistance * 17.0) * 0.20;
      float signalBranchGate = smoothstep(0.24, 0.78, signalBranchField);
      float signalFront = (1.0 - smoothstep(
        signalWidth * 0.32,
        signalWidth,
        abs(pointerDistance - signalRadius)
      )) * (0.28 + signalBranchGate * 0.72);
      deformation -= towardPointer / max(pointerDistance, 0.0001)
        * signalFront
        * tissueResponse
        * uStudy
        * 0.024;

      vec2 planetDrift = vec2(
        sin(uTime * 0.031 + baseSourceUv.y * 13.0),
        cos(uTime * 0.024 + baseSourceUv.x * 11.0)
      ) * 0.0028 * planetNeighborhood * uMotion;

      deformation *= outerAnchor;
      deformation += planetDrift;
      deformation *= uMotion;

      vec2 screenWarp = vec2(
        deformation.x / max(0.001, screenAspect),
        deformation.y
      ) * 0.5;
      vec2 sourceUv = coverUv(vUv - screenWarp);
      sourceUv = clamp(sourceUv, vec2(0.001), vec2(0.999));

      vec4 source = texture2D(uTexture, sourceUv);
      vec2 texel = 1.0 / max(uImageSize, vec2(1.0));
      vec3 north = texture2D(uTexture, sourceUv + vec2(0.0, texel.y * 1.7)).rgb;
      vec3 south = texture2D(uTexture, sourceUv - vec2(0.0, texel.y * 1.7)).rgb;
      vec3 east = texture2D(uTexture, sourceUv + vec2(texel.x * 1.7, 0.0)).rgb;
      vec3 west = texture2D(uTexture, sourceUv - vec2(texel.x * 1.7, 0.0)).rgb;
      vec3 soft = (north + south + east + west) * 0.25;

      float sourceLight = luminance(source.rgb);
      float softLight = luminance(soft);
      float filamentRidge = max(sourceLight - softLight, 0.0);
      float veil = max(softLight - sourceLight, 0.0);

      vec3 color = source.rgb;
      color = mix(color, soft, veil * 0.07);

      float lifeGain = 1.0
        + breathStrength * tissueResponse * 0.075
        + uAwaken * awakeningField * 0.052
        + uStudy * localInterest * filamentRidge * 0.38
        + uStudy * localInterest * smoothstep(0.020, 0.27, sourceLight) * 0.110
        + uApproach * pupilEdge * 0.065;
      color *= lifeGain;
      color += vec3(0.58, 0.63, 0.70)
        * filamentRidge
        * (
          0.11
          + abs(breathStrength) * 0.10
          + uAwaken * 0.075
          + uStudy * localInterest * 0.16
        );

      float signalTexture = smoothstep(0.035, 0.36, softLight + filamentRidge * 2.1);
      float branchPattern = 0.5 + 0.5 * sin(
        signalAngle * 4.5
        + radius * 6.0
        + sourceLight * 14.0
      );
      float branchGate = smoothstep(0.18, 0.86, branchPattern);
      float diffusionGlow = signalFront
        * signalTexture
        * (0.32 + branchGate * 0.68)
        * uStudy;
      float signalShadowFront = 1.0 - smoothstep(
        signalWidth * 0.45,
        signalWidth * 1.35,
        abs(pointerDistance - max(0.0, signalRadius - signalWidth * 1.15))
      );
      float diffusionShadow = signalShadowFront
        * signalTexture
        * (0.22 + signalBranchGate * 0.78)
        * uStudy;
      float localRecognition = localInterest
        * signalTexture
        * (0.55 + signalBranchGate * 0.45)
        * uStudy;
      color *= 1.0 - diffusionShadow * 0.072;
      color += vec3(0.56, 0.63, 0.71)
        * diffusionGlow
        * 0.35;
      color += vec3(0.49, 0.55, 0.63)
        * localRecognition
        * 0.072;

      float outerFocus = smoothstep(0.92, 1.72, radius);
      color *= 1.0 - outerFocus * uApproach * 0.038;

      vec2 moteGrid = vec2(214.0, 121.0);
      vec2 moteUv = sourceUv
        + vec2(uTime * 0.000035, sin(uTime * 0.041) * 0.00016)
        * uMotion;
      vec2 moteCell = floor(moteUv * moteGrid);
      vec2 moteLocal = fract(moteUv * moteGrid);
      vec2 moteCenter = vec2(
        0.2 + hash21(moteCell + 7.31) * 0.6,
        0.2 + hash21(moteCell + 29.17) * 0.6
      );
      float moteGate = step(0.9915, hash21(moteCell + 91.73));
      float moteBody = 1.0 - smoothstep(0.018, 0.105, length(moteLocal - moteCenter));
      float moteTwinkleLive = 0.58 + 0.42 * sin(
        uTime * (0.27 + hash21(moteCell + 51.9) * 0.36)
        + hash21(moteCell) * 6.28318
      );
      float moteTwinkle = mix(0.72, moteTwinkleLive, uMotion);
      float inhabited = smoothstep(0.028, 0.24, softLight + filamentRidge * 1.7);
      color += vec3(0.72, 0.76, 0.79)
        * moteBody
        * moteGate
        * moteTwinkle
        * inhabited
        * 0.34;

      float heldStill = uHold
        * tissueResponse
        * smoothstep(0.02, 0.32, sourceLight)
        * uMotion;
      color *= 1.0 - heldStill * 0.045;

      gl_FragColor = vec4(max(color, vec3(0.0)), 1.0);
    }
  `;

  function loadImage(source) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.decoding = 'async';
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error(`Unable to load nebula source: ${source}`));
      image.src = source;
    });
  }

  function compileShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const message = gl.getShaderInfoLog(shader) || 'Unknown shader compilation error';
      gl.deleteShader(shader);
      throw new Error(message);
    }

    return shader;
  }

  function createProgram(gl) {
    const vertexShader = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
    const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
    const program = gl.createProgram();

    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const message = gl.getProgramInfoLog(program) || 'Unknown program link error';
      gl.deleteProgram(program);
      throw new Error(message);
    }

    return program;
  }

  class LivingNebula {
    constructor(canvas, options = {}) {
      this.canvas = canvas;
      this.reducedMotion = Boolean(options.reducedMotion);
      this.onContextLost = typeof options.onContextLost === 'function'
        ? options.onContextLost
        : null;
      this.onContextRestored = typeof options.onContextRestored === 'function'
        ? options.onContextRestored
        : null;
      this.gl = null;
      this.program = null;
      this.buffer = null;
      this.texture = null;
      this.ready = false;
      this.lost = false;
      this.cssWidth = 1;
      this.cssHeight = 1;
      this.dpr = 1;
      this.imageWidth = IMAGE_WIDTH;
      this.imageHeight = IMAGE_HEIGHT;

      this.handleContextLost = (event) => {
        event.preventDefault();
        this.lost = true;
        if (this.onContextLost) this.onContextLost();
      };
      this.handleContextRestored = () => {
        if (this.onContextRestored) {
          this.onContextRestored();
        } else {
          window.location.reload();
        }
      };
    }

    async init(source) {
      const gl = this.canvas.getContext('webgl', {
        alpha: false,
        antialias: false,
        depth: false,
        stencil: false,
        premultipliedAlpha: false,
        preserveDrawingBuffer: false,
        powerPreference: 'high-performance',
      });

      if (!gl) throw new Error('WebGL is unavailable');
      this.gl = gl;

      const image = await loadImage(source);
      this.imageWidth = image.naturalWidth || IMAGE_WIDTH;
      this.imageHeight = image.naturalHeight || IMAGE_HEIGHT;
      this.program = createProgram(gl);
      this.locations = this.getLocations();
      this.buffer = gl.createBuffer();

      gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
      gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array([
          -1, -1,
          1, -1,
          -1, 1,
          1, 1,
        ]),
        gl.STATIC_DRAW
      );

      this.texture = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, this.texture);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        image
      );

      gl.disable(gl.DEPTH_TEST);
      gl.disable(gl.BLEND);
      gl.disable(gl.CULL_FACE);
      gl.clearColor(0, 0, 0, 1);

      this.canvas.addEventListener('webglcontextlost', this.handleContextLost, false);
      this.canvas.addEventListener('webglcontextrestored', this.handleContextRestored, false);

      this.resize(true);
      this.ready = true;
      return this;
    }

    getLocations() {
      const gl = this.gl;
      const program = this.program;
      return {
        position: gl.getAttribLocation(program, 'aPosition'),
        texture: gl.getUniformLocation(program, 'uTexture'),
        resolution: gl.getUniformLocation(program, 'uResolution'),
        imageSize: gl.getUniformLocation(program, 'uImageSize'),
        gazePx: gl.getUniformLocation(program, 'uGazePx'),
        pointerPx: gl.getUniformLocation(program, 'uPointerPx'),
        time: gl.getUniformLocation(program, 'uTime'),
        breath: gl.getUniformLocation(program, 'uBreath'),
        hold: gl.getUniformLocation(program, 'uHold'),
        awareness: gl.getUniformLocation(program, 'uAwareness'),
        study: gl.getUniformLocation(program, 'uStudy'),
        signalProgress: gl.getUniformLocation(program, 'uSignalProgress'),
        approach: gl.getUniformLocation(program, 'uApproach'),
        awaken: gl.getUniformLocation(program, 'uAwaken'),
        motion: gl.getUniformLocation(program, 'uMotion'),
      };
    }

    resize(force = false) {
      const width = Math.max(1, this.canvas.clientWidth || window.innerWidth);
      const height = Math.max(1, this.canvas.clientHeight || window.innerHeight);
      const compact = Math.min(width, height) < 700;
      const dprLimit = compact ? 1.3 : 1.55;
      const dpr = Math.min(window.devicePixelRatio || 1, dprLimit);
      const pixelWidth = Math.round(width * dpr);
      const pixelHeight = Math.round(height * dpr);

      if (
        !force
        && pixelWidth === this.canvas.width
        && pixelHeight === this.canvas.height
      ) return;

      this.cssWidth = width;
      this.cssHeight = height;
      this.dpr = dpr;
      this.canvas.width = pixelWidth;
      this.canvas.height = pixelHeight;
      this.gl.viewport(0, 0, pixelWidth, pixelHeight);
    }

    render(time, state = {}) {
      if (!this.ready || this.lost) return;
      const gl = this.gl;
      const locations = this.locations;

      this.resize();
      gl.useProgram(this.program);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
      gl.enableVertexAttribArray(locations.position);
      gl.vertexAttribPointer(locations.position, 2, gl.FLOAT, false, 0, 0);

      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.texture);
      gl.uniform1i(locations.texture, 0);
      gl.uniform2f(locations.resolution, this.cssWidth, this.cssHeight);
      gl.uniform2f(locations.imageSize, this.imageWidth, this.imageHeight);
      gl.uniform2f(locations.gazePx, state.gazeX || 0, state.gazeY || 0);
      gl.uniform2f(locations.pointerPx, state.pointerX || 0, state.pointerY || 0);
      gl.uniform1f(locations.time, time);
      gl.uniform1f(locations.breath, state.breath || 0);
      gl.uniform1f(locations.hold, state.hold || 0);
      gl.uniform1f(locations.awareness, state.awareness || 0);
      gl.uniform1f(locations.study, state.study || 0);
      gl.uniform1f(locations.signalProgress, state.signalProgress || 0);
      gl.uniform1f(locations.approach, state.approach || 0);
      gl.uniform1f(locations.awaken, state.awaken || 0);
      gl.uniform1f(locations.motion, this.reducedMotion ? 0 : 1);

      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }

    destroy() {
      if (!this.gl) return;
      const gl = this.gl;
      this.canvas.removeEventListener('webglcontextlost', this.handleContextLost);
      this.canvas.removeEventListener('webglcontextrestored', this.handleContextRestored);
      if (this.buffer) gl.deleteBuffer(this.buffer);
      if (this.texture) gl.deleteTexture(this.texture);
      if (this.program) gl.deleteProgram(this.program);
      this.ready = false;
    }
  }

  window.LivingNebula = LivingNebula;
})();
