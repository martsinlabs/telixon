import { ChangeDetectionStrategy, Component, computed, input, type InputSignal, type Signal } from '@angular/core';
import type { RegionCode } from '@telixon/core';
import { flagTransform } from '@telixon/web-sdk/flags';

/**
 * The flag of a region, cut from the web-sdk sprite sheet. The application's styles need
 * `@telixon/angular/flags/flags.css`. The flag is decorative, which leaves the region's name to the
 * text next to it.
 *
 * ```html
 * <telixon-flag [region]="'US'" />
 * ```
 */
@Component({
  selector: 'telixon-flag',
  template: `<span class="tlx-flag__image" [style.transform]="transform()"></span>`,
  host: { class: 'tlx-flag', 'aria-hidden': 'true' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TelixonFlag {
  /** The region whose flag shows. `null` shows the neutral flag. */
  readonly region: InputSignal<RegionCode | null> = input.required();

  protected readonly transform: Signal<string> = computed(() => flagTransform(this.region()));
}
