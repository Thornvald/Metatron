export function getTauriApis() {
  if (!window.__TAURI__) {
    return null;
  }
  return {
    invoke: window.__TAURI__.core.invoke,
    open: window.__TAURI__.dialog.open,
    getCurrentWindow: window.__TAURI__.window.getCurrentWindow
  };
}

export async function loadConfig(invoke) {
  if (!invoke) {
    return null;
  }
  return invoke('load_config');
}

export async function saveConfig(invoke, outputDirectory) {
  if (!invoke) {
    return false;
  }
  return invoke('save_config', { config: { output_directory: outputDirectory } });
}

export async function pickDirectory(open, title, multiple = false) {
  if (!open) {
    return null;
  }
  return open({ directory: true, title, multiple });
}

export async function pickDirectories(open, title) {
  if (!open) {
    return null;
  }
  return open({ directory: true, title, multiple: true });
}
