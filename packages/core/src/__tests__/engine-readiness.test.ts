import { describe, expect, it } from 'vitest';
import { EngineNotReadyError } from '../errors/engine-not-ready-error';
import { isEngineReady } from '../resource-provider';

describe('engine readiness', () => {
  it('reports the engine every other test runs on', () => {
    expect(isEngineReady()).toBe(true);
  });

  it('names itself and points at the call that loads the engine', () => {
    const error = new EngineNotReadyError();

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('EngineNotReadyError');
    expect(error.message).toContain('ensureEngineReady()');
  });
});
