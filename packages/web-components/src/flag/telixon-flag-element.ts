import type { RegionCode } from '@telixon/core';
import { flagTransform } from '@telixon/web-sdk/flags';
import { ARIA_HIDDEN_ATTRIBUTE, ARIA_HIDDEN_VALUE } from '../constants/aria';
import { isRegionCode } from '../utils/region-code';
import { FLAG_REGION_ATTRIBUTE, TRANSFORM_PROPERTY } from './constants/flag';

/**
 * The flag of a region, cut from the web-sdk sprite sheet and painted on the element's own box. The
 * element adds no children, which lets server-rendered markup hydrate untouched. The page needs
 * `@telixon/web-components/flags/flags.css` among its styles. A region the sheet does not carry, and
 * no region at all, show the neutral flag.
 *
 * ```html
 * <telixon-flag region="US"></telixon-flag>
 * ```
 */
export class TelixonFlagElement extends HTMLElement {
  static readonly observedAttributes: readonly string[] = [FLAG_REGION_ATTRIBUTE];

  /** The region whose flag shows, `null` for the neutral flag. Reflected to the `region` attribute. */
  get region(): RegionCode | null {
    const value: string | null = this.getAttribute(FLAG_REGION_ATTRIBUTE);
    return value !== null && isRegionCode(value) ? value : null;
  }

  set region(region: RegionCode | null) {
    if (region === null) this.removeAttribute(FLAG_REGION_ATTRIBUTE);
    else this.setAttribute(FLAG_REGION_ATTRIBUTE, region);
  }

  connectedCallback(): void {
    this.setAttribute(ARIA_HIDDEN_ATTRIBUTE, ARIA_HIDDEN_VALUE);
    this.paint();
  }

  attributeChangedCallback(): void {
    this.paint();
  }

  private paint(): void {
    this.style.setProperty(TRANSFORM_PROPERTY, flagTransform(this.region));
  }
}
