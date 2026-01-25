import { createEl, replaceChildren } from '../utils/dom.js';

export function setConsoleText(consoleEl, className, text) {
  const block = createEl('div', className, text);
  replaceChildren(consoleEl, block);
}

export function showWelcome(consoleEl, title, subtitle) {
  const wrapper = createEl('div', 'welcome-message');
  wrapper.append(
    createEl('div', 'welcome-symbol', '✧'),
    createEl('div', 'welcome-text', title),
    createEl('div', 'welcome-sub', subtitle)
  );
  replaceChildren(consoleEl, wrapper);
}

export function showLoading(consoleEl) {
  const container = createEl('div', 'loading');
  const dots = createEl('div', 'loading-dots');
  for (let i = 0; i < 3; i += 1) {
    dots.appendChild(document.createElement('span'));
  }
  const label = createEl('span', null, 'Processing...');
  container.append(dots, label);
  replaceChildren(consoleEl, container);
}

export function showError(consoleEl, message) {
  const container = createEl('div', 'error-message');
  container.append(
    createEl('div', null, 'Error'),
    createEl('div', null, String(message))
  );
  replaceChildren(consoleEl, container);
}
