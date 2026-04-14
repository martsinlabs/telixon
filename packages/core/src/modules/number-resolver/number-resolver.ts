import {
  CallingCodeLayer,
  getNextGraphState,
  GraphLayer,
  hasTerminalPrefix,
  isCallingCodeState,
} from '@telixon/core/engine';
import { getResourceProvider } from '@telixon/core/resource-provider';
import { ResourceProvider } from '@telixon/core/resource-provider/models';

export class NumberResolver {
  private readonly resourceProvider: ResourceProvider = getResourceProvider();

  private readonly graphLayer: GraphLayer = this.resourceProvider.graphLayer;

  private readonly callingCodeLayer: CallingCodeLayer = this.resourceProvider.callingCodeLayer;

  private _state: number = 0;

  private _lastTerminalState: number = this.graphLayer.deadStateId;

  private _callingCodeDigits: number[] = [];

  private _nationalDigits: number[] = [];

  advance(digit: number): void {
    this._state = getNextGraphState(this.graphLayer, this._state, digit);

    if (isCallingCodeState(this.callingCodeLayer, this._state)) {
      this._callingCodeDigits.push(digit);
    } else {
      this._nationalDigits.push(digit);
    }

    if (hasTerminalPrefix(this.graphLayer, this._state)) {
      this._lastTerminalState = this._state;
    }
  }

  setCallingCode(code: string): void {
    this.reset();

    for (let i = 0; i < code.length; i++) {
      this.advance(code.charCodeAt(i) - 48);
    }
  }

  reset(): void {
    this._state = 0;
    this._lastTerminalState = this.graphLayer.deadStateId;
    this._callingCodeDigits.length = 0;
    this._nationalDigits.length = 0;
  }

  getCallingCode(): string {
    return this._callingCodeDigits.join('');
  }

  getNationalNumber(): string {
    return this._nationalDigits.join('');
  }

  get state(): number {
    return this._state;
  }

  get lastTerminalState(): number {
    return this._lastTerminalState;
  }
}
