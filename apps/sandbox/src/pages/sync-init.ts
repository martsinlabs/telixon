import { isEngineReady } from '@telixon/core';
import { ensureEngineReadySync } from '@telixon/core/sync-init';
import { createFreezeMonitor } from '../shared/freeze-monitor';
import { mustGet } from '../shared/must-get';
import { renderNav } from '../shared/nav';
import { renderReport } from '../shared/render-report';
import '../style.css';

renderNav('sync-init');

const monitor = createFreezeMonitor(mustGet('#spinner', HTMLElement), mustGet('#fps', HTMLElement));
const runButton = mustGet('#run', HTMLButtonElement);

runButton.addEventListener('click', () => {
  runButton.disabled = true;
  void monitor
    .measureSync(() => ensureEngineReadySync())
    .then((report) => {
      renderReport(report);
      runButton.textContent = isEngineReady() ? 'Engine ready' : 'Initialization failed';
    });
});
