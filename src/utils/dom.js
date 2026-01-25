export function on(element, eventName, handler, options, disposers) {
  element.addEventListener(eventName, handler, options);
  if (disposers) {
    disposers.push(() => element.removeEventListener(eventName, handler, options));
  }
}

export function replaceChildren(element, ...children) {
  element.replaceChildren(...children);
}

export function createEl(tag, className, text) {
  const el = document.createElement(tag);
  if (className) {
    el.className = className;
  }
  if (text !== undefined && text !== null) {
    el.textContent = text;
  }
  return el;
}
