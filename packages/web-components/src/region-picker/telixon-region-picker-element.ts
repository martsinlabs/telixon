import type { RegionCode } from '@telixon/core';
import type { PhoneInput, RegionOption, RegionPicker, RegionPickerState } from '@telixon/web-sdk';
import { ARIA_LABEL_ATTRIBUTE } from '../constants/aria';
import { FALSE_VALUE } from '../constants/attribute-values';
import { REGION_PICKER_TAG } from '../constants/tag-names';
import { STATE_EVENT, type TelixonPhoneFieldElement, type TelixonPhoneFieldOptions } from '../phone-field';
import { keepsCallingCodeInInput } from '../utils/calling-code-in-input';
import { subscribeToField } from '../utils/field-channel';
import { listAttribute } from '../utils/list-attribute';
import { isRegionCode } from '../utils/region-code';
import {
  ANCHOR_ATTRIBUTE,
  AUTO_FOCUS_ATTRIBUTE,
  DISABLED_DATA_ATTRIBUTE,
  EMPTY_TEXT_ATTRIBUTE,
  FOR_ATTRIBUTE,
  LOCALE_ATTRIBUTE,
  OBSERVED_ATTRIBUTES,
  PRIORITIZE_ATTRIBUTE,
  SEARCH_LABEL_ATTRIBUTE,
  SORT_ATTRIBUTE,
  TRIGGER_LABEL_ATTRIBUTE,
} from './constants/attributes';
import { INERT_ATTRIBUTE_FILTER } from './constants/field';
import { DEFAULT_EMPTY_TEXT, DEFAULT_SEARCH_LABEL, DEFAULT_TRIGGER_LABEL, LABEL_SEPARATOR } from './constants/labels';
import { OPTION_TEMPLATE_SLOT, PLACEHOLDER_ATTRIBUTE, TRIGGER_TEMPLATE_SLOT } from './constants/markup';
import { DEFAULT_POPUP_OFFSET, POPUP_OFFSET_X_PROPERTY, POPUP_OFFSET_Y_PROPERTY } from './constants/popup';
import { ACTIVE_ROW_SELECTOR } from './constants/rows';
import { ALPHABETICAL_SORT } from './constants/sort';
import { REGION_PICKER_STYLESHEET } from './constants/stylesheet';
import type { TelixonPopupOffset, TelixonRenderOption, TelixonRenderTrigger } from './models';
import { adoptStylesheet } from './utils/adopt-stylesheet';
import { changedTemplateSlots } from './utils/changed-template-slots';
import {
  createPickerConnection,
  type PickerConnection,
  type PickerListOptions,
  type PickerRenderers,
} from './utils/picker-connection';
import { buildPickerMarkup, type PickerMarkup } from './utils/picker-markup';
import { createPopupPresenter, type PopupPresenter } from './utils/popup-presenter';
import { readSort } from './utils/read-sort';
import { renderEmpty } from './utils/render-empty';
import { optionRenderer } from './utils/render-option';
import { triggerContent } from './utils/render-trigger';
import { resolveAnchor } from './utils/resolve-anchor';
import { resolveLocale } from './utils/resolve-locale';
import { resolveTarget } from './utils/resolve-target';
import { revealRow } from './utils/reveal-row';
import { templateSelector } from './utils/template-selector';
import { validateSelector } from './utils/validate-selector';

const DEFAULT_LIST_OPTIONS: PickerListOptions = Object.freeze({ sort: ALPHABETICAL_SORT, prioritize: [] });

/**
 * The region picker of a phone field, a trigger with the flag and a searchable list of regions. It
 * belongs to the field around it, or to the one `for` names. The phone field owns the region. A pick
 * hands it to the field, while a typed number moves the flag.
 *
 * The list follows the field's `regionFilter` and `numberTypeFilter`. Its names come from the
 * `locale` attribute, the closest `lang`, or the browser. The list opens in the top layer, which no
 * ancestor clips. The trigger, popup, search field, listbox, and rows live in the element's shadow
 * root, styled through `::part()` and the `--tlx-picker-*` custom properties. The flags inside are
 * its `flag` part, which `@telixon/web-components/flags/flags.css` paints like every other flag.
 *
 * ```html
 * <telixon-phone-field default-region="US">
 *   <telixon-region-picker></telixon-region-picker>
 *   <input type="tel" />
 * </telixon-phone-field>
 * ```
 *
 * A picker outside its field names the field, or an element inside it, through `for`.
 */
export class TelixonRegionPickerElement extends HTMLElement {
  static readonly observedAttributes: readonly string[] = OBSERVED_ATTRIBUTES;

  private readonly root: ShadowRoot;
  private readonly markup: PickerMarkup;
  private readonly presenter: PopupPresenter;
  private stylesheet: CSSStyleSheet | null = null;
  private target: TelixonPhoneFieldElement | null = null;
  private connectedPhone: PhoneInput | null = null;
  private stopFollowingTarget: (() => void) | null = null;
  private rootObserver: MutationObserver | null = null;
  private templateObserver: MutationObserver | null = null;
  private forElementProperty: Element | null = null;
  private anchorProperty: HTMLElement | string | null = null;
  private popupOffsetProperty: TelixonPopupOffset = DEFAULT_POPUP_OFFSET;
  private renderOptionProperty: TelixonRenderOption | null = null;
  private renderTriggerProperty: TelixonRenderTrigger | null = null;
  // The list options the attributes name, parsed when they change and reused for every state.
  private listOptions: PickerListOptions = DEFAULT_LIST_OPTIONS;
  private paintedTrigger: string | null = null;
  // The options the list filters were last taken from. A keystroke leaves them as they are.
  private syncedOptions: TelixonPhoneFieldOptions | null = null;
  private wasOpen: boolean = false;

  private readonly connection: PickerConnection = createPickerConnection(navigator.language, {
    onState: (state: RegionPickerState): void => this.present(state),
  });

  constructor() {
    super();
    this.root = this.attachShadow({ mode: 'open' });
    this.markup = buildPickerMarkup(this.root);
    this.presenter = createPopupPresenter({ popup: this.markup.popup, host: this });
  }

  /** The phone field the picker belongs to, as an element. `null` leaves it to the `for` attribute. */
  get forElement(): Element | null {
    return this.forElementProperty;
  }

  set forElement(element: Element | null) {
    this.forElementProperty = element;
    this.followTarget();
  }

  /**
   * The element the list lines up with and takes its width from, or a selector naming the closest
   * ancestor. `null` leaves it to the `anchor` attribute. Without one the picker anchors itself.
   */
  get anchor(): HTMLElement | string | null {
    return this.anchorProperty;
  }

  set anchor(anchor: HTMLElement | string | null) {
    this.anchorProperty =
      typeof anchor === 'string' ? validateSelector(anchor, ANCHOR_ATTRIBUTE, this.ownerDocument) : anchor;
  }

  /** How far the list sits from its anchor. Four pixels below it by default. */
  get popupOffset(): TelixonPopupOffset {
    return this.popupOffsetProperty;
  }

  set popupOffset(offset: TelixonPopupOffset) {
    this.popupOffsetProperty = offset;
    this.markup.popup.style.setProperty(POPUP_OFFSET_X_PROPERTY, `${offset.x}px`);
    this.markup.popup.style.setProperty(POPUP_OFFSET_Y_PROPERTY, `${offset.y}px`);
  }

  /** Builds the row of a region. `null` leaves the rows to the `option` template or to the default markup. */
  get renderOption(): TelixonRenderOption | null {
    return this.renderOptionProperty;
  }

  set renderOption(render: TelixonRenderOption | null) {
    if (render === this.renderOptionProperty) return;
    this.renderOptionProperty = render;
    this.reconnect();
  }

  /** Builds the content of the trigger. `null` leaves it to the `trigger` template or to the default markup. */
  get renderTrigger(): TelixonRenderTrigger | null {
    return this.renderTriggerProperty;
  }

  set renderTrigger(render: TelixonRenderTrigger | null) {
    if (render === this.renderTriggerProperty) return;
    this.renderTriggerProperty = render;
    this.paintedTrigger = null;
    this.paintCurrentTrigger();
  }

  /** The web-sdk region picker behind the element, `null` until the phone field is live. */
  get picker(): RegionPicker | null {
    return this.connection.picker();
  }

  /** The picker's latest state, `null` until the phone field is live. */
  get state(): RegionPickerState | null {
    return this.connection.state();
  }

  connectedCallback(): void {
    // A document without a window gives no sheet, which the next connect tries again.
    if (this.stylesheet === null) this.stylesheet = adoptStylesheet(this.root, REGION_PICKER_STYLESHEET);
    this.popupOffset = this.popupOffsetProperty;
    this.readListOptions();
    this.applyLabels();
    this.connection.localize(resolveLocale(this.getAttribute(LOCALE_ATTRIBUTE), this));
    this.templateObserver = new MutationObserver((records: MutationRecord[]): void => this.followTemplates(records));
    this.templateObserver.observe(this, { childList: true });
    this.followTarget();
  }

  disconnectedCallback(): void {
    this.templateObserver?.disconnect();
    this.templateObserver = null;
    this.stopWatchingRoot();
    this.unfollowTarget();
    this.connection.disconnect();
    this.connectedPhone = null;
    this.closePopup();
  }

  attributeChangedCallback(name: string, previous: string | null, next: string | null): void {
    if (previous === next) return;
    if (name === ANCHOR_ATTRIBUTE && next !== null) validateSelector(next, ANCHOR_ATTRIBUTE, this.ownerDocument);
    if (name === PRIORITIZE_ATTRIBUTE || name === SORT_ATTRIBUTE) this.readListOptions();
    if (!this.isConnected) return;
    if (name === FOR_ATTRIBUTE) this.followTarget();
    else if (name === LOCALE_ATTRIBUTE) this.connection.localize(resolveLocale(next, this));
    else if (name === PRIORITIZE_ATTRIBUTE || name === SORT_ATTRIBUTE || name === EMPTY_TEXT_ATTRIBUTE)
      this.reconnect();
    else if (name === TRIGGER_LABEL_ATTRIBUTE) {
      this.applyLabels();
      this.paintCurrentTrigger();
    } else if (name === SEARCH_LABEL_ATTRIBUTE) this.applyLabels();
  }

  private triggerLabel(): string {
    return this.getAttribute(TRIGGER_LABEL_ATTRIBUTE) ?? DEFAULT_TRIGGER_LABEL;
  }

  private autoFocus(): boolean {
    return this.getAttribute(AUTO_FOCUS_ATTRIBUTE) !== FALSE_VALUE;
  }

  private template(slot: string): HTMLTemplateElement | null {
    return this.querySelector<HTMLTemplateElement>(templateSelector(slot));
  }

  // A value no attribute accepts throws at the author's write, before any state depends on it.
  private readListOptions(): void {
    const prioritize: RegionCode[] = listAttribute(this.getAttribute(PRIORITIZE_ATTRIBUTE)).map(
      (entry: string): RegionCode => {
        if (isRegionCode(entry)) return entry;
        throw new TypeError(`<${REGION_PICKER_TAG}> does not accept ${PRIORITIZE_ATTRIBUTE}="${entry}".`);
      },
    );
    this.listOptions = { sort: readSort(this.getAttribute(SORT_ATTRIBUTE)), prioritize };
  }

  private renderers(): PickerRenderers {
    const emptyText: string = this.getAttribute(EMPTY_TEXT_ATTRIBUTE) ?? DEFAULT_EMPTY_TEXT;
    return {
      renderOption: optionRenderer(this.ownerDocument, this.renderOptionProperty, this.template(OPTION_TEMPLATE_SLOT)),
      renderEmpty: (): HTMLElement => renderEmpty(this.ownerDocument, emptyText),
      renderTrigger: (selected: RegionOption | null): void => this.paintTrigger(selected),
    };
  }

  private applyLabels(): void {
    const markup: PickerMarkup = this.markup;
    const searchLabel: string = this.getAttribute(SEARCH_LABEL_ATTRIBUTE) ?? DEFAULT_SEARCH_LABEL;
    markup.search.setAttribute(ARIA_LABEL_ATTRIBUTE, searchLabel);
    markup.search.setAttribute(PLACEHOLDER_ATTRIBUTE, searchLabel);
    markup.listbox.setAttribute(ARIA_LABEL_ATTRIBUTE, this.triggerLabel());
  }

  private paintCurrentTrigger(): void {
    this.paintTrigger(this.connection.state()?.selected ?? null);
  }

  // A template the parser appends after connecting the element, or one a framework swaps, takes effect at once.
  private followTemplates(records: readonly MutationRecord[]): void {
    const slots: ReadonlySet<string> = changedTemplateSlots(records);
    if (slots.has(TRIGGER_TEMPLATE_SLOT)) {
      this.paintedTrigger = null;
      this.paintCurrentTrigger();
    }
    if (slots.has(OPTION_TEMPLATE_SLOT)) this.reconnect();
  }

  // Before the engine loads, the flag comes from the field's default region. An unchanged trigger is left as it is.
  private paintTrigger(selected: RegionOption | null): void {
    const options: TelixonPhoneFieldOptions | null = this.target?.options ?? null;
    const region: RegionCode | null = selected?.region ?? options?.defaultRegion ?? null;
    // A field that keeps the calling code out of its text shows it on the trigger instead.
    const withCallingCode: boolean = options !== null && !keepsCallingCodeInInput(options);
    const label: string = this.triggerLabel();
    const key: string = [region, selected?.displayName, selected?.callingCode, withCallingCode, label].join('\u0000');
    if (key === this.paintedTrigger) return;
    this.paintedTrigger = key;

    const content: Node = triggerContent(
      this.ownerDocument,
      this.renderTriggerProperty,
      this.template(TRIGGER_TEMPLATE_SLOT),
      region,
      selected,
      withCallingCode,
    );
    this.markup.trigger.replaceChildren(content);
    this.markup.trigger.setAttribute(
      ARIA_LABEL_ATTRIBUTE,
      selected === null ? label : `${label}${LABEL_SEPARATOR}${selected.displayName}`,
    );
  }

  private resolveFor(): TelixonPhoneFieldElement | null {
    return resolveTarget(this.forElementProperty, this.getAttribute(FOR_ATTRIBUTE), this);
  }

  private followTarget(): void {
    if (!this.isConnected) return;
    this.unfollowTarget();
    const target: TelixonPhoneFieldElement | null = this.resolveFor();
    this.target = target;
    if (target === null) this.watchRootForTarget();
    else this.stopWatchingRoot();
    if (target !== null) {
      const sync = (): void => this.syncWithTarget();
      const stopField: () => void = subscribeToField(target, sync);
      target.addEventListener(STATE_EVENT, sync);
      // The field mirrors its disabled and read-only state onto its input, which is where the picker reads them.
      const observer: MutationObserver = new MutationObserver(sync);
      observer.observe(target, { subtree: true, attributes: true, attributeFilter: [...INERT_ATTRIBUTE_FILTER] });
      this.stopFollowingTarget = (): void => {
        stopField();
        target.removeEventListener(STATE_EVENT, sync);
        observer.disconnect();
      };
    }
    this.syncWithTarget();
  }

  // The field may be upgraded after the picker, or arrive later. A microtask covers the first, the root observer the second.
  private watchRootForTarget(): void {
    if (this.rootObserver !== null) return;
    const root: Node = this.getRootNode();
    const retry = (): void => {
      if (this.target !== null || !this.isConnected || this.resolveFor() === null) return;
      this.followTarget();
    };
    this.rootObserver = new MutationObserver(retry);
    this.rootObserver.observe(root, { childList: true, subtree: true });
    queueMicrotask(retry);
  }

  private stopWatchingRoot(): void {
    this.rootObserver?.disconnect();
    this.rootObserver = null;
  }

  private unfollowTarget(): void {
    this.stopFollowingTarget?.();
    this.stopFollowingTarget = null;
    this.target = null;
  }

  // The field replaces its widget when its options ask for one, which the picker follows.
  private syncWithTarget(): void {
    const target: TelixonPhoneFieldElement | null = this.target;
    const phone: PhoneInput | null = target?.phone ?? null;
    const options: TelixonPhoneFieldOptions | null = target?.options ?? null;
    if (options !== this.syncedOptions) {
      this.syncedOptions = options;
      this.connection.filter(options?.regionFilter ?? null, options?.numberTypeFilter ?? null);
    }
    if (phone !== this.connectedPhone) {
      this.connectedPhone = phone;
      if (phone === null) {
        this.connection.disconnect();
        this.closePopup();
      } else {
        this.connection.connect(phone, this.markup, this.listOptions, this.renderers(), target?.inputElement ?? null);
      }
    }
    this.paintCurrentTrigger();
    this.applyInert(target);
  }

  private reconnect(): void {
    if (!this.isConnected || this.connectedPhone === null) return;
    this.connection.connect(
      this.connectedPhone,
      this.markup,
      this.listOptions,
      this.renderers(),
      this.target?.inputElement ?? null,
    );
  }

  // A disabled or read-only field takes no pick. Its picker shows and does nothing.
  private applyInert(target: TelixonPhoneFieldElement | null): void {
    const input: HTMLInputElement | null = target?.inputElement ?? null;
    const isInert: boolean = input === null || input.disabled || input.readOnly;
    this.markup.trigger.disabled = this.connection.picker() === null || isInert;
    if (isInert) {
      this.setAttribute(DISABLED_DATA_ATTRIBUTE, '');
      this.connection.picker()?.close();
    } else {
      this.removeAttribute(DISABLED_DATA_ATTRIBUTE);
    }
  }

  private closePopup(): void {
    this.presenter.hide();
    this.wasOpen = false;
  }

  // The attachment has shown or hidden the popup by now. The rows are in the DOM, which is what the measuring, the scroll, and the focus need.
  private present(state: RegionPickerState): void {
    if (state.open === this.wasOpen) return;
    this.wasOpen = state.open;
    const markup: PickerMarkup = this.markup;
    if (!state.open) {
      this.presenter.hide();
      return;
    }
    this.presenter.show(
      resolveAnchor(this.anchorProperty ?? this.getAttribute(ANCHOR_ATTRIBUTE), this),
      this.popupOffsetProperty,
    );
    markup.listbox.scrollTop = 0;
    const activeRow: HTMLElement | null = markup.listbox.querySelector<HTMLElement>(ACTIVE_ROW_SELECTOR);
    if (activeRow !== null) revealRow(markup.listbox, activeRow);
    if (this.autoFocus()) markup.search.focus({ preventScroll: true });
  }
}
