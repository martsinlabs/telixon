import {
  countrySupportsNumberTypes,
  createInternationalInputController,
  createNationalInputController,
  ensureEngineReady,
  getCallingCodeForCountry,
  getPlaceholders,
  isEngineReady,
  isNationalPrefixOptional,
  parsePhoneNumber,
  REGION_CODES,
  TelixonNotReadyError,
  type InputController,
  type NumberType,
  type PhoneNumber,
  type RegionCode,
} from '@telixon/core';

// Exercises the entire public API so the measured initial bundle is the ceiling, not a tree-shaken minimum.

const SAMPLE = '+12015550123';
const REGION: RegionCode = 'US';
const NUMBER_TYPE: NumberType = 'MOBILE';

async function main(): Promise<void> {
  // The API throws TelixonNotReadyError until the engine loads; touch the type so it ships.
  let guard = 'ready';
  try {
    parsePhoneNumber(SAMPLE);
  } catch (error) {
    guard = error instanceof TelixonNotReadyError ? 'guarded before ensureEngineReady' : 'unexpected';
  }

  await ensureEngineReady();

  const lines = [guard, ...describeNumber(parsePhoneNumber(SAMPLE)), ...describeRegion(), ...driveControllers()];
  render(lines);
}

// Every PhoneNumber query method, so none is dropped from the bundle.
function describeNumber(number: PhoneNumber): string[] {
  return [
    `valid: ${number.isValid()}`,
    `possible: ${number.isPossible()}`,
    `possibleWithReason: ${JSON.stringify(number.isPossibleWithReason())}`,
    `validationError: ${String(number.getValidationError())}`,
    `numberType: ${String(number.getNumberType())}`,
    `nationalNumber: ${number.getNationalNumber()}`,
    `callingCode: ${String(number.getCallingCode())}`,
    `country: ${String(number.getCountry())}`,
    `e164: ${String(number.formatE164())}`,
    `national: ${String(number.formatNational())}`,
    `international: ${String(number.formatInternational())}`,
    `uri: ${String(number.formatRfc3966())}`,
  ];
}

// The standalone helpers and engine-state queries.
function describeRegion(): string[] {
  return [
    `regions: ${REGION_CODES.length}`,
    `engineReady: ${isEngineReady()}`,
    `callingCode(${REGION}): ${getCallingCodeForCountry(REGION)}`,
    `supports ${NUMBER_TYPE}: ${countrySupportsNumberTypes(REGION, [NUMBER_TYPE])}`,
    `nationalPrefixOptional: ${isNationalPrefixOptional(REGION, NUMBER_TYPE)}`,
    `placeholders: ${JSON.stringify(getPlaceholders(REGION, NUMBER_TYPE))}`,
  ];
}

function driveControllers(): string[] {
  return [
    `national: ${exerciseController(createNationalInputController({ country: REGION }))}`,
    `international: ${exerciseController(createInternationalInputController())}`,
  ];
}

// Calls every InputController member, so the controller implementation ships.
function exerciseController(controller: InputController): string {
  controller.setCountryFilter([REGION]);
  controller.setNumberTypeFilter([NUMBER_TYPE]);
  controller.setCountry(REGION);
  let state = controller.setValue('');
  state = controller.insert(state.value, '2015550123', state.value.length, state.value.length);
  state = controller.deleteBackward(state.value, state.value.length, state.value.length);
  state = controller.deleteForward(state.value, 0, 0);
  if (controller.canUndo) state = controller.undo();
  if (controller.canRedo) state = controller.redo();
  const live = controller.currentState;
  const formatted = String(controller.getPhoneNumber().formatInternational());
  controller.clearHistory();
  return `${state.value}/${live.value} (${formatted})`;
}

function render(lines: readonly string[]): void {
  const app = document.querySelector('#app');
  if (app) app.textContent = lines.join('\n');
}

void main();
