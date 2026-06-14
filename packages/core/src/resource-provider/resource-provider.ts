import {
  Engine,
  findMetadataCallingCode,
  getMetadataNumberTypeName,
  getMetadataPlaceholders,
  getMetadataRegionCallingCode,
  getMetadataRegionCount,
  getMetadataRegionId,
  getRegionLeadingDigits,
  MetadataNumberType,
  parseEngine,
  REGION_IDS,
  RegionId,
} from '../engine';
import { TelixonNotReadyError } from '../errors';
import { ResourceLoader } from '../resource-loader/models';
import { getResourceLoader } from '../resource-loader/resource-loader.config';
import { MetadataPlaceholders, ResourceProvider } from './models';

// The metadata region order is REGION_IDS (alphabetical); a mismatch means a broken artifact.
function resolveRegionIds(engine: Engine): readonly RegionId[] {
  const count: number = getMetadataRegionCount(engine);
  if (count !== REGION_IDS.length) throw new Error('Engine metadata region count differs from REGION_IDS');
  for (let regionIndex = 0; regionIndex < count; regionIndex++) {
    if (getMetadataRegionId(engine, regionIndex) !== REGION_IDS[regionIndex]) {
      throw new Error('Engine metadata region order differs from REGION_IDS');
    }
  }
  return REGION_IDS;
}

function buildRegionKeyToIndex(regionIds: readonly RegionId[]): Record<string, number> {
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

function buildCallingCodeIndexByCountry(
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

  private loader: ResourceLoader = getResourceLoader();

  engine!: Engine;

  regionIds!: readonly RegionId[];
  regionKeyToIndex!: Readonly<Record<string, number>>;
  callingCodeIndexByCode!: Readonly<Record<number, number>>;
  callingCodeIndexByCountry!: Int16Array;
  numberTypeNames!: readonly MetadataNumberType[];
  regionHasLeadingDigits!: Uint8Array;
  placeholders!: MetadataPlaceholders;

  async ensureReady(): Promise<void> {
    if (this.ready) return;

    if (!this.loading) {
      this.loading = this.loadAll();
    }

    return this.loading;
  }

  // Synchronous init: only local byte channels (bundled modules) support it; on the network channel the bytes may still be in flight (TelixonNotReadyError).
  ensureReadySync(): void {
    if (this.ready) return;

    const loader: ResourceLoader = this.loader;
    const loadEngineBytesSync = loader.loadEngineBytesSync?.bind(loader);
    if (!loadEngineBytesSync) {
      // Self-healing: restarts a background load that failed earlier (no-op while one is in flight), so the engine recovers at the next API touch.
      void this.ensureReady().catch(() => undefined);
      throw new TelixonNotReadyError();
    }

    this.materialize(parseEngine(loadEngineBytesSync()));
  }

  get isReady(): boolean {
    return this.ready;
  }

  private async loadAll(): Promise<void> {
    try {
      const engine: Engine = parseEngine(await this.loader.loadEngineBytes());
      // A concurrent ensureReadySync may have materialized while the async loads were in flight.
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

    this.regionIds = resolveRegionIds(engine);
    this.regionKeyToIndex = buildRegionKeyToIndex(this.regionIds);
    this.callingCodeIndexByCode = buildCallingCodeIndexByCode(engine, this.regionIds.length);
    this.callingCodeIndexByCountry = buildCallingCodeIndexByCountry(
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

let instance: ResourceProvider | null = null;

export function getResourceProvider(): ResourceProvider {
  if (instance) return instance;

  instance = new DefaultResourceProvider();

  return instance;
}
