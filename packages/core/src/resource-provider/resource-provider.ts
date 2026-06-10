import {
  CallingCodeLayer,
  FormatSelectLayer,
  FormatsTable,
  GraphLayer,
  NumberTypeProfileLayer,
  NumberTypeScopeLayer,
  ReferenceMapping,
  RegionScopeLayer,
  RegionSelectLayer,
  TerritorySpecTable,
} from '../engine';
import { ResourceLoader } from '../resource-loader/models';
import { getResourceLoader } from '../resource-loader/resource-loader.config';
import { ResourceProvider } from './models';
import {
  resolveCallingCodeLayer,
  resolveCountryScopeLayer,
  resolveFormatSelectLayer,
  resolveFormatsTable,
  resolveGraphLayer,
  resolveNumberTypeProfileLayer,
  resolveNumberTypeScopeLayer,
  resolveRefMapping,
  resolveRegionSelectLayer,
  resolveTerritorySpecTable,
} from './resource-resolver';

class DefaultResourceProvider extends ResourceProvider {
  private ready = false;
  private loading?: Promise<void>;

  private loader: ResourceLoader = getResourceLoader();

  refMapping!: ReferenceMapping;
  formatsTable!: FormatsTable;
  territorySpecTable!: TerritorySpecTable;
  graphLayer!: GraphLayer;
  callingCodeLayer!: CallingCodeLayer;
  countryScopeLayer!: RegionScopeLayer;
  numberTypeScopeLayer!: NumberTypeScopeLayer;
  numberTypeProfileLayer!: NumberTypeProfileLayer;
  formatSelectLayer!: FormatSelectLayer;
  regionSelectLayer!: RegionSelectLayer;

  async ensureReady(): Promise<void> {
    if (this.ready) return;

    if (!this.loading) {
      this.loading = this.loadAll();
    }

    return this.loading;
  }

  get isReady(): boolean {
    return this.ready;
  }

  private async loadAll(): Promise<void> {
    const [
      refMapping,
      formatsTable,
      territorySpecTable,
      graphLayer,
      callingCodeLayer,
      countryScopeLayer,
      numberTypeScopeLayer,
      numberTypeProfileLayer,
      formatSelectLayer,
      regionSelectLayer,
    ] = await Promise.all([
      resolveRefMapping(this.loader),
      resolveFormatsTable(this.loader),
      resolveTerritorySpecTable(this.loader),
      resolveGraphLayer(this.loader),
      resolveCallingCodeLayer(this.loader),
      resolveCountryScopeLayer(this.loader),
      resolveNumberTypeScopeLayer(this.loader),
      resolveNumberTypeProfileLayer(this.loader),
      resolveFormatSelectLayer(this.loader),
      resolveRegionSelectLayer(this.loader),
    ]);

    this.refMapping = refMapping;
    this.formatsTable = formatsTable;
    this.territorySpecTable = territorySpecTable;
    this.graphLayer = graphLayer;
    this.callingCodeLayer = callingCodeLayer;
    this.countryScopeLayer = countryScopeLayer;
    this.numberTypeScopeLayer = numberTypeScopeLayer;
    this.numberTypeProfileLayer = numberTypeProfileLayer;
    this.formatSelectLayer = formatSelectLayer;
    this.regionSelectLayer = regionSelectLayer;

    this.ready = true;
  }
}

let instance: ResourceProvider | null = null;

export function getResourceProvider(): ResourceProvider {
  if (instance) return instance;

  instance = new DefaultResourceProvider();

  return instance;
}
