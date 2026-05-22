import { eventsEl, phoneNumberEl, redoBtn, sealBtn, stateEl, undoBtn, warningEl } from './elements';
import type { Controller } from './types';

const MAX_LOG_LINES = 20;
const log: string[] = [];

// Every PhoneNumber query, rendered live from the attached input.
function renderPhoneNumber(current: Controller | null): string {
  if (current === null) return 'No input attached.';

  const phoneNumber = current.phone.getPhoneNumber();
  const rows: ReadonlyArray<readonly [string, unknown]> = [
    ['isValid', phoneNumber.isValid()],
    ['isPossible', phoneNumber.isPossible()],
    ['isPossibleWithReason', phoneNumber.isPossibleWithReason()],
    ['getNumberType', phoneNumber.getNumberType()],
    ['getNationalNumber', phoneNumber.getNationalNumber()],
    ['getCallingCode', phoneNumber.getCallingCode()],
    ['getCountry', phoneNumber.getCountry()],
    ['getE164', phoneNumber.getE164()],
    ['formatInternational', phoneNumber.formatInternational()],
    ['getURI', phoneNumber.getURI()],
  ];

  const width = Math.max(...rows.map(([name]) => name.length));
  return rows.map(([name, value]) => `${name.padEnd(width)}  ${value === null ? 'null' : String(value)}`).join('\n');
}

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

  phoneNumberEl.textContent = renderPhoneNumber(current);
}

export function record(message: string): void {
  const time = new Date().toLocaleTimeString('en-US', { hour12: false });
  log.unshift(`${time}  ${message}`);
  log.length = Math.min(log.length, MAX_LOG_LINES);
  eventsEl.textContent = log.join('\n');
}
