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
} from '@telixon/core/engine';

export abstract class ResourceProvider {
  abstract refMapping: ReferenceMapping;
  abstract formatsTable: FormatsTable;
  abstract territorySpecTable: TerritorySpecTable;
  abstract graphLayer: GraphLayer;
  abstract callingCodeLayer: CallingCodeLayer;
  abstract countryScopeLayer: RegionScopeLayer;
  abstract numberTypeScopeLayer: NumberTypeScopeLayer;
  abstract numberTypeProfileLayer: NumberTypeProfileLayer;
  abstract formatSelectLayer: FormatSelectLayer;
  abstract regionSelectLayer: RegionSelectLayer;

  abstract ensureReady(): Promise<void>;

  abstract get isReady(): boolean;
}
