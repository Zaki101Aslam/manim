/**
 * MathMotion Studio - Visual Math Typer
 * Allows math enthusiasts to compose beautiful equations visually without memorizing LaTeX.
 */

class MathTyper {
  constructor() {
    this.modal = document.getElementById('mathTyperModal');
    this.previewEl = document.getElementById('katexPreview');
    this.rawInput = document.getElementById('mathFormulaRawInput');
    this.currentFormula = "\\int_0^1 x^2 \\, dx = \\frac{1}{3}";
    this.insertCallback = null;

    this.initEvents();
    this.updatePreview();
  }

  initEvents() {
    // Symbol buttons
    document.querySelectorAll('.sym-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const tex = btn.getAttribute('data-tex');
        if (tex) {
          this.insertSymbol(tex);
        }
      });
    });

    // Input changes
    if (this.rawInput) {
      this.rawInput.addEventListener('input', (e) => {
        this.currentFormula = e.target.value;
        this.updatePreview();
      });
    }

    // Modal Close
    const closeBtn = document.getElementById('btn-close-math-typer');
    const cancelBtn = document.getElementById('btn-cancel-formula');
    if (closeBtn) closeBtn.addEventListener('click', () => this.hide());
    if (cancelBtn) cancelBtn.addEventListener('click', () => this.hide());

    // Insert Button
    const insertBtn = document.getElementById('btn-insert-formula');
    if (insertBtn) {
      insertBtn.addEventListener('click', () => {
        if (this.insertCallback) {
          this.insertCallback(this.currentFormula);
        }
        this.hide();
      });
    }
  }

  insertSymbol(tex) {
    if (tex.includes(" = ") || tex.length > 10) {
      // Full template replacement
      this.currentFormula = tex;
    } else {
      // Append symbol
      this.currentFormula += " " + tex;
    }
    if (this.rawInput) {
      this.rawInput.value = this.currentFormula;
    }
    this.updatePreview();
  }

  updatePreview() {
    if (!this.previewEl) return;
    try {
      if (window.katex) {
        window.katex.render(this.currentFormula || "", this.previewEl, {
          throwOnError: false,
          displayMode: true
        });
      } else {
        this.previewEl.textContent = this.currentFormula;
      }
    } catch (err) {
      this.previewEl.textContent = this.currentFormula;
    }
  }

  show(initialFormula = "", callback = null) {
    if (initialFormula) {
      this.currentFormula = initialFormula;
      if (this.rawInput) this.rawInput.value = initialFormula;
    }
    this.insertCallback = callback;
    this.updatePreview();
    if (this.modal) {
      this.modal.classList.remove('hidden');
    }
  }

  hide() {
    if (this.modal) {
      this.modal.classList.add('hidden');
    }
  }
}

window.MathTyper = MathTyper;
