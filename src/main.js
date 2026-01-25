import { ParticleSystem } from './effects/particles.js';
import { getTauriApis, loadConfig, pickDirectories, pickDirectory, saveConfig } from './services/tauri.js';
import { showError, showLoading, showWelcome, setConsoleText } from './ui/console.js';
import { createIgnoredFoldersController } from './ui/ignoredFolders.js';
import { createStatusController } from './ui/status.js';
import { on } from './utils/dom.js';

const state = {
  mode: 'files',
  sourcePath: '',
  outputPath: ''
};

const elements = {
  console: document.getElementById('console'),
  sourcePath: document.getElementById('source-path'),
  outputPath: document.getElementById('output-path'),
  extension: document.getElementById('extension'),
  filterByType: document.getElementById('filter-by-type'),
  ignoredExtensions: document.getElementById('ignored-extensions'),
  ignoredFoldersDisplay: document.getElementById('ignored-folders-display'),
  ignoredFoldersList: document.getElementById('ignored-folders-list'),
  addIgnoredFolderBtn: document.getElementById('add-ignored-folder'),
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

const disposers = [];
const status = createStatusController(elements.statusText, elements.fileCount);
let tauri = null;
let particleSystem = null;
let ignoredFoldersController = null;

async function init() {
  particleSystem = new ParticleSystem(document.getElementById('particles'));

  tauri = getTauriApis();
  if (tauri) {
    try {
      const config = await loadConfig(tauri.invoke);
      if (config && config.output_directory) {
        state.outputPath = config.output_directory;
        elements.outputPath.value = config.output_directory;
      }
    } catch (error) {
      console.error('Failed to load config:', error);
    }
  }

  ignoredFoldersController = createIgnoredFoldersController({
    displayEl: elements.ignoredFoldersDisplay,
    listEl: elements.ignoredFoldersList,
    addButton: elements.addIgnoredFolderBtn,
    pickFolder: () =>
      pickDirectories(tauri?.open, 'Select Folder(s) to Ignore (Ctrl/Cmd for multiple)'),
    setStatus: status.setStatus,
    formatPath: formatIgnoredFolderPath,
    disposers
  });

  setupEventListeners();
}

function setupEventListeners() {
  on(window, 'beforeunload', dispose, null, disposers);

  on(elements.minimizeBtn, 'click', handleMinimize, null, disposers);
  on(elements.maximizeBtn, 'click', handleMaximize, null, disposers);
  on(elements.closeBtn, 'click', handleClose, null, disposers);

  elements.modeBtns.forEach(btn => {
    on(btn, 'click', () => setMode(btn.dataset.mode), null, disposers);
  });

  on(elements.browseSource, 'click', handleBrowseSource, null, disposers);
  on(elements.browseOutput, 'click', handleBrowseOutput, null, disposers);

  on(elements.executeBtn, 'click', execute, null, disposers);
  on(elements.copyBtn, 'click', copyConsole, null, disposers);
  on(elements.saveBtn, 'click', saveConsole, null, disposers);
  on(elements.clearBtn, 'click', clearConsole, null, disposers);
  on(elements.filterByType, 'change', handleFilterToggle, null, disposers);

  handleFilterToggle();
  showWelcome(elements.console, 'Welcome to Metatron', 'Select a directory and execute to begin');
}

function setMode(mode) {
  elements.modeBtns.forEach(btn => btn.classList.remove('active'));
  const active = Array.from(elements.modeBtns).find(btn => btn.dataset.mode === mode);
  if (active) {
    active.classList.add('active');
  }
  state.mode = mode;
}

function handleFilterToggle() {
  const isChecked = elements.filterByType.checked;
  elements.extension.disabled = !isChecked;
  if (!isChecked) {
    elements.extension.value = '';
  }
}

function formatIgnoredFolderPath(path) {
  if (!state.sourcePath) {
    return getPathBasename(path);
  }
  const base = normalizePath(state.sourcePath);
  const target = normalizePath(path);
  if (target === base) {
    return '.';
  }
  if (target.startsWith(`${base}\\`)) {
    return target.slice(base.length + 1);
  }
  return getPathBasename(path);
}

function getPathBasename(path) {
  const parts = path.replace('/', '\\').split('\\').filter(Boolean);
  return parts.length ? parts[parts.length - 1] : path;
}

function normalizePath(path) {
  return path.replace('/', '\\').replace(/\\+$/, '').toLowerCase();
}

async function handleBrowseSource() {
  const path = await pickDirectory(tauri?.open, 'Select Folder', false);
  if (path) {
    state.sourcePath = path;
    elements.sourcePath.value = path;
  }
}

async function handleBrowseOutput() {
  const path = await pickDirectory(tauri?.open, 'Select Output Directory', false);
  if (path) {
    state.outputPath = path;
    elements.outputPath.value = path;
    await saveConfig(tauri?.invoke, path);
  }
}

async function handleMinimize() {
  if (!tauri?.getCurrentWindow) return;
  const win = tauri.getCurrentWindow();
  await win.minimize();
}

async function handleMaximize() {
  if (!tauri?.getCurrentWindow) return;
  const win = tauri.getCurrentWindow();
  const isMaximized = await win.isMaximized();
  if (isMaximized) {
    await win.unmaximize();
  } else {
    await win.maximize();
  }
}

async function handleClose() {
  if (!tauri?.getCurrentWindow) return;
  const win = tauri.getCurrentWindow();
  await win.close();
}

async function execute() {
  if (!state.sourcePath) {
    status.setStatus('Please select a source directory');
    return;
  }

  if (!tauri?.invoke) {
    status.setStatus('Tauri not ready');
    return;
  }

  const filterByType = elements.filterByType.checked;
  const extension = filterByType ? elements.extension.value.trim() : '';
  const ignoredExtensions = elements.ignoredExtensions.value.trim();
  const ignoredFolders = ignoredFoldersController.getPaths();

  status.setStatus('Processing...');
  showLoading(elements.console);

  try {
    if (state.mode === 'files') {
      await listFiles(extension, filterByType, ignoredExtensions, ignoredFolders);
    } else {
      await showHierarchy(extension, filterByType, ignoredExtensions, ignoredFolders);
    }
    status.setStatus('Complete');
  } catch (error) {
    status.setStatus(`Error: ${error}`);
    showError(elements.console, error);
  }
}

async function listFiles(extension, filterByType, ignoredExtensions, ignoredFolders) {
  const result = await tauri.invoke('list_files', {
    folderPath: state.sourcePath,
    extension,
    foldersOnly: !filterByType,
    ignoredExtensions,
    ignoredFolders
  });

  if (!result.success) {
    throw new Error(result.error);
  }

  const files = result.files;
  const label = filterByType ? 'files' : 'folders';
  status.setCount(`${files.length} ${label} found`);

  const output = files.map(file => file.name).join('\n');
  setConsoleText(elements.console, 'file-listing', output);
}

async function showHierarchy(extension, filterByType, ignoredExtensions, ignoredFolders) {
  const result = await tauri.invoke('get_hierarchy', {
    folderPath: state.sourcePath,
    extension,
    foldersOnly: !filterByType,
    ignoredExtensions,
    ignoredFolders
  });

  if (!result.success) {
    throw new Error(result.error);
  }

  const hierarchy = result.hierarchy;
  const lineCount = hierarchy.split('\n').length;
  status.setCount(`${lineCount} lines`);

  let output = `╔════════════════════════════════════════════════════════════════╗\n`;
  output += `║  FILE HIERARCHY                                                ║\n`;
  output += `║  Directory: ${state.sourcePath.substring(0, 48).padEnd(48)}  ║\n`;
  const filterLabel = filterByType ? (extension || 'All') : 'Folders only';
  output += `║  Filter: ${filterLabel.padEnd(48)}  ║\n`;
  const ignoredExtLabel = ignoredExtensions || 'None';
  output += `║  Ignored Types: ${ignoredExtLabel.substring(0, 48).padEnd(48)}  ║\n`;
  const ignoredFolderLabel = ignoredFolders.length ? `${ignoredFolders.length} selected` : 'None';
  output += `║  Ignored Folders: ${ignoredFolderLabel.substring(0, 48).padEnd(48)}  ║\n`;
  output += `╚════════════════════════════════════════════════════════════════╝\n\n`;
  output += hierarchy;
  output += `\n\n── End of hierarchy ──`;

  setConsoleText(elements.console, 'hierarchy-output', output);
}

async function saveConsole() {
  const content = elements.console.textContent || '';
  if (!content.trim()) {
    status.setStatus('Console is empty');
    return;
  }

  if (!state.outputPath) {
    status.setStatus('Please select an output directory');
    return;
  }

  if (!tauri?.invoke) {
    status.setStatus('Tauri not ready');
    return;
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const filename = `metatron_${state.mode}_${timestamp}.txt`;

  const result = await tauri.invoke('save_to_file', {
    content,
    outputDir: state.outputPath,
    filename
  });

  if (result.success) {
    status.setStatus(`Saved to ${filename}`);
  } else {
    status.setStatus(`Error saving file: ${result.error}`);
  }
}

async function copyConsole() {
  const content = elements.console.textContent || '';
  if (!content.trim()) {
    status.setStatus('Console is empty');
    return;
  }

  try {
    await navigator.clipboard.writeText(content);
    status.setStatus('Copied to clipboard');
  } catch (error) {
    console.error('Clipboard error:', error);
    status.setStatus('Failed to copy');
  }
}

function clearConsole() {
  status.clearCount();
  showWelcome(elements.console, 'Console Cleared', 'Ready for new operation');
  status.setStatus('Console cleared');
}

function dispose() {
  if (particleSystem) {
    particleSystem.destroy();
    particleSystem = null;
  }
  while (disposers.length) {
    const disposeListener = disposers.pop();
    disposeListener();
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init, { once: true });
} else {
  init();
}
