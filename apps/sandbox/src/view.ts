import type { Controller } from './types';
import { eventsEl, redoBtn, stateEl, undoBtn, warningEl } from './elements';

const MAX_LOG_LINES = 20;
const log: string[] = [];

export function sync(current: Controller | null): void {
  const phone = current?.phone ?? null;

  undoBtn.disabled = phone === null || !phone.canUndo();
  redoBtn.disabled = phone === null || !phone.canRedo();

  warningEl.textContent =
    current === null
      ? ''
      : 'Check: typing · paste · Cmd+Z · Cmd+Shift+Z · delete-word · selection replace · duplicate attach';

  stateEl.textContent =
    current === null
      ? 'No input attached.'
      : JSON.stringify(
          { mode: current.mode, canUndo: current.phone.canUndo(), canRedo: current.phone.canRedo(), ...current.phone.getState() },
          null,
          2,
        );
}

export function record(message: string): void {
  const time = new Date().toLocaleTimeString('en-US', { hour12: false });
  log.unshift(`${time}  ${message}`);
  log.length = Math.min(log.length, MAX_LOG_LINES);
  eventsEl.textContent = log.join('\n');
}
