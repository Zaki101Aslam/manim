/**
 * MathMotion Studio - Main Application Orchestrator
 * User-Centered Design, Onboarding Tour, Educational Insights, Keyboard Shortcuts, and Usability.
 */

document.addEventListener('DOMContentLoaded', () => {
  // Standalone Desktop App Native Bridge (Zero Localhost / Zero Port)
  const NativeBridge = {
    isDesktop() {
      return !!(window.pywebview && window.pywebview.api);
    },
    async generateCode(project) {
      if (this.isDesktop()) {
        return await window.pywebview.api.generate_code(project);
      }
      try {
        const resp = await fetch('/api/generate-code', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ project })
        });
        return await resp.json();
      } catch (e) {
        return { status: 'error', message: e.message };
      }
    },
    async renderVideo(payload) {
      if (this.isDesktop()) {
        return await window.pywebview.api.render_video(payload);
      }
      try {
        const resp = await fetch('/api/render', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        return await resp.json();
      } catch (e) {
        return { status: 'error', message: e.message };
      }
    },
    async getVideos() {
      if (this.isDesktop()) {
        return await window.pywebview.api.get_videos();
      }
      try {
        const resp = await fetch('/api/videos');
        return await resp.json();
      } catch (e) {
        return { videos: [] };
      }
    },
    async openVideo(videoPath) {
      if (this.isDesktop() && window.pywebview.api.open_video) {
        return await window.pywebview.api.open_video(videoPath);
      }
      window.open(videoPath, '_blank');
    }
  };

  // Initialize Sub-systems
  const canvasEngine = new MathCanvasEngine('mathCanvas', 'mathHud');
  const mathTyper = new MathTyper();

  // Application State
  const state = {
    currentPreset: 'collision_pi',
    viewMode: 'canvas',
    config: {},
    storyboardBeats: [
      { id: 'b1', type: 'title', text: "Calculus & Limits", duration: 1.5 },
      { id: 'b2', type: 'formula', latex: "\\lim_{x \\to 0} \\frac{\\sin x}{x} = 1", duration: 2.0 },
      { id: 'b3', type: 'graph', function: "np.sin(x)/x", duration: 2.5 }
    ],
    renderedVideoUrl: null
  };

  // Educational Explanations (The Math Behind This)
  const mathInsights = {
    collision_pi: `
      <strong>Galperin's Billiards Theorem (1995):</strong><br>
      When a large mass $M = 100^{N-1}$ kg collides elastically with a $1$ kg mass against a wall, the total count of collisions precisely computes the first $N$ digits of $\\pi$!<br><br>
      <em>Why it works:</em> In the scaled velocity phase space $(v_1, \\sqrt{M}v_2)$, conservation of kinetic energy $\\frac{1}{2}m v_1^2 + \\frac{1}{2}M v_2^2 = E$ forms a perfect circle. Each collision corresponds to reflecting the state across a line by an angle $\\theta \\approx 2\\arcsin(1/\\sqrt{M})$. The number of reflections before moving away is $\\lfloor \\pi / \\theta \\rfloor = \\lfloor \\pi \\sqrt{M} \\rfloor$!
    `,
    calculus_riemann: `
      <strong>The Fundamental Theorem of Calculus:</strong><br>
      A definite integral $\\int_a^b f(x)\\,dx$ represents the exact continuous area under $f(x)$.<br><br>
      <em>Why it works:</em> We divide the interval $[a, b]$ into $N$ small rectangles of width $\\Delta x = \\frac{b-a}{N}$. As $N \\to \\infty$, the discrete Riemann sum $\\sum_{i=1}^N f(x_i)\\Delta x$ converges smoothly to the true analytical integral area.
    `,
    linear_transformation: `
      <strong>Geometric Linear Algebra & Determinants:</strong><br>
      A matrix $A = \\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}$ maps the standard basis vectors $\\hat{i} = (1,0) \\to (a,c)$ and $\\hat{j} = (0,1) \\to (b,d)$.<br><br>
      <em>Why it works:</em> Grid lines stay parallel and evenly spaced. The determinant $\\det(A) = ad - bc$ measures the exact factor by which any 2D area scales after the transformation!
    `,
    fourier_epicycles: `
      <strong>Fourier Series Harmonic Decomposition:</strong><br>
      Any continuous closed 2D loop can be drawn by a sum of rotating complex exponential vectors (epicycles) $c_n e^{i n \\omega t}$.<br><br>
      <em>Why it works:</em> Adding more rotating circles (higher frequency harmonics) captures finer, sharper geometric details of the curve.
    `,
    trig_unit_circle: `
      <strong>Trigonometry as Harmonic Motion:</strong><br>
      A point moving at constant angular velocity $\\omega$ around a unit circle projects its vertical height as $\\sin(\\theta)$ and horizontal position as $\\cos(\\theta)$.<br><br>
      <em>Why it works:</em> Unwinding the circular angle $\\theta$ onto a linear time axis generates the fundamental sinusoidal wave that underpins all acoustics, signal processing, and wave physics.
    `,
    latex_proof: `
      <strong>Euler's Identity & Proof Steps:</strong><br>
      Euler's formula $e^{i\\theta} = \\cos\\theta + i\\sin\\theta$ connects exponential growth to rotational trigonometry.<br><br>
      <em>Why it works:</em> Setting $\\theta = \\pi$ gives $e^{i\\pi} = -1$, yielding $e^{i\\pi} + 1 = 0$, linking five fundamental mathematical constants ($e, i, \\pi, 1, 0$) in one single equation.
    `,
    storyboard: `
      <strong>Visual Storyboard Director:</strong><br>
      Sequence animation beats chronologically. Combine titles, formulas, graphs, and morphing transitions to create an educational video narrative.
    `
  };

  // DOM Element References
  const presetSelect = document.getElementById('preset-select');
  const dynamicControls = document.getElementById('dynamic-controls-container');
  const conceptTitle = document.getElementById('concept-title');
  const btnResetDefaults = document.getElementById('btn-reset-defaults');
  const btnModeCanvas = document.getElementById('btn-mode-canvas');
  const btnModeVideo = document.getElementById('btn-mode-video');
  const videoPlayerWrap = document.getElementById('video-player-wrap');
  const manimVideoPlayer = document.getElementById('manimVideoPlayer');
  const videoEmptyState = document.getElementById('video-empty-state');
  
  // Transport Controls
  const btnPlayPause = document.getElementById('btn-play-pause');
  const playIcon = document.getElementById('play-icon');
  const btnReset = document.getElementById('btn-reset');
  const btnStepForward = document.getElementById('btn-step-forward');
  const currentTimeDisplay = document.getElementById('current-time');
  const totalDurationDisplay = document.getElementById('total-duration');
  const timelineScrubber = document.getElementById('timeline-scrubber');
  const playbackSpeedSelect = document.getElementById('playback-speed');
  const btnLoopToggle = document.getElementById('btn-loop-toggle');
  const btnAudioToggle = document.getElementById('btn-audio-toggle');
  const btnGridToggle = document.getElementById('btn-grid-toggle');
  const btnZoomFit = document.getElementById('btn-zoom-fit');

  // Render & Export
  const btnRenderManim = document.getElementById('btn-render-manim');
  const btnRenderEmpty = document.getElementById('btn-render-empty');
  const renderQualitySelect = document.getElementById('render-quality-select');
  const btnExportMenu = document.getElementById('btn-export-menu');
  const exportDropdown = document.getElementById('export-dropdown');
  const btnExportMp4 = document.getElementById('btn-export-mp4');
  const btnExportPng = document.getElementById('btn-export-png');
  const btnExportCode = document.getElementById('btn-export-code');
  const btnExportJson = document.getElementById('btn-export-json');

  // Right Drawer & Tabs
  const rightDrawer = document.getElementById('rightDrawer');
  const btnCloseDrawer = document.getElementById('btn-close-drawer');
  const drawerTabs = document.querySelectorAll('.drawer-tab');
  const tabContents = document.querySelectorAll('.tab-content');
  const pythonCodeDisplay = document.getElementById('pythonCodeDisplay');
  const btnCopyCode = document.getElementById('btn-copy-code');
  const galleryGrid = document.getElementById('galleryGrid');
  const btnRefreshGallery = document.getElementById('btn-refresh-gallery');
  const terminalLogs = document.getElementById('terminalLogs');

  // Educational Insight Card
  const insightToggleHeader = document.getElementById('insightToggleHeader');
  const insightBody = document.getElementById('insightBody');
  const insightContent = document.getElementById('insightContent');
  const insightArrow = document.getElementById('insightArrow');

  // Modals (Tour, Shortcuts)
  const welcomeTourModal = document.getElementById('welcomeTourModal');
  const btnCloseTour = document.getElementById('btn-close-tour');
  const btnStartExploring = document.getElementById('btn-start-exploring');
  const chkDontShowTour = document.getElementById('chk-dont-show-tour');
  const shortcutsModal = document.getElementById('shortcutsModal');
  const btnHelpModal = document.getElementById('btn-help-modal');
  const btnCloseShortcuts = document.getElementById('btn-close-shortcuts');
  const btnOkShortcuts = document.getElementById('btn-ok-shortcuts');

  // Storyboard
  const beatsTrack = document.getElementById('beatsTrack');
  const btnAddBeat = document.getElementById('btn-add-beat');
  const btnOpenMathTyper = document.getElementById('btn-open-math-typer');

  // =========================================================================
  // Preset Defaults
  // =========================================================================
  const presetDefaults = {
    collision_pi: {
      title: "Collision \u03c0 Discovery",
      digits: 2,
      b1_color: "BLUE",
      b2_color: "PURPLE",
      show_phase_space: true
    },
    calculus_riemann: {
      title: "Calculus: Riemann Sums & Integrals",
      func: "0.2 * x**3 - x + 2",
      num_rects: 16,
      x_min: -2,
      x_max: 3,
      method: "midpoint"
    },
    linear_transformation: {
      title: "2D Matrix Transformations",
      a: 1.0,
      b: 1.0,
      c: 0.0,
      d: 1.0
    },
    fourier_epicycles: {
      title: "Fourier Epicycles",
      harmonics: 12,
      shape: "heart"
    },
    trig_unit_circle: {
      title: "Unit Circle & Sine Wave",
      radius: 1.8,
      speed: 1.0
    },
    latex_proof: {
      title: "Euler's Formula & Morphing",
      steps: [
        "e^{i\\theta} = \\cos(\\theta) + i\\sin(\\theta)",
        "\\text{Let } \\theta = \\pi",
        "e^{i\\pi} = \\cos(\\pi) + i\\sin(\\pi)",
        "e^{i\\pi} = -1 + 0",
        "e^{i\\pi} + 1 = 0"
      ]
    },
    storyboard: {
      title: "Custom Storyboard Builder",
      beats: state.storyboardBeats
    }
  };

  function loadPreset(presetKey) {
    state.currentPreset = presetKey;
    state.config = JSON.parse(JSON.stringify(presetDefaults[presetKey]));
    conceptTitle.textContent = state.config.title || "Concept Parameters";
    
    renderDynamicControls(presetKey);
    canvasEngine.setScene(presetKey, state.config);
    updateMathInsight(presetKey);
    updateStoryboardTray();
    syncPythonCode();
    lucide.createIcons();
  }

  function updateMathInsight(presetKey) {
    if (insightContent && mathInsights[presetKey]) {
      insightContent.innerHTML = mathInsights[presetKey];
    }
  }

  // Insight Collapsible Toggle
  if (insightToggleHeader) {
    insightToggleHeader.addEventListener('click', () => {
      insightBody.classList.toggle('hidden');
      insightArrow.classList.toggle('collapsed');
    });
  }

  // =========================================================================
  // Reset Defaults (Error Recovery & Freedom)
  // =========================================================================
  btnResetDefaults.addEventListener('click', () => {
    state.config = JSON.parse(JSON.stringify(presetDefaults[state.currentPreset]));
    renderDynamicControls(state.currentPreset);
    canvasEngine.setScene(state.currentPreset, state.config);
    syncPythonCode();
    showToast("Reset to default parameters.", "info");
  });

  // =========================================================================
  // Render Dynamic Visual Parameter Controls (Zero Code Required)
  // =========================================================================
  function renderDynamicControls(presetKey) {
    dynamicControls.innerHTML = '';

    if (presetKey === 'collision_pi') {
      dynamicControls.innerHTML = `
        <div class="control-group">
          <div class="control-group-title">
            <span>\u03c0 Digits Precision</span>
            <span class="control-val-badge" id="val-digits">${state.config.digits} Digits</span>
          </div>
          <input type="range" id="slider-digits" min="1" max="4" value="${state.config.digits}" class="custom-slider" title="Set number of digits of pi to compute">
          <div class="control-row" style="margin-top: 4px;">
            <span class="control-label">Mass Ratio (100<sup>N-1</sup>):</span>
            <span class="control-val-badge" id="val-mass-ratio">${Math.pow(100, state.config.digits - 1)}:1</span>
          </div>
        </div>

        <div class="control-group">
          <div class="control-group-title">
            <span>Block Colors</span>
          </div>
          <div class="control-row">
            <span class="control-label">Block 1 (1 kg):</span>
            <select id="select-b1-color" class="custom-select small-select">
              <option value="BLUE" ${state.config.b1_color==='BLUE'?'selected':''}>Blue</option>
              <option value="TEAL" ${state.config.b1_color==='TEAL'?'selected':''}>Teal</option>
              <option value="GREEN" ${state.config.b1_color==='GREEN'?'selected':''}>Green</option>
            </select>
          </div>
          <div class="control-row" style="margin-top: 6px;">
            <span class="control-label">Block 2 (M kg):</span>
            <select id="select-b2-color" class="custom-select small-select">
              <option value="PURPLE" ${state.config.b2_color==='PURPLE'?'selected':''}>Purple</option>
              <option value="RED" ${state.config.b2_color==='RED'?'selected':''}>Red</option>
              <option value="GOLD" ${state.config.b2_color==='GOLD'?'selected':''}>Gold</option>
            </select>
          </div>
        </div>

        <div class="control-group">
          <div class="control-group-title">
            <span>Interactive Stage Controls</span>
          </div>
          <p style="font-size:11px; color:#94a3b8;">Tip: You can <strong>drag the blocks directly</strong> on the canvas to set new starting positions!</p>
        </div>
      `;

      document.getElementById('slider-digits').addEventListener('input', (e) => {
        const val = parseInt(e.target.value);
        state.config.digits = val;
        document.getElementById('val-digits').textContent = `${val} Digits`;
        document.getElementById('val-mass-ratio').innerHTML = `${Math.pow(100, val - 1)}:1`;
        canvasEngine.updateConfig('digits', val);
        syncPythonCode();
      });

      document.getElementById('select-b1-color').addEventListener('change', (e) => {
        state.config.b1_color = e.target.value;
        canvasEngine.updateConfig('b1_color', e.target.value);
        syncPythonCode();
      });
      document.getElementById('select-b2-color').addEventListener('change', (e) => {
        state.config.b2_color = e.target.value;
        canvasEngine.updateConfig('b2_color', e.target.value);
        syncPythonCode();
      });

    } else if (presetKey === 'calculus_riemann') {
      dynamicControls.innerHTML = `
        <div class="control-group">
          <div class="control-group-title">
            <span>Riemann Rectangles (N)</span>
            <span class="control-val-badge" id="val-rects">${state.config.num_rects}</span>
          </div>
          <input type="range" id="slider-rects" min="2" max="64" step="2" value="${state.config.num_rects}" class="custom-slider" title="Change number of approximating rectangles">
        </div>

        <div class="control-group">
          <div class="control-group-title">
            <span>Sampling Method</span>
          </div>
          <div class="pill-button-group">
            <button class="pill-btn ${state.config.method === 'left' ? 'active' : ''}" data-method="left">Left Sum</button>
            <button class="pill-btn ${state.config.method === 'midpoint' ? 'active' : ''}" data-method="midpoint">Midpoint</button>
            <button class="pill-btn ${state.config.method === 'right' ? 'active' : ''}" data-method="right">Right Sum</button>
          </div>
        </div>

        <div class="control-group">
          <div class="control-group-title">
            <span>Integration Interval [a, b]</span>
          </div>
          <div class="control-row">
            <span class="control-label">From (a):</span>
            <input type="number" id="input-xmin" value="${state.config.x_min}" step="0.5" class="custom-text-input" style="width: 80px;">
          </div>
          <div class="control-row" style="margin-top: 6px;">
            <span class="control-label">To (b):</span>
            <input type="number" id="input-xmax" value="${state.config.x_max}" step="0.5" class="custom-text-input" style="width: 80px;">
          </div>
        </div>
      `;

      document.getElementById('slider-rects').addEventListener('input', (e) => {
        const val = parseInt(e.target.value);
        state.config.num_rects = val;
        document.getElementById('val-rects').textContent = val;
        canvasEngine.updateConfig('num_rects', val);
        syncPythonCode();
      });

      dynamicControls.querySelectorAll('.pill-btn[data-method]').forEach(btn => {
        btn.addEventListener('click', () => {
          dynamicControls.querySelectorAll('.pill-btn[data-method]').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          const m = btn.getAttribute('data-method');
          state.config.method = m;
          canvasEngine.updateConfig('method', m);
          syncPythonCode();
        });
      });

    } else if (presetKey === 'linear_transformation') {
      dynamicControls.innerHTML = `
        <div class="control-group">
          <div class="control-group-title">
            <span>2D Matrix Values [A]</span>
          </div>
          <div class="matrix-grid-input">
            <input type="number" id="mat-a" value="${state.config.a}" step="0.2" title="Column 1: i-hat X">
            <input type="number" id="mat-b" value="${state.config.b}" step="0.2" title="Column 2: j-hat X">
            <input type="number" id="mat-c" value="${state.config.c}" step="0.2" title="Column 1: i-hat Y">
            <input type="number" id="mat-d" value="${state.config.d}" step="0.2" title="Column 2: j-hat Y">
          </div>
          <p style="font-size:11px; color:#94a3b8; margin-top:4px;">Tip: You can also <strong>drag the arrow heads \u00EE (green) and \u0135 (red)</strong> directly on the canvas!</p>
        </div>

        <div class="control-group">
          <div class="control-group-title">
            <span>1-Click Presets</span>
          </div>
          <div class="pill-button-group">
            <button class="pill-btn" id="btn-preset-shear">Shear</button>
            <button class="pill-btn" id="btn-preset-rot">Rotate 90\u00b0</button>
            <button class="pill-btn" id="btn-preset-scale">Scale 2x</button>
            <button class="pill-btn" id="btn-preset-reflect">Reflect</button>
          </div>
        </div>
      `;

      const updateMat = () => {
        state.config.a = parseFloat(document.getElementById('mat-a').value) || 0;
        state.config.b = parseFloat(document.getElementById('mat-b').value) || 0;
        state.config.c = parseFloat(document.getElementById('mat-c').value) || 0;
        state.config.d = parseFloat(document.getElementById('mat-d').value) || 0;
        canvasEngine.setScene('linear_transformation', state.config);
        syncPythonCode();
      };

      ['mat-a', 'mat-b', 'mat-c', 'mat-d'].forEach(id => {
        document.getElementById(id).addEventListener('input', updateMat);
      });

      // Canvas Drag to Matrix Input sync
      window.onMatrixDragUpdate = (a, b, c, d) => {
        const ma = document.getElementById('mat-a');
        const mb = document.getElementById('mat-b');
        const mc = document.getElementById('mat-c');
        const md = document.getElementById('mat-d');
        if (ma) ma.value = a;
        if (mb) mb.value = b;
        if (mc) mc.value = c;
        if (md) md.value = d;
        state.config.a = a;
        state.config.b = b;
        state.config.c = c;
        state.config.d = d;
        syncPythonCode();
      };

      document.getElementById('btn-preset-shear').addEventListener('click', () => {
        document.getElementById('mat-a').value = 1;
        document.getElementById('mat-b').value = 1;
        document.getElementById('mat-c').value = 0;
        document.getElementById('mat-d').value = 1;
        updateMat();
      });
      document.getElementById('btn-preset-rot').addEventListener('click', () => {
        document.getElementById('mat-a').value = 0;
        document.getElementById('mat-b').value = -1;
        document.getElementById('mat-c').value = 1;
        document.getElementById('mat-d').value = 0;
        updateMat();
      });
      document.getElementById('btn-preset-scale').addEventListener('click', () => {
        document.getElementById('mat-a').value = 2;
        document.getElementById('mat-b').value = 0;
        document.getElementById('mat-c').value = 0;
        document.getElementById('mat-d').value = 2;
        updateMat();
      });
      document.getElementById('btn-preset-reflect').addEventListener('click', () => {
        document.getElementById('mat-a').value = 1;
        document.getElementById('mat-b').value = 0;
        document.getElementById('mat-c').value = 0;
        document.getElementById('mat-d').value = -1;
        updateMat();
      });

    } else if (presetKey === 'fourier_epicycles') {
      dynamicControls.innerHTML = `
        <div class="control-group">
          <div class="control-group-title">
            <span>Rotating Harmonics (Circles)</span>
            <span class="control-val-badge" id="val-harmonics">${state.config.harmonics}</span>
          </div>
          <input type="range" id="slider-harmonics" min="1" max="32" value="${state.config.harmonics}" class="custom-slider">
        </div>

        <div class="control-group">
          <div class="control-group-title">
            <span>Curve Shape</span>
          </div>
          <div class="pill-button-group">
            <button class="pill-btn ${state.config.shape === 'heart' ? 'active' : ''}" data-shape="heart">\u2665 Heart</button>
            <button class="pill-btn ${state.config.shape === 'circle' ? 'active' : ''}" data-shape="circle">\u25ef Circle</button>
            <button class="pill-btn ${state.config.shape === 'star' ? 'active' : ''}" data-shape="star">\u2605 Star</button>
          </div>
        </div>
      `;

      document.getElementById('slider-harmonics').addEventListener('input', (e) => {
        const val = parseInt(e.target.value);
        state.config.harmonics = val;
        document.getElementById('val-harmonics').textContent = val;
        canvasEngine.updateConfig('harmonics', val);
        syncPythonCode();
      });

      dynamicControls.querySelectorAll('.pill-btn[data-shape]').forEach(btn => {
        btn.addEventListener('click', () => {
          dynamicControls.querySelectorAll('.pill-btn[data-shape]').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          state.config.shape = btn.getAttribute('data-shape');
          canvasEngine.updateConfig('shape', state.config.shape);
          syncPythonCode();
        });
      });

    } else if (presetKey === 'latex_proof') {
      dynamicControls.innerHTML = `
        <div class="control-group">
          <div class="control-group-title">
            <span>Step-by-Step Proof Equations</span>
          </div>
          <p style="font-size:12px; color:#94a3b8; margin-bottom:8px;">Morph smoothly between these equations:</p>
          <div style="display:flex; flex-direction:column; gap:6px;">
            ${state.config.steps.map((step, idx) => `
              <div class="control-row">
                <span class="control-val-badge">#${idx+1}</span>
                <input type="text" class="custom-text-input proof-step-input" data-idx="${idx}" value="${step.replace(/"/g, '&quot;')}">
              </div>
            `).join('')}
          </div>
        </div>
      `;

      dynamicControls.querySelectorAll('.proof-step-input').forEach(inp => {
        inp.addEventListener('input', (e) => {
          const idx = parseInt(e.target.getAttribute('data-idx'));
          state.config.steps[idx] = e.target.value;
          canvasEngine.updateConfig('steps', state.config.steps);
          syncPythonCode();
        });
      });
    }
  }

  // =========================================================================
  // Storyboard Tray Management
  // =========================================================================
  function updateStoryboardTray() {
    beatsTrack.innerHTML = '';
    state.storyboardBeats.forEach((beat, index) => {
      const beatCard = document.createElement('div');
      beatCard.className = `beat-card ${index === 0 ? 'active' : ''}`;
      beatCard.setAttribute('role', 'listitem');
      beatCard.innerHTML = `
        <div class="beat-header">
          <span class="beat-badge">BEAT ${index + 1}</span>
          <span class="beat-duration">${beat.duration}s</span>
        </div>
        <div class="beat-name">${beat.text || beat.latex || beat.function || beat.type}</div>
      `;
      beatCard.addEventListener('click', () => {
        document.querySelectorAll('.beat-card').forEach(c => c.classList.remove('active'));
        beatCard.classList.add('active');
      });
      beatsTrack.appendChild(beatCard);
    });
  }

  btnAddBeat.addEventListener('click', () => {
    mathTyper.show("", (formula) => {
      const newBeat = {
        id: 'b' + (state.storyboardBeats.length + 1),
        type: 'formula',
        latex: formula,
        duration: 2.0
      };
      state.storyboardBeats.push(newBeat);
      updateStoryboardTray();
      showToast("Formula added to Storyboard!", "success");
      syncPythonCode();
    });
  });

  btnOpenMathTyper.addEventListener('click', () => {
    mathTyper.show("", (formula) => {
      showToast(`Formula generated: ${formula}`, "info");
    });
  });

  // =========================================================================
  // Transport & Timeline Interaction
  // =========================================================================
  btnPlayPause.addEventListener('click', () => {
    const isPlaying = canvasEngine.togglePlay();
    playIcon.setAttribute('data-lucide', isPlaying ? 'pause' : 'play');
    lucide.createIcons();
  });

  btnReset.addEventListener('click', () => {
    canvasEngine.resetSimulation();
  });

  timelineScrubber.addEventListener('input', (e) => {
    const norm = parseFloat(e.target.value) / 100.0;
    canvasEngine.seek(norm);
  });

  window.onCanvasTimeUpdate = (currentTime, totalDuration) => {
    currentTimeDisplay.textContent = formatTime(currentTime);
    totalDurationDisplay.textContent = formatTime(totalDuration);
    timelineScrubber.value = (currentTime / totalDuration) * 100;
  };

  function formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 10);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms}`;
  }

  playbackSpeedSelect.addEventListener('change', (e) => {
    canvasEngine.playbackSpeed = parseFloat(e.target.value);
  });

  btnLoopToggle.addEventListener('click', () => {
    btnLoopToggle.classList.toggle('active');
    canvasEngine.isLooping = btnLoopToggle.classList.contains('active');
  });

  btnAudioToggle.addEventListener('click', () => {
    btnAudioToggle.classList.toggle('active');
    canvasEngine.audioEnabled = btnAudioToggle.classList.contains('active');
    showToast(canvasEngine.audioEnabled ? "Audio Effects Enabled" : "Audio Muted", "info");
  });

  btnGridToggle.addEventListener('click', () => {
    btnGridToggle.classList.toggle('active');
    canvasEngine.showGrid = btnGridToggle.classList.contains('active');
  });

  // =========================================================================
  // View Mode: Canvas Preview vs Rendered Video Player
  // =========================================================================
  btnModeCanvas.addEventListener('click', () => setViewMode('canvas'));
  btnModeVideo.addEventListener('click', () => setViewMode('video'));

  function setViewMode(mode) {
    state.viewMode = mode;
    if (mode === 'canvas') {
      btnModeCanvas.classList.add('active');
      btnModeCanvas.setAttribute('aria-selected', 'true');
      btnModeVideo.classList.remove('active');
      btnModeVideo.setAttribute('aria-selected', 'false');
      videoPlayerWrap.classList.add('hidden');
      canvasEngine.play();
    } else {
      btnModeVideo.classList.add('active');
      btnModeVideo.setAttribute('aria-selected', 'true');
      btnModeCanvas.classList.remove('active');
      btnModeCanvas.setAttribute('aria-selected', 'false');
      videoPlayerWrap.classList.remove('hidden');
      canvasEngine.pause();
      if (!state.renderedVideoUrl) {
        videoEmptyState.style.display = 'flex';
        manimVideoPlayer.style.display = 'none';
      } else {
        videoEmptyState.style.display = 'none';
        manimVideoPlayer.style.display = 'block';
      }
    }
  }

  // =========================================================================
  // ManimGL Video Rendering (Native Bridge / Standalone App)
  // =========================================================================
  async function renderManimVideo() {
    btnRenderManim.classList.add('rendering');
    btnRenderManim.querySelector('span').textContent = 'Rendering...';
    logToTerminal(`[Render] Starting ManimGL render for ${state.currentPreset}...`, 'info');

    const payload = {
      project: {
        type: state.currentPreset,
        config: state.config
      },
      resolution: renderQualitySelect.value,
      scene_name: "GeneratedMathScene"
    };

    try {
      const data = await NativeBridge.renderVideo(payload);
      btnRenderManim.classList.remove('rendering');
      btnRenderManim.querySelector('span').textContent = 'Render Manim Video';

      if (data.status === 'success') {
        state.renderedVideoUrl = data.video_url || data.video_path;
        manimVideoPlayer.src = state.renderedVideoUrl;
        showToast("Video rendered successfully in " + data.duration_render + "s!", "success");
        logToTerminal(`[Render] Completed in ${data.duration_render}s. File: ${data.video_name || data.filename}`, 'success');
        setViewMode('video');
        refreshGallery();
      } else {
        showToast("Render failed: " + (data.message || "Unknown error"), "error");
        logToTerminal(`[Error] ${data.logs || data.message}`, 'error');
      }
    } catch (err) {
      btnRenderManim.classList.remove('rendering');
      btnRenderManim.querySelector('span').textContent = 'Render Manim Video';
      showToast("Render error: " + err.message, "error");
      logToTerminal(`[Error] ${err.message}`, 'error');
    }
  }

  btnRenderManim.addEventListener('click', renderManimVideo);
  btnRenderEmpty.addEventListener('click', renderManimVideo);

  // =========================================================================
  // Python Code Generation Sync
  // =========================================================================
  async function syncPythonCode() {
    try {
      const data = await NativeBridge.generateCode({
        type: state.currentPreset,
        config: state.config
      });
      if (data && data.code) {
        pythonCodeDisplay.textContent = data.code;
      }
    } catch (e) {}
  }

  // =========================================================================
  // Gallery & Logs
  // =========================================================================
  async function refreshGallery() {
    try {
      const data = await NativeBridge.getVideos();
      galleryGrid.innerHTML = '';
      if (!data.videos || data.videos.length === 0) {
        galleryGrid.innerHTML = '<p style="color:#64748b; font-size:12px;">No videos rendered yet.</p>';
        return;
      }
      data.videos.forEach(v => {
        const item = document.createElement('div');
        item.className = 'video-card-item';
        item.innerHTML = `
          <div class="video-info">
            <h5>${v.name}</h5>
            <span>${v.size_mb} MB</span>
          </div>
          <button class="action-tag-btn" onclick="window.NativeBridge ? window.NativeBridge.openVideo('${v.path || v.url}') : window.open('${v.url}', '_blank')"><i data-lucide="play"></i> Watch</button>
        `;
        galleryGrid.appendChild(item);
      });
      lucide.createIcons();
    } catch (e) {}
  }

  function logToTerminal(msg, type = 'info') {
    const span = document.createElement('span');
    span.className = `log-line ${type}`;
    span.textContent = msg;
    terminalLogs.appendChild(span);
    terminalLogs.scrollTop = terminalLogs.scrollHeight;
  }

  // =========================================================================
  // Drawer & Tabs
  // =========================================================================
  drawerTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      drawerTabs.forEach(t => t.classList.remove('active'));
      tabContents.forEach(c => c.classList.remove('active'));
      tab.classList.add('active');
      const target = tab.getAttribute('data-tab');
      document.getElementById(target).classList.add('active');
    });
  });

  btnCloseDrawer.addEventListener('click', () => {
    rightDrawer.classList.remove('open');
  });

  btnCopyCode.addEventListener('click', () => {
    navigator.clipboard.writeText(pythonCodeDisplay.textContent);
    showToast("Python code copied to clipboard!", "success");
  });

  btnRefreshGallery.addEventListener('click', refreshGallery);

  // =========================================================================
  // Export Dropdown
  // =========================================================================
  btnExportMenu.addEventListener('click', (e) => {
    e.stopPropagation();
    exportDropdown.classList.toggle('show');
    const isExpanded = exportDropdown.classList.contains('show');
    btnExportMenu.setAttribute('aria-expanded', isExpanded);
  });

  document.addEventListener('click', () => {
    exportDropdown.classList.remove('show');
    btnExportMenu.setAttribute('aria-expanded', 'false');
  });

  btnExportMp4.addEventListener('click', () => {
    if (state.renderedVideoUrl) {
      window.open(state.renderedVideoUrl, '_blank');
    } else {
      showToast("Please render a video first!", "info");
    }
  });

  btnExportPng.addEventListener('click', () => {
    const canvas = document.getElementById('mathCanvas');
    const link = document.createElement('a');
    link.download = `${state.currentPreset}_frame.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    showToast("Frame saved as PNG!", "success");
  });

  btnExportCode.addEventListener('click', () => {
    rightDrawer.classList.add('open');
    drawerTabs[0].click();
  });

  btnExportJson.addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.download = `mathmotion_project_${state.currentPreset}.json`;
    link.href = URL.createObjectURL(blob);
    link.click();
    showToast("Project saved as JSON!", "success");
  });

  // =========================================================================
  // Onboarding Tour Modal (UCD)
  // =========================================================================
  const hideTourKey = 'mathmotion_hide_welcome_tour';
  if (!localStorage.getItem(hideTourKey)) {
    welcomeTourModal.classList.remove('hidden');
  }

  function closeTour() {
    if (chkDontShowTour.checked) {
      localStorage.setItem(hideTourKey, 'true');
    }
    welcomeTourModal.classList.add('hidden');
  }

  if (btnCloseTour) btnCloseTour.addEventListener('click', closeTour);
  if (btnStartExploring) btnStartExploring.addEventListener('click', closeTour);

  // =========================================================================
  // Keyboard Shortcuts Modal (Accessibility)
  // =========================================================================
  if (btnHelpModal) {
    btnHelpModal.addEventListener('click', () => {
      shortcutsModal.classList.remove('hidden');
    });
  }
  if (btnCloseShortcuts) {
    btnCloseShortcuts.addEventListener('click', () => {
      shortcutsModal.classList.add('hidden');
    });
  }
  if (btnOkShortcuts) {
    btnOkShortcuts.addEventListener('click', () => {
      shortcutsModal.classList.add('hidden');
    });
  }

  // Global Keyboard Shortcuts
  window.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    if (e.code === 'Space') {
      e.preventDefault();
      btnPlayPause.click();
    } else if (e.key === 'r' || e.key === 'R') {
      btnReset.click();
      showToast("Animation reset", "info");
    } else if (e.key === 'g' || e.key === 'G') {
      btnGridToggle.click();
    } else if (e.key === 'm' || e.key === 'M') {
      btnAudioToggle.click();
    } else if (e.key === '?') {
      shortcutsModal.classList.toggle('hidden');
    } else if (['1', '2', '3', '4', '5', '6'].includes(e.key)) {
      const presets = [
        'collision_pi',
        'calculus_riemann',
        'linear_transformation',
        'fourier_epicycles',
        'trig_unit_circle',
        'latex_proof'
      ];
      const idx = parseInt(e.key) - 1;
      presetSelect.value = presets[idx];
      loadPreset(presets[idx]);
    }
  });

  // Preset Selector change
  presetSelect.addEventListener('change', (e) => {
    loadPreset(e.target.value);
  });

  // Toast Notifications
  function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  // Initial Load
  loadPreset('collision_pi');
  refreshGallery();
});
