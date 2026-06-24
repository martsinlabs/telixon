import {
  Engine,
  findMetadataCallingCode,
  getMetadataNumberTypeName,
  getMetadataPlaceholders,
  getMetadataRegionCallingCode,
  getMetadataRegionCode,
  getMetadataRegionCount,
  getRegionLeadingDigits,
  MetadataNumberType,
  parseEngine,
  REGION_CODES,
  RegionCode,
} from '../engine';
import { ResourceLoader, SyncResourceLoader } from '../resource-loader/models';
import { MetadataPlaceholders, ResourceProvider } from './models';

// The metadata region order is REGION_CODES (alphabetical); a mismatch means a broken artifact.
function resolveRegionCodes(engine: Engine): readonly RegionCode[] {
  const count: number = getMetadataRegionCount(engine);
  if (count !== REGION_CODES.length) throw new Error('Engine metadata region count differs from REGION_CODES');
  for (let regionIndex = 0; regionIndex < count; regionIndex++) {
    if (getMetadataRegionCode(engine, regionIndex) !== REGION_CODES[regionIndex]) {
      throw new Error('Engine metadata region order differs from REGION_CODES');
    }
  }
  return REGION_CODES;
}

function buildRegionKeyToIndex(regionIds: readonly RegionCode[]): Record<string, number> {
  const map: Record<string, number> = {};
  for (let regionIndex = 0; regionIndex < regionIds.length; regionIndex++) map[regionIds[regionIndex]!] = regionIndex;
  return map;
}

// Every calling code is reachable through some region, so the region table bounds the scan.
function buildCallingCodeIndexByCode(engine: Engine, regionCount: number): Record<number, number> {
  const map: Record<number, number> = {};
  for (let regionIndex = 0; regionIndex < regionCount; regionIndex++) {
    const callingCode: number = getMetadataRegionCallingCode(engine, regionIndex);
    if (map[callingCode] === undefined) map[callingCode] = findMetadataCallingCode(engine, callingCode);
  }
  return map;
}

function buildCallingCodeIndexByRegion(
  engine: Engine,
  regionCount: number,
  callingCodeIndexByCode: Readonly<Record<number, number>>,
): Int16Array {
  const table = new Int16Array(regionCount).fill(-1);
  for (let regionIndex = 0; regionIndex < regionCount; regionIndex++) {
    table[regionIndex] = callingCodeIndexByCode[getMetadataRegionCallingCode(engine, regionIndex)] ?? -1;
  }
  return table;
}

// The binary is the trust boundary: type names decode as strings and are narrowed once here (GENERAL_DESC is the last id, bounding the scan).
const MAX_NUMBER_TYPE_IDS = 32;

function buildRegionHasLeadingDigits(engine: Engine, regionCount: number): Uint8Array {
  const table = new Uint8Array(regionCount);
  for (let regionIndex = 0; regionIndex < regionCount; regionIndex++) {
    if (getRegionLeadingDigits(engine, regionIndex) !== undefined) table[regionIndex] = 1;
  }
  return table;
}

function buildNumberTypeNames(engine: Engine): readonly MetadataNumberType[] {
  const names: MetadataNumberType[] = [];
  for (let typeId = 0; typeId < MAX_NUMBER_TYPE_IDS; typeId++) {
    const name: string = getMetadataNumberTypeName(engine, typeId);
    if (!name) break;
    names.push(name as MetadataNumberType);
  }
  return names;
}

class DefaultResourceProvider extends ResourceProvider {
  private ready = false;
  private loading: Promise<void> | undefined;

  engine!: Engine;

  regionIds!: readonly RegionCode[];
  regionKeyToIndex!: Readonly<Record<string, number>>;
  callingCodeIndexByCode!: Readonly<Record<number, number>>;
  callingCodeIndexByRegion!: Int16Array;
  numberTypeNames!: readonly MetadataNumberType[];
  regionHasLeadingDigits!: Uint8Array;
  placeholders!: MetadataPlaceholders;

  async ensureReady(loader: ResourceLoader): Promise<void> {
    if (this.ready) return;

    if (!this.loading) {
      this.loading = this.loadAll(loader);
    }

    return this.loading;
  }

  // Synchronous init from a local byte channel (bundled modules decode in-process); the network channel has no sync loader, so it never reaches here.
  ensureReadySync(loader: SyncResourceLoader): void {
    if (this.ready) return;
    this.materialize(parseEngine(loader.loadEngineBytesSync()));
  }

  get isReady(): boolean {
    return this.ready;
  }

  private async loadAll(loader: ResourceLoader): Promise<void> {
    try {
      const engine: Engine = parseEngine(await loader.loadEngineBytes());
      // A concurrent ensureReadySync may have materialized while the async load was in flight.
      if (this.ready) return;
      this.materialize(engine);
    } catch (error) {
      // A failed load (network flake or corrupt download) must not poison the process: clear so the next call retries.
      this.loading = undefined;
      throw error;
    }
  }

  private materialize(engine: Engine): void {
    this.engine = engine;

    this.regionIds = resolveRegionCodes(engine);
    this.regionKeyToIndex = buildRegionKeyToIndex(this.regionIds);
    this.callingCodeIndexByCode = buildCallingCodeIndexByCode(engine, this.regionIds.length);
    this.callingCodeIndexByRegion = buildCallingCodeIndexByRegion(
      engine,
      this.regionIds.length,
      this.callingCodeIndexByCode,
    );
    this.numberTypeNames = buildNumberTypeNames(engine);
    this.regionHasLeadingDigits = buildRegionHasLeadingDigits(engine, this.regionIds.length);

    const [digitPlaceholder, ignoredDigitPlaceholder, nationalPrefixPlaceholder] = getMetadataPlaceholders(engine);
    this.placeholders = { digitPlaceholder, ignoredDigitPlaceholder, nationalPrefixPlaceholder };

    this.ready = true;
  }
}

// One engine per process: the provider lives on globalThis (Symbol.for), so duplicate copies of this module (multiple bundles, federated chunks) share one instance; the module-local cache keeps the hot path a single read.
const PROVIDER_KEY = Symbol.for('telixon.core.resourceProvider');
let cachedProvider: ResourceProvider | undefined;

export function getResourceProvider(): ResourceProvider {
  if (cachedProvider) return cachedProvider;

  const store = globalThis as unknown as Record<symbol, ResourceProvider | undefined>;
  cachedProvider = store[PROVIDER_KEY] ?? new DefaultResourceProvider();
  store[PROVIDER_KEY] = cachedProvider;
  return cachedProvider;
}

// @internal Test and bench hook: drop the process-wide provider so the next getResourceProvider() rebuilds it.
export function __resetResourceProvider(): void {
  cachedProvider = undefined;
  (globalThis as unknown as Record<symbol, ResourceProvider | undefined>)[PROVIDER_KEY] = undefined;
}
