import { REGION_CODES as ENGINE_REGION_CODES } from './engine';

// The exported constant is process-wide; freezing keeps a consumer mutation from poisoning it.
export const REGION_CODES = Object.freeze(ENGINE_REGION_CODES);
