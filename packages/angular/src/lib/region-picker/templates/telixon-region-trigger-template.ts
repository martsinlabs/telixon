import { Directive, inject, TemplateRef } from '@angular/core';
import type { TelixonRegionTriggerContext } from '../models';

/**
 * Replaces the content of the trigger in a `<telixon-region-picker>`.
 *
 * ```html
 * <ng-template telixonRegionTrigger let-region><telixon-flag [region]="region" /></ng-template>
 * ```
 */
@Directive({ selector: 'ng-template[telixonRegionTrigger]' })
export class TelixonRegionTriggerTemplate {
  readonly template: TemplateRef<TelixonRegionTriggerContext> = inject(TemplateRef);

  static ngTemplateContextGuard(
    _directive: TelixonRegionTriggerTemplate,
    _context: unknown,
  ): _context is TelixonRegionTriggerContext {
    return true;
  }
}
