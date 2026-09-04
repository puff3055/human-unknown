(() => {
  'use strict';

  const STRIDE_FLOATS = 6;
  const STRIDE_BYTES = STRIDE_FLOATS * Float32Array.BYTES_PER_ELEMENT;
  const IMAGE_WIDTH = 1672;
  const IMAGE_HEIGHT = 941;

  const VERTEX_SHADER = `
    precision highp float;

    attribute vec2 aPosition;
    attribute float aLum;
    attribute float aSize;
    attribute float aPhase;
    attribute float aDepth;

    uniform vec2 uResolution;
    uniform vec2 uImageSize;
    uniform vec2 uGazePx;
    uniform float uTime;
    uniform float uApproach;
    uniform float uDpr;
    uniform float uMotion;
    uniform float uPassAlpha;

    varying float vAlpha;
    varying float vTone;

    void main() {
      float viewportAspect = uResolution.x / max(1.0, uResolution.y);
      float imageAspect = uImageSize.x / max(1.0, uImageSize.y);
      vec2 cover = vec2(
        max(1.0, imageAspect / viewportAspect),
        max(1.0, viewportAspect / imageAspect)
      );

      vec2 ndc = vec2(aPosition.x * 2.0 - 1.0, 1.0 - aPosition.y * 2.0) * cover;
      vec2 metric = vec2(ndc.x * viewportAspect, ndc.y);
      float radius = length(metric);
      vec2 radial = metric / max(radius, 0.0001);

      vec2 gazeMetric = vec2(
        2.0 * uGazePx.x / max(1.0, uResolution.y),
        -2.0 * uGazePx.y / max(1.0, uResolution.y)
      );
      float gazeLength = length(gazeMetric);
      vec2 gazeDirection = gazeMetric / max(gazeLength, 0.0001);

      float innerResponse = 1.0 - smoothstep(0.52, 1.72, radius);
      float middleResponse = 1.0 - smoothstep(0.72, 1.92, radius);
      float depthResponse = mix(0.32, 1.0, aDepth);

      metric += gazeMetric * innerResponse * depthResponse * uMotion;

      float facing = dot(radial, gazeDirection);
      metric += radial
        * (-facing * gazeLength * 0.13)
        * middleResponse
        * depthResponse
        * uMotion;

      vec2 tangent = vec2(-radial.y, radial.x);
      float bend = radial.x * gazeDirection.y - radial.y * gazeDirection.x;
      metric += tangent
        * bend
        * gazeLength
        * 0.045
        * middleResponse
        * depthResponse
        * uMotion;

      float pupilEdge = smoothstep(0.34, 0.51, radius)
        * (1.0 - smoothstep(0.67, 0.84, radius));
      float gatheringField = smoothstep(0.65, 0.88, radius)
        * (1.0 - smoothstep(1.58, 1.92, radius));
      float radialShift = pupilEdge * 0.028 - gatheringField * 0.016;
      metric += radial
        * radialShift
        * uApproach
        * mix(0.55, 1.0, aDepth)
        * uMotion;

      float driftAmplitude = mix(0.00075, 0.0042, aDepth)
        * (1.0 + uApproach * 0.42)
        * uMotion;
      vec2 livingDrift = vec2(
        sin(uTime * (0.13 + aDepth * 0.052) + aPhase * 1.73 + metric.y * 3.9),
        cos(uTime * (0.105 + aDepth * 0.043) + aPhase * 2.11 + metric.x * 4.3)
      );
      metric += livingDrift * driftAmplitude;

      ndc = vec2(metric.x / viewportAspect, metric.y);
      gl_Position = vec4(ndc, 0.0, 1.0);

      float signal = 0.88 + 0.12 * sin(
        uTime * (0.31 + aDepth * 0.21) + aPhase * 4.7 + radius * 5.2
      );
      float proximityLight = 1.0 + pupilEdge * uApproach * 0.24;
      vAlpha = mix(0.045, 0.72, pow(aLum, 0.72))
        * signal
        * mix(0.72, 1.0, aDepth)
        * proximityLight
        * uPassAlpha;
      vTone = aLum;
      gl_PointSize = min(8.0, (aSize + pupilEdge * uApproach * 0.65) * uDpr);
    }
  `;

  const POINT_FRAGMENT_SHADER = `
    precision mediump float;

    varying float vAlpha;
    varying float vTone;

    void main() {
      vec2 point = gl_PointCoord - vec2(0.5);
      float distanceFromCenter = length(point);
      float body = 1.0 - smoothstep(0.08, 0.5, distanceFromCenter);
      float halo = 1.0 - smoothstep(0.24, 0.5, distanceFromCenter);
      float alpha = vAlpha * (body * 0.76 + halo * 0.24);
      vec3 dimSilver = vec3(0.46, 0.49, 0.53);
      vec3 brightSilver = vec3(0.93, 0.94, 0.92);
      vec3 color = mix(dimSilver, brightSilver, pow(vTone, 0.58));
      gl_FragColor = vec4(color, alpha);
    }
  `;

  const LINE_FRAGMENT_SHADER = `
    precision mediump float;

    varying float vAlpha;
    varying float vTone;

    void main() {
      vec3 color = mix(
        vec3(0.39, 0.43, 0.48),
        vec3(0.89, 0.91, 0.90),
        pow(vTone, 0.64)
      );
      gl_FragColor = vec4(color, vAlpha);
    }
  `;

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function smoothstep(edge0, edge1, value) {
    const t = clamp((value - edge0) / (edge1 - edge0), 0, 1);
    return t * t * (3 - 2 * t);
  }

  function mulberry32(seed) {
    let state = seed >>> 0;
    return () => {
      state += 0x6D2B79F5;
      let value = state;
      value = Math.imul(value ^ (value >>> 15), value | 1);
      value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
      return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
    };
  }

  function loadImage(source) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.decoding = 'async';
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error(`Unable to load particle source: ${source}`));
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

  function createProgram(gl, vertexSource, fragmentSource) {
    const vertexShader = compileShader(gl, gl.VERTEX_SHADER, vertexSource);
    const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, fragmentSource);
    const program = gl.createProgram();

    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const message = gl.getProgramInfoLog(program) || 'Unknown shader link error';
      gl.deleteProgram(program);
      throw new Error(message);
    }

    return program;
  }

  function createProgramInfo(gl, fragmentSource) {
    const program = createProgram(gl, VERTEX_SHADER, fragmentSource);
    return {
      program,
      attributes: {
        position: gl.getAttribLocation(program, 'aPosition'),
        lum: gl.getAttribLocation(program, 'aLum'),
        size: gl.getAttribLocation(program, 'aSize'),
        phase: gl.getAttribLocation(program, 'aPhase'),
        depth: gl.getAttribLocation(program, 'aDepth'),
      },
      uniforms: {
        resolution: gl.getUniformLocation(program, 'uResolution'),
        imageSize: gl.getUniformLocation(program, 'uImageSize'),
        gazePx: gl.getUniformLocation(program, 'uGazePx'),
        time: gl.getUniformLocation(program, 'uTime'),
        approach: gl.getUniformLocation(program, 'uApproach'),
        dpr: gl.getUniformLocation(program, 'uDpr'),
        motion: gl.getUniformLocation(program, 'uMotion'),
        passAlpha: gl.getUniformLocation(program, 'uPassAlpha'),
      },
    };
  }

  class ParticleEye {
    constructor(canvas, options = {}) {
      this.canvas = canvas;
      this.options = {
        maxPoints: options.maxPoints || 68000,
        maxLines: options.maxLines || 13000,
        mobilePoints: options.mobilePoints || 20000,
        mobileLines: options.mobileLines || 3600,
        reducedMotion: Boolean(options.reducedMotion),
      };
      this.gl = null;
      this.ready = false;
      this.lost = false;
      this.cssWidth = 1;
      this.cssHeight = 1;
      this.dpr = 1;
      this.pointCount = 0;
      this.lineVertexCount = 0;
      this.pointBuffer = null;
      this.lineBuffer = null;
      this.pointProgram = null;
      this.lineProgram = null;

      this.handleContextLost = (event) => {
        event.preventDefault();
        this.lost = true;
      };
      this.handleContextRestored = () => {
        window.location.reload();
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
      const field = this.createParticleField(image);

      this.pointProgram = createProgramInfo(gl, POINT_FRAGMENT_SHADER);
      this.lineProgram = createProgramInfo(gl, LINE_FRAGMENT_SHADER);
      this.pointBuffer = this.createBuffer(field.points);
      this.lineBuffer = this.createBuffer(field.lines);
      this.pointCount = field.points.length / STRIDE_FLOATS;
      this.lineVertexCount = field.lines.length / STRIDE_FLOATS;

      gl.disable(gl.DEPTH_TEST);
      gl.disable(gl.CULL_FACE);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
      gl.clearColor(0, 0, 0, 1);

      this.canvas.addEventListener('webglcontextlost', this.handleContextLost, false);
      this.canvas.addEventListener('webglcontextrestored', this.handleContextRestored, false);

      this.resize(true);
      this.ready = true;
      return this;
    }

    createParticleField(image) {
      const samplingCanvas = document.createElement('canvas');
      samplingCanvas.width = image.naturalWidth;
      samplingCanvas.height = image.naturalHeight;
      const context = samplingCanvas.getContext('2d', { willReadFrequently: true });
      context.drawImage(image, 0, 0);
      const pixels = context.getImageData(0, 0, samplingCanvas.width, samplingCanvas.height).data;
      const width = samplingCanvas.width;
      const height = samplingCanvas.height;
      const random = mulberry32(0x48554D41);

      const readLuminance = (x, y) => {
        const safeX = clamp(Math.round(x), 0, width - 1);
        const safeY = clamp(Math.round(y), 0, height - 1);
        const index = (safeY * width + safeX) * 4;
        return (
          pixels[index] * 0.2126
          + pixels[index + 1] * 0.7152
          + pixels[index + 2] * 0.0722
        ) / 255;
      };

      const depthAt = (x, y) => {
        const metricX = ((x / width) * 2 - 1) * (width / height);
        const metricY = 1 - (y / height) * 2;
        const radius = Math.hypot(metricX, metricY);
        return clamp(
          0.13 + (1 - smoothstep(0.5, 1.82, radius)) * 0.82 + (random() - 0.5) * 0.12,
          0.08,
          1
        );
      };

      const points = new Float32Array(this.options.maxPoints * STRIDE_FLOATS);
      let pointIndex = 0;
      let attempts = 0;
      const maximumPointAttempts = this.options.maxPoints * 55;

      while (pointIndex < this.options.maxPoints && attempts < maximumPointAttempts) {
        attempts += 1;
        const x = random() * width;
        const y = random() * height;
        const luminance = readLuminance(x, y);
        const energy = Math.max(0, (luminance - 0.014) / 0.986);
        const acceptance = Math.min(0.96, Math.pow(energy, 0.58) * 1.34);

        if (random() > acceptance) continue;

        const mappedLum = clamp(Math.pow(luminance, 0.55) * 1.34, 0.035, 1);
        let size = 0.58 + mappedLum * 1.72 + random() * 0.72;
        if (mappedLum > 0.76 && random() > 0.72) size += 1.1 + random() * 1.35;

        const offset = pointIndex * STRIDE_FLOATS;
        points[offset] = (x + random() - 0.5) / width;
        points[offset + 1] = (y + random() - 0.5) / height;
        points[offset + 2] = mappedLum;
        points[offset + 3] = size;
        points[offset + 4] = random() * Math.PI * 2;
        points[offset + 5] = depthAt(x, y);
        pointIndex += 1;
      }

      const lines = new Float32Array(this.options.maxLines * 2 * STRIDE_FLOATS);
      let lineIndex = 0;
      attempts = 0;
      const maximumLineAttempts = this.options.maxLines * 70;

      while (lineIndex < this.options.maxLines && attempts < maximumLineAttempts) {
        attempts += 1;
        const x = 3 + random() * (width - 6);
        const y = 3 + random() * (height - 6);
        const luminance = readLuminance(x, y);
        const energy = Math.max(0, (luminance - 0.035) / 0.965);
        const acceptance = Math.min(0.9, Math.pow(energy, 0.68) * 1.1);

        if (random() > acceptance) continue;

        const gradientX = readLuminance(x + 2, y) - readLuminance(x - 2, y);
        const gradientY = readLuminance(x, y + 2) - readLuminance(x, y - 2);
        let tangentX = -gradientY;
        let tangentY = gradientX;
        let tangentLength = Math.hypot(tangentX, tangentY);

        if (tangentLength < 0.008) {
          const centerX = x - width / 2;
          const centerY = y - height / 2;
          tangentX = -centerY;
          tangentY = centerX;
          tangentLength = Math.max(1, Math.hypot(tangentX, tangentY));
        }

        tangentX /= tangentLength;
        tangentY /= tangentLength;

        const mappedLum = clamp(Math.pow(luminance, 0.58) * 1.28, 0.06, 1);
        const length = 1.4 + mappedLum * 6.2 + random() * 3.2;
        const halfX = tangentX * length * 0.5;
        const halfY = tangentY * length * 0.5;
        const phase = random() * Math.PI * 2;
        const depth = depthAt(x, y);
        const size = 1;

        const firstOffset = lineIndex * 2 * STRIDE_FLOATS;
        const secondOffset = firstOffset + STRIDE_FLOATS;

        lines[firstOffset] = (x - halfX) / width;
        lines[firstOffset + 1] = (y - halfY) / height;
        lines[firstOffset + 2] = mappedLum;
        lines[firstOffset + 3] = size;
        lines[firstOffset + 4] = phase;
        lines[firstOffset + 5] = depth;

        lines[secondOffset] = (x + halfX) / width;
        lines[secondOffset + 1] = (y + halfY) / height;
        lines[secondOffset + 2] = mappedLum;
        lines[secondOffset + 3] = size;
        lines[secondOffset + 4] = phase;
        lines[secondOffset + 5] = depth;
        lineIndex += 1;
      }

      return {
        points: pointIndex === this.options.maxPoints
          ? points
          : points.slice(0, pointIndex * STRIDE_FLOATS),
        lines: lineIndex === this.options.maxLines
          ? lines
          : lines.slice(0, lineIndex * 2 * STRIDE_FLOATS),
      };
    }

    createBuffer(data) {
      const gl = this.gl;
      const buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
      return buffer;
    }

    resize(force = false) {
      if (!this.gl) return;
      const rectangle = this.canvas.getBoundingClientRect();
      const cssWidth = Math.max(1, Math.round(rectangle.width));
      const cssHeight = Math.max(1, Math.round(rectangle.height));
      const dpr = Math.min(1.5, window.devicePixelRatio || 1);
      const pixelWidth = Math.max(1, Math.round(cssWidth * dpr));
      const pixelHeight = Math.max(1, Math.round(cssHeight * dpr));

      if (
        force
        || this.canvas.width !== pixelWidth
        || this.canvas.height !== pixelHeight
      ) {
        this.canvas.width = pixelWidth;
        this.canvas.height = pixelHeight;
        this.cssWidth = cssWidth;
        this.cssHeight = cssHeight;
        this.dpr = dpr;
        this.gl.viewport(0, 0, pixelWidth, pixelHeight);
      }
    }

    bindAttributes(programInfo, buffer) {
      const gl = this.gl;
      const attributes = programInfo.attributes;
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);

      gl.enableVertexAttribArray(attributes.position);
      gl.vertexAttribPointer(attributes.position, 2, gl.FLOAT, false, STRIDE_BYTES, 0);
      gl.enableVertexAttribArray(attributes.lum);
      gl.vertexAttribPointer(attributes.lum, 1, gl.FLOAT, false, STRIDE_BYTES, 8);
      gl.enableVertexAttribArray(attributes.size);
      gl.vertexAttribPointer(attributes.size, 1, gl.FLOAT, false, STRIDE_BYTES, 12);
      gl.enableVertexAttribArray(attributes.phase);
      gl.vertexAttribPointer(attributes.phase, 1, gl.FLOAT, false, STRIDE_BYTES, 16);
      gl.enableVertexAttribArray(attributes.depth);
      gl.vertexAttribPointer(attributes.depth, 1, gl.FLOAT, false, STRIDE_BYTES, 20);
    }

    setUniforms(programInfo, time, gazeX, gazeY, approach, passAlpha) {
      const gl = this.gl;
      const uniforms = programInfo.uniforms;
      gl.uniform2f(uniforms.resolution, this.cssWidth, this.cssHeight);
      gl.uniform2f(uniforms.imageSize, this.imageWidth, this.imageHeight);
      gl.uniform2f(uniforms.gazePx, gazeX, gazeY);
      gl.uniform1f(uniforms.time, time);
      gl.uniform1f(uniforms.approach, approach);
      gl.uniform1f(uniforms.dpr, this.dpr);
      gl.uniform1f(uniforms.motion, this.options.reducedMotion ? 0 : 1);
      gl.uniform1f(uniforms.passAlpha, passAlpha);
    }

    draw(programInfo, buffer, mode, count, time, gazeX, gazeY, approach, passAlpha) {
      const gl = this.gl;
      gl.useProgram(programInfo.program);
      this.bindAttributes(programInfo, buffer);
      this.setUniforms(programInfo, time, gazeX, gazeY, approach, passAlpha);
      gl.drawArrays(mode, 0, count);
    }

    render(time, gazeX, gazeY, approach) {
      if (!this.ready || this.lost) return;
      this.resize();

      const gl = this.gl;
      const isCompact = this.cssWidth < 720;
      const pointCount = isCompact
        ? Math.min(this.pointCount, this.options.mobilePoints)
        : this.pointCount;
      const lineVertexCount = isCompact
        ? Math.min(this.lineVertexCount, this.options.mobileLines * 2)
        : this.lineVertexCount;

      if (this.activePointCount !== pointCount || this.activeLineVertexCount !== lineVertexCount) {
        this.activePointCount = pointCount;
        this.activeLineVertexCount = lineVertexCount;
        this.canvas.dataset.activePointCount = String(pointCount);
        this.canvas.dataset.activeLineVertexCount = String(lineVertexCount);
      }

      gl.clear(gl.COLOR_BUFFER_BIT);
      this.draw(
        this.lineProgram,
        this.lineBuffer,
        gl.LINES,
        lineVertexCount,
        time,
        gazeX,
        gazeY,
        approach,
        0.42
      );
      this.draw(
        this.pointProgram,
        this.pointBuffer,
        gl.POINTS,
        pointCount,
        time,
        gazeX,
        gazeY,
        approach,
        1
      );
    }

    destroy() {
      if (!this.gl) return;
      const gl = this.gl;
      gl.deleteBuffer(this.pointBuffer);
      gl.deleteBuffer(this.lineBuffer);
      gl.deleteProgram(this.pointProgram && this.pointProgram.program);
      gl.deleteProgram(this.lineProgram && this.lineProgram.program);
      this.canvas.removeEventListener('webglcontextlost', this.handleContextLost);
      this.canvas.removeEventListener('webglcontextrestored', this.handleContextRestored);
      this.ready = false;
    }
  }

  window.ParticleEye = ParticleEye;
})();
