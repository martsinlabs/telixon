import { Directive, inject, TemplateRef } from '@angular/core';
import type { TelixonRegionOptionContext } from '../models';

/**
 * Replaces the content of every row in a `<telixon-region-picker>`.
 *
 * ```html
 * <ng-template telixonRegionOption let-option>{{ option.displayName }}</ng-template>
 * ```
 */
@Directive({ selector: 'ng-template[telixonRegionOption]' })
export class TelixonRegionOptionTemplate {
  readonly template: TemplateRef<TelixonRegionOptionContext> = inject(TemplateRef);

  static ngTemplateContextGuard(
    _directive: TelixonRegionOptionTemplate,
    _context: unknown,
  ): _context is TelixonRegionOptionContext {
    return true;
  }
}
