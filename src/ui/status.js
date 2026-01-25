export function createStatusController(statusEl, countEl) {
  return {
    setStatus(text) {
      statusEl.textContent = text;
    },
    setCount(text) {
      countEl.textContent = text;
    },
    clearCount() {
      countEl.textContent = '';
    }
  };
}
