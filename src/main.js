// Wait for Tauri to be ready
let invoke;
let open;
let getCurrentWindow;

// Particle System
class ParticleSystem {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.particles = [];
    this.stars = [];
    this.resize();
    this.init();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  init() {
    for (let i = 0; i < 50; i++) {
      this.particles.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        size: Math.random() * 2 + 0.5,
        opacity: Math.random() * 0.3 + 0.1
      });
    }

    for (let i = 0; i < 80; i++) {
      this.stars.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height,
        size: Math.random() * 1.5 + 0.5,
        twinkleSpeed: Math.random() * 0.02 + 0.01,
        twinklePhase: Math.random() * Math.PI * 2
      });
    }

    this.animate();
  }

  animate() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    this.stars.forEach(star => {
      star.twinklePhase += star.twinkleSpeed;
      const opacity = 0.15 + Math.sin(star.twinklePhase) * 0.2;
      this.ctx.beginPath();
      this.ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
      this.ctx.fillStyle = `rgba(180, 180, 180, ${opacity})`;
      this.ctx.fill();
    });

    this.particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;

      if (p.x < 0) p.x = this.canvas.width;
      if (p.x > this.canvas.width) p.x = 0;
      if (p.y < 0) p.y = this.canvas.height;
      if (p.y > this.canvas.height) p.y = 0;

      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      this.ctx.fillStyle = `rgba(150, 150, 150, ${p.opacity})`;
      this.ctx.fill();
    });

    this.particles.forEach((p1, i) => {
      this.particles.slice(i + 1).forEach(p2 => {
        const dx = p1.x - p2.x;
        const dy = p1.y - p2.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 100) {
          this.ctx.beginPath();
          this.ctx.moveTo(p1.x, p1.y);
          this.ctx.lineTo(p2.x, p2.y);
          this.ctx.strokeStyle = `rgba(100, 100, 100, ${0.1 * (1 - dist / 100)})`;
          this.ctx.stroke();
        }
      });
    });

    requestAnimationFrame(() => this.animate());
  }
}

// App State
const state = {
  mode: 'files',
  sourcePath: '',
  outputPath: '',
  consoleContent: ''
};

// DOM Elements
const elements = {
  console: document.getElementById('console'),
  sourcePath: document.getElementById('source-path'),
  outputPath: document.getElementById('output-path'),
  extension: document.getElementById('extension'),
  fileCount: document.getElementById('file-count'),
  statusText: document.getElementById('status-text'),
  executeBtn: document.getElementById('execute-btn'),
  copyBtn: document.getElementById('copy-btn'),
  saveBtn: document.getElementById('save-btn'),
  clearBtn: document.getElementById('clear-btn'),
  browseSource: document.getElementById('browse-source'),
  browseOutput: document.getElementById('browse-output'),
  modeBtns: document.querySelectorAll('.mode-btn'),
  minimizeBtn: document.getElementById('minimize-btn'),
  maximizeBtn: document.getElementById('maximize-btn'),
  closeBtn: document.getElementById('close-btn')
};

// Initialize
async function init() {
  // Start particle system immediately
  new ParticleSystem(document.getElementById('particles'));

  // Wait for Tauri APIs
  if (window.__TAURI__) {
    invoke = window.__TAURI__.core.invoke;
    open = window.__TAURI__.dialog.open;
    getCurrentWindow = window.__TAURI__.window.getCurrentWindow;

    try {
      const config = await invoke('load_config');
      if (config && config.output_directory) {
        state.outputPath = config.output_directory;
        elements.outputPath.value = config.output_directory;
      }
    } catch (e) {
      console.error('Failed to load config:', e);
    }
  }

  setupEventListeners();
}

function setupEventListeners() {
  // Window controls using Tauri window API
  elements.minimizeBtn.addEventListener('click', async () => {
    if (getCurrentWindow) {
      const win = getCurrentWindow();
      await win.minimize();
    }
  });

  elements.maximizeBtn.addEventListener('click', async () => {
    if (getCurrentWindow) {
      const win = getCurrentWindow();
      const isMaximized = await win.isMaximized();
      if (isMaximized) {
        await win.unmaximize();
      } else {
        await win.maximize();
      }
    }
  });

  elements.closeBtn.addEventListener('click', async () => {
    if (getCurrentWindow) {
      const win = getCurrentWindow();
      await win.close();
    }
  });

  // Mode selection
  elements.modeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      elements.modeBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.mode = btn.dataset.mode;
    });
  });

  // Browse buttons
  elements.browseSource.addEventListener('click', async () => {
    if (!open) return;
    try {
      const path = await open({ directory: true, title: 'Select Folder' });
      if (path) {
        state.sourcePath = path;
        elements.sourcePath.value = path;
      }
    } catch (e) {
      console.error('Failed to open dialog:', e);
    }
  });

  elements.browseOutput.addEventListener('click', async () => {
    if (!open) return;
    try {
      const path = await open({ directory: true, title: 'Select Output Directory' });
      if (path) {
        state.outputPath = path;
        elements.outputPath.value = path;
        if (invoke) {
          await invoke('save_config', { config: { output_directory: path } });
        }
      }
    } catch (e) {
      console.error('Failed to open dialog:', e);
    }
  });

  elements.executeBtn.addEventListener('click', execute);
  elements.copyBtn.addEventListener('click', copyConsole);
  elements.saveBtn.addEventListener('click', saveConsole);
  elements.clearBtn.addEventListener('click', clearConsole);
}

async function execute() {
  if (!state.sourcePath) {
    setStatus('Please select a source directory');
    return;
  }

  if (!invoke) {
    setStatus('Tauri not ready');
    return;
  }

  const extension = elements.extension.value.trim();
  setStatus('Processing...');
  showLoading();

  try {
    if (state.mode === 'files') {
      await listFiles(state.sourcePath, extension);
    } else {
      await showHierarchy(state.sourcePath, extension);
    }
    setStatus('Complete');
  } catch (error) {
    setStatus('Error: ' + error);
    showError(error);
  }
}

async function listFiles(folderPath, extension) {
  const result = await invoke('list_files', { folderPath, extension });

  if (!result.success) {
    throw new Error(result.error);
  }

  const files = result.files;
  elements.fileCount.textContent = `${files.length} files found`;

  let output = files.map(file => file.name).join('\n');

  state.consoleContent = output;
  elements.console.innerHTML = `<div class="file-listing">${escapeHtml(output)}</div>`;
}

async function showHierarchy(folderPath, extension) {
  const result = await invoke('get_hierarchy', { folderPath, extension });

  if (!result.success) {
    throw new Error(result.error);
  }

  const hierarchy = result.hierarchy;
  const lineCount = hierarchy.split('\n').length;
  elements.fileCount.textContent = `${lineCount} lines`;

  let output = `╔════════════════════════════════════════════════════════════════╗\n`;
  output += `║  FILE HIERARCHY                                                ║\n`;
  output += `║  Directory: ${folderPath.substring(0, 48).padEnd(48)}  ║\n`;
  output += `║  Extension: ${(extension || 'All').padEnd(48)}  ║\n`;
  output += `╚════════════════════════════════════════════════════════════════╝\n\n`;
  output += hierarchy;
  output += `\n\n── End of hierarchy ──`;

  state.consoleContent = output;
  elements.console.innerHTML = `<div class="hierarchy-output">${escapeHtml(output)}</div>`;
}

async function saveConsole() {
  if (!state.consoleContent) {
    setStatus('Console is empty');
    return;
  }

  if (!state.outputPath) {
    setStatus('Please select an output directory');
    return;
  }

  if (!invoke) {
    setStatus('Tauri not ready');
    return;
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const filename = `metatron_${state.mode}_${timestamp}.txt`;

  const result = await invoke('save_to_file', {
    content: state.consoleContent,
    outputDir: state.outputPath,
    filename
  });

  if (result.success) {
    setStatus(`Saved to ${filename}`);
  } else {
    setStatus('Error saving file: ' + result.error);
  }
}

async function copyConsole() {
  if (!state.consoleContent) {
    setStatus('Console is empty');
    return;
  }

  try {
    await navigator.clipboard.writeText(state.consoleContent);
    setStatus('Copied to clipboard');
  } catch (e) {
    setStatus('Failed to copy');
  }
}

function clearConsole() {
  state.consoleContent = '';
  elements.fileCount.textContent = '';
  elements.console.innerHTML = `
    <div class="welcome-message">
      <div class="welcome-symbol">✧</div>
      <div class="welcome-text">Console Cleared</div>
      <div class="welcome-sub">Ready for new operation</div>
    </div>
  `;
  setStatus('Console cleared');
}

function showLoading() {
  elements.console.innerHTML = `
    <div class="loading">
      <div class="loading-dots">
        <span></span>
        <span></span>
        <span></span>
      </div>
      <span>Processing...</span>
    </div>
  `;
}

function showError(message) {
  elements.console.innerHTML = `
    <div class="error-message">
      <div>Error</div>
      <div>${escapeHtml(message)}</div>
    </div>
  `;
}

function setStatus(text) {
  elements.statusText.textContent = text;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Wait for DOM and then initialize
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
