import {
  ReferenceMapping,
  FormatsTable,
  TerritorySpecTable,
  GraphLayer,
  CallingCodeLayer,
  CountryScopeLayer,
  NumberTypeScopeLayer,
  NumberTypeProfileLayer,
} from "@telixon/core/engine";

export abstract class ResourceProvider {
  abstract refMapping: ReferenceMapping;
  abstract formatsTable: FormatsTable;
  abstract territorySpecTable: TerritorySpecTable;
  abstract graphLayer: GraphLayer;
  abstract callingCodeLayer: CallingCodeLayer;
  abstract countryScopeLayer: CountryScopeLayer;
  abstract numberTypeScopeLayer: NumberTypeScopeLayer;
  abstract numberTypeProfileLayer: NumberTypeProfileLayer;

  abstract ensureReady(): Promise<void>;

  abstract get isReady(): boolean;
}
