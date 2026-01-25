import { createEl, on, replaceChildren } from '../utils/dom.js';

export function createIgnoredFoldersController({
  displayEl,
  listEl,
  addButton,
  pickFolder,
  setStatus,
  formatPath,
  disposers
}) {
  const state = {
    paths: []
  };

  function render() {
    const count = state.paths.length;
    displayEl.value = count ? `${count} folder(s) selected` : 'No folders selected';

    if (!count) {
      replaceChildren(listEl);
      return;
    }

    const pills = state.paths.map((path, index) => {
      const pill = createEl('span', 'pill');
      pill.dataset.index = String(index);

      const label = formatPath ? formatPath(path) : path;
      const text = createEl('span', 'pill-text', label);
      const removeBtn = createEl('button', null, '×');
      removeBtn.type = 'button';
      removeBtn.title = 'Remove folder';

      pill.append(text, removeBtn);
      return pill;
    });

    replaceChildren(listEl, ...pills);
  }

  function addPath(path) {
    if (state.paths.includes(path)) {
      return;
    }
    state.paths.push(path);
    render();
  }

  async function handleAddClick() {
    const selection = await pickFolder();
    if (!selection) {
      return;
    }
    const paths = Array.isArray(selection) ? selection : [selection];
    paths.forEach(addPath);
    if (paths.length) {
      setStatus(`Ignored ${paths.length} folder(s)`);
    }
  }

  function handleListClick(event) {
    const pill = event.target.closest('.pill');
    if (!pill) return;
    const index = Number(pill.dataset.index);
    if (!Number.isFinite(index)) return;
    state.paths.splice(index, 1);
    render();
  }

  on(addButton, 'click', handleAddClick, null, disposers);
  on(listEl, 'click', handleListClick, null, disposers);

  render();

  return {
    getPaths() {
      return state.paths.slice();
    }
  };
}
