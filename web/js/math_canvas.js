/**
 * MathMotion Studio - Real-time 60 FPS Mathematical Canvas Engine
 * With Direct Object Dragging (UCD), Audio Synthesis, and Phase Space.
 */

class MathCanvasEngine {
  constructor(canvasId, hudId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    this.hud = document.getElementById(hudId);

    this.sceneType = 'collision_pi';
    this.config = {};
    
    // Playback state
    this.isPlaying = true;
    this.currentTime = 0.0;
    this.duration = 6.0;
    this.playbackSpeed = 1.0;
    this.isLooping = true;
    this.showGrid = true;
    this.audioEnabled = true;

    // Interactive Dragging State
    this.isDragging = false;
    this.dragTarget = null; // 'b1', 'b2', 'tangent_x', 'basis_i', 'basis_j'
    this.hoverTarget = null;
    this.tangentUserX = 0.5;

    // Simulation states
    this.collisionState = null;
    this.lastFrameTime = performance.now();
    this.audioCtx = null;

    // Resize handling
    this.resize();
    window.addEventListener('resize', () => this.resize());

    // Init Mouse / Touch interaction
    this.initInteraction();

    // Start render loop
    this.loop = this.loop.bind(this);
    requestAnimationFrame(this.loop);
  }

  resize() {
    if (!this.canvas) return;
    const rect = this.canvas.parentElement.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.ctx.scale(dpr, dpr);
    this.width = rect.width;
    this.height = rect.height;
  }

  setScene(type, config) {
    this.sceneType = type;
    this.config = { ...config };
    this.resetSimulation();
  }

  updateConfig(key, value) {
    this.config[key] = value;
    this.resetSimulation();
  }

  resetSimulation() {
    this.currentTime = 0.0;
    
    if (this.sceneType === 'collision_pi') {
      const digits = parseInt(this.config.digits || 2);
      const m2 = Math.pow(100, digits - 1);
      this.collisionState = {
        m1: 1.0,
        m2: m2,
        s1: 34,
        s2: 56,
        p1: 220,
        p2: 450,
        v1: 0.0,
        v2: -160.0,
        wallX: 80,
        collisions: 0,
        history: [],
        expected: Math.floor(Math.PI * Math.sqrt(m2))
      };
    }
  }

  play() { this.isPlaying = true; }
  pause() { this.isPlaying = false; }
  togglePlay() { this.isPlaying = !this.isPlaying; return this.isPlaying; }

  seek(progressNormalized) {
    this.currentTime = progressNormalized * this.duration;
    if (this.sceneType === 'collision_pi') {
      this.simulateCollisionUpTo(this.currentTime);
    }
  }

  // =========================================================================
  // Interactive Direct Manipulation (UCD)
  // =========================================================================
  initInteraction() {
    const getPos = (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      return {
        x: clientX - rect.left,
        y: clientY - rect.top
      };
    };

    const onDown = (e) => {
      const pos = getPos(e);
      const target = this.checkHit(pos.x, pos.y);
      if (target) {
        this.isDragging = true;
        this.dragTarget = target;
        this.canvas.style.cursor = 'grabbing';
      }
    };

    const onMove = (e) => {
      const pos = getPos(e);
      if (this.isDragging && this.dragTarget) {
        this.handleDrag(this.dragTarget, pos.x, pos.y);
      } else {
        const hit = this.checkHit(pos.x, pos.y);
        this.hoverTarget = hit;
        this.canvas.style.cursor = hit ? 'grab' : 'crosshair';
      }
    };

    const onUp = () => {
      this.isDragging = false;
      this.dragTarget = null;
      this.canvas.style.cursor = 'crosshair';
    };

    this.canvas.addEventListener('mousedown', onDown);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);

    this.canvas.addEventListener('touchstart', onDown, { passive: true });
    window.addEventListener('touchmove', onMove, { passive: true });
    window.addEventListener('touchend', onUp);
  }

  checkHit(mx, my) {
    const w = this.width;
    const h = this.height;

    if (this.sceneType === 'collision_pi' && this.collisionState) {
      const st = this.collisionState;
      const floorY = h * 0.7;
      const b1x = st.p1;
      const b1y = floorY - st.s1 / 2;
      const b2x = st.p2;
      const b2y = floorY - st.s2 / 2;

      if (Math.hypot(mx - b1x, my - b1y) < st.s1) return 'b1';
      if (Math.hypot(mx - b2x, my - b2y) < st.s2) return 'b2';
    } else if (this.sceneType === 'calculus_riemann') {
      const ox = w * 0.45;
      const oy = h * 0.65;
      const scaleX = 65;
      const scaleY = 45;
      const f = (x) => 0.15 * Math.pow(x, 3) - 0.6 * x + 2.2;
      const tX = this.tangentUserX;
      const tY = f(tX);
      const tPx = ox + tX * scaleX;
      const tPy = oy - tY * scaleY;
      if (Math.hypot(mx - tPx, my - tPy) < 20) return 'tangent_x';
    } else if (this.sceneType === 'linear_transformation') {
      const ox = w * 0.5;
      const oy = h * 0.5;
      const unit = 50;
      const a = parseFloat(this.config.a ?? 1.0);
      const b = parseFloat(this.config.b ?? 1.0);
      const c = parseFloat(this.config.c ?? 0.0);
      const d = parseFloat(this.config.d ?? 1.0);
      const pi = this.transformPoint(1, 0, a, b, c, d, ox, oy, unit);
      const pj = this.transformPoint(0, 1, a, b, c, d, ox, oy, unit);

      if (Math.hypot(mx - pi.x, my - pi.y) < 18) return 'basis_i';
      if (Math.hypot(mx - pj.x, my - pj.y) < 18) return 'basis_j';
    }
    return null;
  }

  handleDrag(target, mx, my) {
    const w = this.width;
    const h = this.height;

    if (this.sceneType === 'collision_pi' && this.collisionState) {
      const st = this.collisionState;
      if (target === 'b1') {
        st.p1 = Math.max(st.wallX + st.s1 / 2 + 5, Math.min(st.p2 - st.s2 / 2 - st.s1 / 2 - 5, mx));
        st.v1 = 0;
      } else if (target === 'b2') {
        st.p2 = Math.max(st.p1 + st.s1 / 2 + st.s2 / 2 + 5, Math.min(w - 60, mx));
        st.v2 = -160;
      }
    } else if (this.sceneType === 'calculus_riemann' && target === 'tangent_x') {
      const ox = w * 0.45;
      const scaleX = 65;
      this.tangentUserX = Math.max(-2.5, Math.min(3.2, (mx - ox) / scaleX));
    } else if (this.sceneType === 'linear_transformation') {
      const ox = w * 0.5;
      const oy = h * 0.5;
      const unit = 50;
      if (target === 'basis_i') {
        const newA = parseFloat(((mx - ox) / unit).toFixed(1));
        const newC = parseFloat(((oy - my) / unit).toFixed(1));
        this.config.a = newA;
        this.config.c = newC;
        if (window.onMatrixDragUpdate) window.onMatrixDragUpdate(newA, this.config.b, newC, this.config.d);
      } else if (target === 'basis_j') {
        const newB = parseFloat(((mx - ox) / unit).toFixed(1));
        const newD = parseFloat(((oy - my) / unit).toFixed(1));
        this.config.b = newB;
        this.config.d = newD;
        if (window.onMatrixDragUpdate) window.onMatrixDragUpdate(this.config.a, newB, this.config.c, newD);
      }
    }
  }

  playCollisionSound() {
    if (!this.audioEnabled) return;
    try {
      if (!this.audioCtx) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        this.audioCtx = new AudioContext();
      }
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440, this.audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(120, this.audioCtx.currentTime + 0.04);
      
      gain.gain.setValueAtTime(0.3, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + 0.04);
      
      osc.connect(gain);
      gain.connect(this.audioCtx.destination);
      
      osc.start();
      osc.stop(this.audioCtx.currentTime + 0.04);
    } catch (e) {}
  }

  loop(now) {
    const dtReal = (now - this.lastFrameTime) / 1000.0;
    this.lastFrameTime = now;

    if (this.isPlaying && !this.isDragging) {
      const dt = Math.min(dtReal, 0.1) * this.playbackSpeed;
      this.currentTime += dt;
      
      if (this.currentTime >= this.duration) {
        if (this.isLooping) {
          this.currentTime = 0;
          this.resetSimulation();
        } else {
          this.currentTime = this.duration;
          this.isPlaying = false;
        }
      }
    }

    this.render();
    
    if (window.onCanvasTimeUpdate) {
      window.onCanvasTimeUpdate(this.currentTime, this.duration);
    }

    requestAnimationFrame(this.loop);
  }

  render() {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    // Clear background
    ctx.fillStyle = '#070a14';
    ctx.fillRect(0, 0, w, h);

    if (this.showGrid) {
      this.drawGrid(ctx, w, h);
    }

    if (this.sceneType === 'collision_pi') {
      this.renderCollisionPi(ctx, w, h);
    } else if (this.sceneType === 'calculus_riemann') {
      this.renderCalculus(ctx, w, h);
    } else if (this.sceneType === 'linear_transformation') {
      this.renderLinearTransformation(ctx, w, h);
    } else if (this.sceneType === 'fourier_epicycles') {
      this.renderFourier(ctx, w, h);
    } else if (this.sceneType === 'trig_unit_circle') {
      this.renderTrigCircle(ctx, w, h);
    } else if (this.sceneType === 'latex_proof') {
      this.renderLatexProof(ctx, w, h);
    } else if (this.sceneType === 'storyboard') {
      this.renderStoryboard(ctx, w, h);
    }
  }

  drawGrid(ctx, w, h) {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.lineWidth = 1;
    const step = 40;
    
    for (let x = 0; x < w; x += step) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += step) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
  }

  // =========================================================================
  // 1. COLLISION PI SIMULATION
  // =========================================================================
  simulateCollisionUpTo(targetTime) {
    const digits = parseInt(this.config.digits || 2);
    const m2 = Math.pow(100, digits - 1);
    this.collisionState = {
      m1: 1.0,
      m2: m2,
      s1: 34,
      s2: 56,
      p1: 220,
      p2: 450,
      v1: 0.0,
      v2: -160.0,
      wallX: 80,
      collisions: 0,
      history: [],
      expected: Math.floor(Math.PI * Math.sqrt(m2))
    };

    let simT = 0;
    const dtStep = 0.005;
    while (simT < targetTime) {
      this.stepCollision(dtStep);
      simT += dtStep;
    }
  }

  stepCollision(dt) {
    const st = this.collisionState;
    if (!st) return;

    let subSteps = 4;
    let sdt = dt / subSteps;

    for (let i = 0; i < subSteps; i++) {
      st.p1 += st.v1 * sdt;
      st.p2 += st.v2 * sdt;

      if (st.p1 - st.s1 / 2 <= st.wallX) {
        st.p1 = st.wallX + st.s1 / 2;
        st.v1 = -st.v1;
        st.collisions++;
        this.playCollisionSound();
        st.history.push({ v1: st.v1, v2: st.v2 });
      }

      if (st.p1 + st.s1 / 2 >= st.p2 - st.s2 / 2) {
        st.p1 = (st.p2 - st.s2 / 2) - st.s1 / 2;
        const nv1 = ((st.m1 - st.m2) * st.v1 + 2 * st.m2 * st.v2) / (st.m1 + st.m2);
        const nv2 = (2 * st.m1 * st.v1 + (st.m2 - st.m1) * st.v2) / (st.m1 + st.m2);
        st.v1 = nv1;
        st.v2 = nv2;
        st.collisions++;
        this.playCollisionSound();
        st.history.push({ v1: st.v1, v2: st.v2 });
      }
    }
  }

  renderCollisionPi(ctx, w, h) {
    if (!this.collisionState) this.resetSimulation();
    if (this.isPlaying && !this.isDragging) {
      this.stepCollision(0.016 * this.playbackSpeed);
    }

    const st = this.collisionState;
    const floorY = h * 0.7;
    const wallX = st.wallX;

    // Floor and Wall
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(wallX, floorY);
    ctx.lineTo(w - 40, floorY);
    ctx.stroke();

    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(wallX, floorY);
    ctx.lineTo(wallX, floorY - 220);
    ctx.stroke();

    // Wall hatch marks
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 2;
    for (let y = floorY - 210; y <= floorY; y += 20) {
      ctx.beginPath();
      ctx.moveTo(wallX, y);
      ctx.lineTo(wallX - 16, y - 10);
      ctx.stroke();
    }

    // Small Block (m1)
    const b1x = Math.max(wallX + st.s1 / 2, st.p1);
    const b1y = floorY - st.s1 / 2;
    ctx.fillStyle = '#3b82f6';
    ctx.strokeStyle = this.hoverTarget === 'b1' ? '#93c5fd' : '#60a5fa';
    ctx.lineWidth = this.hoverTarget === 'b1' ? 4 : 2;
    ctx.fillRect(b1x - st.s1 / 2, b1y - st.s1 / 2, st.s1, st.s1);
    ctx.strokeRect(b1x - st.s1 / 2, b1y - st.s1 / 2, st.s1, st.s1);
    
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px Inter';
    ctx.textAlign = 'center';
    ctx.fillText('1 kg', b1x, b1y + 4);

    // Large Block (m2)
    const b2x = Math.max(b1x + st.s1 / 2 + st.s2 / 2, st.p2);
    const b2y = floorY - st.s2 / 2;
    ctx.fillStyle = '#8b5cf6';
    ctx.strokeStyle = this.hoverTarget === 'b2' ? '#c4b5fd' : '#a78bfa';
    ctx.lineWidth = this.hoverTarget === 'b2' ? 4 : 2;
    ctx.fillRect(b2x - st.s2 / 2, b2y - st.s2 / 2, st.s2, st.s2);
    ctx.strokeRect(b2x - st.s2 / 2, b2y - st.s2 / 2, st.s2, st.s2);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 13px Inter';
    ctx.fillText(`${st.m2} kg`, b2x, b2y + 4);

    // Title banner
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 18px Outfit';
    ctx.textAlign = 'left';
    ctx.fillText("Computing \u03c0 with Elastic Collisions (Galperin's Method)", 40, 45);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '13px Inter';
    ctx.fillText(`Mass Ratio: ${st.m2}:1  \u27F6  Expected Collisions: ${st.expected}`, 40, 70);

    // Update HUD
    if (this.hud) {
      const digits = parseInt(this.config.digits || 2);
      const piApprox = (st.collisions / Math.pow(10, digits - 1)).toFixed(digits - 1);
      this.hud.innerHTML = `
        <div class="hud-card">
          <div class="hud-title">Collisions Count</div>
          <div class="hud-value" style="color: #fbbf24;">${st.collisions} <span style="font-size:13px; color:#94a3b8;">/ ${st.expected}</span></div>
        </div>
        <div class="hud-card">
          <div class="hud-title">\u03c0 Approximation</div>
          <div class="hud-value" style="color: #34d399;">\u03c0 \u2248 ${piApprox}</div>
        </div>
      `;
    }

    this.drawPhaseSpace(ctx, w - 160, 180, 75, st);
  }

  drawPhaseSpace(ctx, cx, cy, r, st) {
    ctx.save();
    ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, r + 15, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = '#475569';
    ctx.beginPath();
    ctx.moveTo(cx - r, cy);
    ctx.lineTo(cx + r, cy);
    ctx.moveTo(cx, cy - r);
    ctx.lineTo(cx, cy + r);
    ctx.stroke();

    ctx.strokeStyle = '#06b6d4';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px Inter';
    ctx.textAlign = 'center';
    ctx.fillText('Velocity Phase Space', cx, cy - r - 6);

    const sqrtM = Math.sqrt(st.m2);
    const scale = r / (160.0 * sqrtM);
    const px = cx + st.v1 * scale * sqrtM;
    const py = cy - st.v2 * scale * sqrtM;

    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.arc(px, py, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // =========================================================================
  // 2. CALCULUS & RIEMANN SUMS
  // =========================================================================
  renderCalculus(ctx, w, h) {
    const ox = w * 0.45;
    const oy = h * 0.65;
    const scaleX = 65;
    const scaleY = 45;

    const n = parseInt(this.config.num_rects || 16);
    const xMin = parseFloat(this.config.x_min || -2);
    const xMax = parseFloat(this.config.x_max || 3);
    const method = this.config.method || 'midpoint';

    const f = (x) => 0.15 * Math.pow(x, 3) - 0.6 * x + 2.2;

    // Axes
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(40, oy);
    ctx.lineTo(w - 40, oy);
    ctx.moveTo(ox, 40);
    ctx.lineTo(ox, h - 40);
    ctx.stroke();

    // Riemann Rectangles
    const dx = (xMax - xMin) / n;
    let sumArea = 0;

    for (let i = 0; i < n; i++) {
      const leftX = xMin + i * dx;
      const rightX = leftX + dx;
      let sampleX = leftX;
      if (method === 'right') sampleX = rightX;
      if (method === 'midpoint') sampleX = leftX + dx / 2;

      const sampleY = f(sampleX);
      sumArea += sampleY * dx;

      const rx = ox + leftX * scaleX;
      const rw = dx * scaleX;
      const ry = oy - sampleY * scaleY;
      const rh = sampleY * scaleY;

      const grad = ctx.createLinearGradient(rx, ry, rx, oy);
      grad.addColorStop(0, 'rgba(6, 182, 212, 0.7)');
      grad.addColorStop(1, 'rgba(99, 102, 241, 0.4)');

      ctx.fillStyle = grad;
      ctx.fillRect(rx, Math.min(ry, oy), rw, Math.abs(rh));
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1;
      ctx.strokeRect(rx, Math.min(ry, oy), rw, Math.abs(rh));
    }

    // Function Curve
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    for (let px = 40; px < w - 40; px += 3) {
      const x = (px - ox) / scaleX;
      const y = f(x);
      const py = oy - y * scaleY;
      if (px === 40) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();

    // Tangent Line (Interactive or Auto-sweep)
    let tX = this.tangentUserX;
    if (this.isPlaying && !this.isDragging) {
      tX = -1.5 + (this.currentTime / this.duration) * 4.0;
      this.tangentUserX = tX;
    }
    const tY = f(tX);
    const slope = 0.45 * Math.pow(tX, 2) - 0.6;
    const tPx = ox + tX * scaleX;
    const tPy = oy - tY * scaleY;

    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(tPx - 70, tPy + 70 * slope * (scaleY / scaleX));
    ctx.lineTo(tPx + 70, tPy - 70 * slope * (scaleY / scaleX));
    ctx.stroke();

    // Tangent point handle
    ctx.fillStyle = this.hoverTarget === 'tangent_x' ? '#fbbf24' : '#ef4444';
    ctx.beginPath();
    ctx.arc(tPx, tPy, this.hoverTarget === 'tangent_x' ? 7 : 5, 0, Math.PI * 2);
    ctx.fill();

    // Title & HUD
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 18px Outfit';
    ctx.fillText("Calculus: Riemann Sums & Definite Integrals", 40, 45);

    if (this.hud) {
      this.hud.innerHTML = `
        <div class="hud-card">
          <div class="hud-title">Riemann Rectangles (N)</div>
          <div class="hud-value" style="color: #38bdf8;">${n}</div>
        </div>
        <div class="hud-card">
          <div class="hud-title">Approximated Area \u222B f(x) dx</div>
          <div class="hud-value" style="color: #fbbf24;">${sumArea.toFixed(3)}</div>
        </div>
      `;
    }
  }

  // =========================================================================
  // 3. LINEAR ALGEBRA & MATRIX TRANSFORMATIONS
  // =========================================================================
  renderLinearTransformation(ctx, w, h) {
    const ox = w * 0.5;
    const oy = h * 0.5;
    const unit = 50;

    const a = parseFloat(this.config.a ?? 1.0);
    const b = parseFloat(this.config.b ?? 1.0);
    const c = parseFloat(this.config.c ?? 0.0);
    const d = parseFloat(this.config.d ?? 1.0);

    const progress = this.isDragging ? 1.0 : Math.min(1.0, this.currentTime / 2.5);
    const curA = 1.0 + (a - 1.0) * progress;
    const curB = 0.0 + b * progress;
    const curC = 0.0 + c * progress;
    const curD = 1.0 + (d - 1.0) * progress;

    const det = curA * curD - curB * curC;

    // Transformed Grid Lines
    ctx.lineWidth = 1;
    for (let i = -8; i <= 8; i++) {
      ctx.strokeStyle = i === 0 ? '#64748b' : 'rgba(99, 102, 241, 0.2)';
      ctx.beginPath();
      const p1 = this.transformPoint(i, -8, curA, curB, curC, curD, ox, oy, unit);
      const p2 = this.transformPoint(i, 8, curA, curB, curC, curD, ox, oy, unit);
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();

      ctx.strokeStyle = i === 0 ? '#64748b' : 'rgba(6, 182, 212, 0.2)';
      ctx.beginPath();
      const q1 = this.transformPoint(-8, i, curA, curB, curC, curD, ox, oy, unit);
      const q2 = this.transformPoint(8, i, curA, curB, curC, curD, ox, oy, unit);
      ctx.moveTo(q1.x, q1.y);
      ctx.lineTo(q2.x, q2.y);
      ctx.stroke();
    }

    // Determinant Parallelogram
    const p0 = this.transformPoint(0, 0, curA, curB, curC, curD, ox, oy, unit);
    const pi = this.transformPoint(1, 0, curA, curB, curC, curD, ox, oy, unit);
    const pj = this.transformPoint(0, 1, curA, curB, curC, curD, ox, oy, unit);
    const pij = this.transformPoint(1, 1, curA, curB, curC, curD, ox, oy, unit);

    ctx.fillStyle = 'rgba(245, 158, 11, 0.35)';
    ctx.beginPath();
    ctx.moveTo(p0.x, p0.y);
    ctx.lineTo(pi.x, pi.y);
    ctx.lineTo(pij.x, pij.y);
    ctx.lineTo(pj.x, pj.y);
    ctx.closePath();
    ctx.fill();

    // Basis Vectors
    this.drawArrow(ctx, p0.x, p0.y, pi.x, pi.y, '#10b981', '\u00EE', this.hoverTarget === 'basis_i');
    this.drawArrow(ctx, p0.x, p0.y, pj.x, pj.y, '#f43f5e', '\u0135', this.hoverTarget === 'basis_j');

    // Title & HUD
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 18px Outfit';
    ctx.fillText("2D Matrix Transformation T(v) = Av", 40, 45);

    if (this.hud) {
      this.hud.innerHTML = `
        <div class="hud-card">
          <div class="hud-title">Matrix Determinant (Area Scale)</div>
          <div class="hud-value" style="color: #f59e0b;">det(A) = ${det.toFixed(2)}</div>
        </div>
      `;
    }
  }

  transformPoint(x, y, a, b, c, d, ox, oy, unit) {
    const tx = a * x + b * y;
    const ty = c * x + d * y;
    return {
      x: ox + tx * unit,
      y: oy - ty * unit
    };
  }

  drawArrow(ctx, fromX, fromY, toX, toY, color, label, isHovered = false) {
    const headLen = 11;
    const angle = Math.atan2(toY - fromY, toX - fromX);

    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = isHovered ? 5 : 3.5;

    ctx.beginPath();
    ctx.moveTo(fromX, fromY);
    ctx.lineTo(toX, toY);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(toX, toY);
    ctx.lineTo(toX - headLen * Math.cos(angle - Math.PI / 6), toY - headLen * Math.sin(angle - Math.PI / 6));
    ctx.lineTo(toX - headLen * Math.cos(angle + Math.PI / 6), toY - headLen * Math.sin(angle + Math.PI / 6));
    ctx.closePath();
    ctx.fill();

    if (isHovered) {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(toX, toY, 10, 0, Math.PI * 2);
      ctx.stroke();
    }

    if (label) {
      ctx.font = 'bold 14px Inter';
      ctx.fillText(label, toX + 14 * Math.cos(angle), toY + 14 * Math.sin(angle));
    }
  }

  // =========================================================================
  // 4. FOURIER EPICYCLES
  // =========================================================================
  renderFourier(ctx, w, h) {
    const ox = w * 0.5;
    const oy = h * 0.52;
    const harmonics = parseInt(this.config.harmonics || 12);
    const shape = this.config.shape || 'heart';

    const t = (this.currentTime / this.duration) * Math.PI * 2;
    let curX = ox;
    let curY = oy;

    ctx.lineWidth = 1.2;
    for (let k = 1; k <= harmonics; k++) {
      let r = (90 / k);
      if (shape === 'heart') r = (110 / (2 * k - 1));

      const freq = (2 * k - 1);
      const nextX = curX + r * Math.cos(freq * t);
      const nextY = curY + r * Math.sin(freq * t);

      ctx.strokeStyle = 'rgba(99, 102, 241, 0.35)';
      ctx.beginPath();
      ctx.arc(curX, curY, r, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = '#f59e0b';
      ctx.beginPath();
      ctx.moveTo(curX, curY);
      ctx.lineTo(nextX, nextY);
      ctx.stroke();

      curX = nextX;
      curY = nextY;
    }

    ctx.fillStyle = '#ec4899';
    ctx.beginPath();
    ctx.arc(curX, curY, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 18px Outfit';
    ctx.fillText("Fourier Epicycles: Drawing with Rotating Circles", 40, 45);

    if (this.hud) {
      this.hud.innerHTML = `
        <div class="hud-card">
          <div class="hud-title">Rotating Harmonics</div>
          <div class="hud-value" style="color: #ec4899;">${harmonics} Circles</div>
        </div>
      `;
    }
  }

  // =========================================================================
  // 5. TRIGONOMETRY & UNIT CIRCLE
  // =========================================================================
  renderTrigCircle(ctx, w, h) {
    const cx = w * 0.28;
    const cy = h * 0.55;
    const r = 90;
    const waveOx = w * 0.52;

    const angle = (this.currentTime / this.duration) * Math.PI * 3;

    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(cx - r - 20, cy);
    ctx.lineTo(cx + r + 20, cy);
    ctx.moveTo(cx, cy - r - 20);
    ctx.lineTo(cx, cy + r + 20);
    ctx.stroke();

    const px = cx + r * Math.cos(angle);
    const py = cy - r * Math.sin(angle);

    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(px, py);
    ctx.stroke();

    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(px, cy);
    ctx.lineTo(px, py);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(239, 68, 68, 0.6)';
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(waveOx + (angle * 35), py);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.strokeStyle = '#475569';
    ctx.beginPath();
    ctx.moveTo(waveOx, cy);
    ctx.lineTo(w - 40, cy);
    ctx.stroke();

    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let a = 0; a <= angle; a += 0.05) {
      const wx = waveOx + a * 35;
      const wy = cy - r * Math.sin(a);
      if (a === 0) ctx.moveTo(wx, wy);
      else ctx.lineTo(wx, wy);
    }
    ctx.stroke();

    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 18px Outfit';
    ctx.fillText("Trigonometry: Unwinding the Sine Wave", 40, 45);

    if (this.hud) {
      this.hud.innerHTML = `
        <div class="hud-card">
          <div class="hud-title">Current Angle (\u03B8)</div>
          <div class="hud-value" style="color: #38bdf8;">${(angle % (2 * Math.PI)).toFixed(2)} rad</div>
        </div>
        <div class="hud-card">
          <div class="hud-title">sin(\u03B8)</div>
          <div class="hud-value" style="color: #10b981;">${Math.sin(angle).toFixed(3)}</div>
        </div>
      `;
    }
  }

  // =========================================================================
  // 6. LATEX PROOF MORPHING
  // =========================================================================
  renderLatexProof(ctx, w, h) {
    const steps = this.config.steps || [
      "e^{i\\theta} = \\cos(\\theta) + i\\sin(\\theta)",
      "\\text{Let } \\theta = \\pi",
      "e^{i\\pi} = \\cos(\\pi) + i\\sin(\\pi)",
      "e^{i\\pi} = -1 + 0",
      "e^{i\\pi} + 1 = 0"
    ];

    const stepIndex = Math.min(steps.length - 1, Math.floor((this.currentTime / this.duration) * steps.length));
    const formulaText = steps[stepIndex];

    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 20px Outfit';
    ctx.textAlign = 'center';
    ctx.fillText("Step-by-Step Mathematical Morphing", w / 2, 80);

    ctx.fillStyle = '#fbbf24';
    ctx.font = '28px "JetBrains Mono"';
    ctx.fillText(formulaText, w / 2, h / 2);

    if (this.hud) {
      this.hud.innerHTML = `
        <div class="hud-card">
          <div class="hud-title">Step Progress</div>
          <div class="hud-value" style="color: #fbbf24;">${stepIndex + 1} / ${steps.length}</div>
        </div>
      `;
    }
  }

  // =========================================================================
  // 7. STORYBOARD
  // =========================================================================
  renderStoryboard(ctx, w, h) {
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 20px Outfit';
    ctx.textAlign = 'center';
    ctx.fillText("Custom Visual Storyboard Director", w / 2, 80);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '14px Inter';
    ctx.fillText("Add and arrange storyboard beats below to compose your math animation sequence.", w / 2, 120);
  }
}

window.MathCanvasEngine = MathCanvasEngine;
