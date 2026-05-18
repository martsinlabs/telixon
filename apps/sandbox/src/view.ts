import { eventsEl, redoBtn, sealBtn, stateEl, undoBtn, warningEl } from './elements';
import type { Controller } from './types';

const MAX_LOG_LINES = 20;
const log: string[] = [];

export function sync(current: Controller | null): void {
  const phone = current?.phone ?? null;
  const state = phone?.getState() ?? null;

  undoBtn.disabled = phone === null || !phone.canUndo();
  redoBtn.disabled = phone === null || !phone.canRedo();
  sealBtn.disabled = phone === null;

  warningEl.textContent =
    current === null
      ? ''
      : 'Check: typing · paste · Cmd+Z · Cmd+Shift+Z · delete-word · selection replace · duplicate attach';

  stateEl.textContent =
    current === null ? 'No input attached.' : JSON.stringify({ mode: current.mode, ...state }, null, 2);
}

export function record(message: string): void {
  const time = new Date().toLocaleTimeString('en-US', { hour12: false });
  log.unshift(`${time}  ${message}`);
  log.length = Math.min(log.length, MAX_LOG_LINES);
  eventsEl.textContent = log.join('\n');
}
