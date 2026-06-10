import {
  CallingCodeLayer,
  ENGINE_LAYOUT,
  FormatSelectLayer,
  FormatsTable,
  GraphLayer,
  NumberTypeProfileLayer,
  NumberTypeScopeLayer,
  parseCallingCodeBinary,
  parseFormatSelectBinary,
  parseGraphBinary,
  parseNumberTypeProfileBinary,
  parseNumberTypeScopeBinary,
  parseRegionScopeBinary,
  parseRegionSelectBinary,
  ReferenceMapping,
  RegionScopeLayer,
  RegionSelectLayer,
  TerritorySpecTable,
} from '../engine';
import { ResourceLoader } from '../resource-loader/models';

// Channel-agnostic artifact keys (`<folder>/<file>`); each loader composes ROOT, channel, and extension.
const FORMATS_PATH: string = `${ENGINE_LAYOUT.METADATA.FOLDER}/${ENGINE_LAYOUT.METADATA.FILES.FORMATS}`;
const REF_MAPPING_PATH: string = `${ENGINE_LAYOUT.METADATA.FOLDER}/${ENGINE_LAYOUT.METADATA.FILES.REFERENCE_MAPPING}`;
const TERRITORIES_PATH: string = `${ENGINE_LAYOUT.METADATA.FOLDER}/${ENGINE_LAYOUT.METADATA.FILES.TERRITORIES}`;
const GRAPH_PATH: string = `${ENGINE_LAYOUT.DFA.FOLDER}/${ENGINE_LAYOUT.DFA.FILES.GRAPH}`;
const CALLING_CODES_PATH: string = `${ENGINE_LAYOUT.DFA.FOLDER}/${ENGINE_LAYOUT.DFA.FILES.CALLING_CODES}`;
const COUNTRY_SCOPE_PATH: string = `${ENGINE_LAYOUT.DFA.FOLDER}/${ENGINE_LAYOUT.DFA.FILES.COUNTRY_SCOPE}`;
const NUMBER_TYPE_SCOPE_PATH: string = `${ENGINE_LAYOUT.DFA.FOLDER}/${ENGINE_LAYOUT.DFA.FILES.NUMBER_TYPE_SCOPE}`;
const NUMBER_TYPE_PROFILE_PATH: string = `${ENGINE_LAYOUT.DFA.FOLDER}/${ENGINE_LAYOUT.DFA.FILES.NUMBER_TYPE_PROFILE}`;
const FORMAT_SELECT_PATH: string = `${ENGINE_LAYOUT.DFA.FOLDER}/${ENGINE_LAYOUT.DFA.FILES.FORMAT_SELECT}`;
const REGION_SELECT_PATH: string = `${ENGINE_LAYOUT.DFA.FOLDER}/${ENGINE_LAYOUT.DFA.FILES.REGION_SELECT}`;

function parseJson<T>(buffer: ArrayBuffer): T {
  const text: string = new TextDecoder().decode(buffer);
  return JSON.parse(text);
}

export async function resolveRefMapping(loader: ResourceLoader): Promise<ReferenceMapping> {
  const buffer: ArrayBuffer = await loader.load(REF_MAPPING_PATH);
  return parseJson(buffer);
}

export async function resolveFormatsTable(loader: ResourceLoader): Promise<FormatsTable> {
  const buffer: ArrayBuffer = await loader.load(FORMATS_PATH);
  return parseJson(buffer);
}

export async function resolveTerritorySpecTable(loader: ResourceLoader): Promise<TerritorySpecTable> {
  const buffer: ArrayBuffer = await loader.load(TERRITORIES_PATH);
  return parseJson(buffer);
}

export async function resolveGraphLayer(loader: ResourceLoader): Promise<GraphLayer> {
  const buffer: ArrayBuffer = await loader.load(GRAPH_PATH);
  return parseGraphBinary(buffer);
}

export async function resolveCallingCodeLayer(loader: ResourceLoader): Promise<CallingCodeLayer> {
  const buffer: ArrayBuffer = await loader.load(CALLING_CODES_PATH);
  return parseCallingCodeBinary(buffer);
}

export async function resolveCountryScopeLayer(loader: ResourceLoader): Promise<RegionScopeLayer> {
  const buffer: ArrayBuffer = await loader.load(COUNTRY_SCOPE_PATH);
  return parseRegionScopeBinary(buffer);
}

export async function resolveNumberTypeScopeLayer(loader: ResourceLoader): Promise<NumberTypeScopeLayer> {
  const buffer: ArrayBuffer = await loader.load(NUMBER_TYPE_SCOPE_PATH);
  return parseNumberTypeScopeBinary(buffer);
}

export async function resolveNumberTypeProfileLayer(loader: ResourceLoader): Promise<NumberTypeProfileLayer> {
  const buffer: ArrayBuffer = await loader.load(NUMBER_TYPE_PROFILE_PATH);
  return parseNumberTypeProfileBinary(buffer);
}

export async function resolveFormatSelectLayer(loader: ResourceLoader): Promise<FormatSelectLayer> {
  const buffer: ArrayBuffer = await loader.load(FORMAT_SELECT_PATH);
  return parseFormatSelectBinary(buffer);
}

export async function resolveRegionSelectLayer(loader: ResourceLoader): Promise<RegionSelectLayer> {
  const buffer: ArrayBuffer = await loader.load(REGION_SELECT_PATH);
  return parseRegionSelectBinary(buffer);
}
