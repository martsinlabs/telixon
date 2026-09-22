import { DOCUMENT, NgTemplateOutlet } from '@angular/common';
import {
  afterRenderEffect,
  ChangeDetectionStrategy,
  Component,
  computed,
  contentChild,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  input,
  LOCALE_ID,
  Renderer2,
  untracked,
  viewChild,
  ViewEncapsulation,
  type InputSignal,
  type Signal,
} from '@angular/core';
import type { RegionCode } from '@telixon/core';
import type { RegionListSort, RegionOption, RegionPicker, RegionPickerState } from '@telixon/web-sdk';
import { TelixonFlag } from '../flag';
import type { TelixonPhoneInput, TelixonPhoneInputOptions } from '../phone-input';
import { DEFAULT_EMPTY_TEXT, DEFAULT_SEARCH_LABEL, DEFAULT_TRIGGER_LABEL } from './constants/labels';
import { DEFAULT_POPUP_OFFSET, POPUP_OFFSET_X_PROPERTY, POPUP_OFFSET_Y_PROPERTY } from './constants/popup';
import type { TelixonPopupOffset } from './models';
import { TelixonRegionOptionTemplate } from './templates/telixon-region-option-template';
import { TelixonRegionTriggerTemplate } from './templates/telixon-region-trigger-template';
import {
  createPickerConnection,
  type PickerConnection,
  type PickerElements,
  type PickerListOptions,
} from './utils/picker-connection';
import { createPopupPresenter, type PopupPresenter } from './utils/popup-presenter';
import { resolveAnchor } from './utils/resolve-anchor';
import { sameListOptions } from './utils/same-list-options';
import { showsCallingCode } from './utils/shows-calling-code';

/**
 * The region picker of a phone field, a trigger with the flag and a searchable list of regions. The
 * phone field owns the region. A pick hands it to the field, while a typed number moves the flag.
 *
 * The list follows the field's `regionFilter` and `numberTypeFilter`. Its names come from `LOCALE_ID`.
 * The list opens in the top layer, which no ancestor clips. The flags need
 * `@telixon/angular/flags/flags.css` among the application's styles.
 *
 * ```html
 * <telixon-region-picker [for]="phone" />
 * <input #phone="telixonPhoneInput" telixonPhoneInput [formControl]="control" />
 * ```
 */
@Component({
  selector: 'telixon-region-picker',
  exportAs: 'telixonRegionPicker',
  imports: [NgTemplateOutlet, TelixonFlag],
  templateUrl: './telixon-region-picker.html',
  styleUrl: './telixon-region-picker.css',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'tlx-region-picker',
    '[attr.data-disabled]': 'phoneInput().disabled() ? "" : null',
    [`[style.${POPUP_OFFSET_X_PROPERTY}.px]`]: 'popupOffset().x',
    [`[style.${POPUP_OFFSET_Y_PROPERTY}.px]`]: 'popupOffset().y',
    // A Material form field answers any click inside it by focusing its input, which would close the list.
    '(click)': '$event.stopPropagation()',
  },
})
export class TelixonRegionPicker {
  /** The phone field the picker belongs to, through its `telixonPhoneInput` export. */
  readonly phoneInput: InputSignal<TelixonPhoneInput> = input.required({ alias: 'for' });

  /** Regions shown first, in this order. */
  readonly prioritize: InputSignal<readonly RegionCode[]> = input<readonly RegionCode[]>([]);

  /** The order of the rows. */
  readonly sort: InputSignal<RegionListSort> = input<RegionListSort>('alphabetical');

  /** The locale of the region names. `LOCALE_ID` by default. */
  readonly locale: InputSignal<string> = input(inject(LOCALE_ID));

  /**
   * The element the list lines up with and takes its width from, such as the whole field. A selector
   * names the closest ancestor that matches it. The picker itself by default.
   */
  readonly anchor: InputSignal<HTMLElement | string | undefined> = input<HTMLElement | string>();

  /** How far the list sits from its anchor. Four pixels below it by default. */
  readonly popupOffset: InputSignal<TelixonPopupOffset> = input(DEFAULT_POPUP_OFFSET);

  /** The accessible name of the trigger and of the list. */
  readonly triggerLabel: InputSignal<string> = input(DEFAULT_TRIGGER_LABEL);

  /** The accessible name and the placeholder of the search field. */
  readonly searchLabel: InputSignal<string> = input(DEFAULT_SEARCH_LABEL);

  /** The text shown while no region matches the search. */
  readonly emptyText: InputSignal<string> = input(DEFAULT_EMPTY_TEXT);

  /** Whether the search field takes focus when the list opens, which raises the keyboard on a touch screen. */
  readonly autoFocus: InputSignal<boolean> = input(true);

  private readonly connection: PickerConnection = createPickerConnection(inject(LOCALE_ID));

  /** The web-sdk region picker behind the component, `null` until the phone field is live. */
  readonly picker: Signal<RegionPicker | null> = this.connection.picker;

  /** The picker's latest state, `null` until the phone field is live. */
  readonly state: Signal<RegionPickerState | null> = this.connection.state;

  protected readonly optionTemplate: Signal<TelixonRegionOptionTemplate | undefined> =
    contentChild(TelixonRegionOptionTemplate);
  protected readonly triggerTemplate: Signal<TelixonRegionTriggerTemplate | undefined> =
    contentChild(TelixonRegionTriggerTemplate);

  private readonly trigger: Signal<ElementRef<HTMLButtonElement>> = viewChild.required('trigger');
  private readonly popup: Signal<ElementRef<HTMLElement>> = viewChild.required('popup');
  private readonly listbox: Signal<ElementRef<HTMLElement>> = viewChild.required('listbox');
  private readonly search: Signal<ElementRef<HTMLInputElement>> = viewChild.required('search');

  private readonly host: HTMLElement = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly presenter: PopupPresenter = createPopupPresenter({
    popup: () => this.popup().nativeElement,
    host: this.host,
    renderer: inject(Renderer2),
    view: inject(DOCUMENT).defaultView,
  });

  private readonly fieldOptions: Signal<TelixonPhoneInputOptions> = computed(() => this.phoneInput().options());
  private readonly listOptions: Signal<PickerListOptions> = computed(
    () => ({ sort: this.sort(), prioritize: this.prioritize() }),
    { equal: sameListOptions },
  );

  protected readonly isOpen: Signal<boolean> = computed(() => this.state()?.open ?? false);
  protected readonly isInert: Signal<boolean> = computed(() => this.picker() === null || this.phoneInput().disabled());
  protected readonly selected: Signal<RegionOption | null> = computed(() => this.state()?.selected ?? null);

  // Before the engine loads, the flag comes from the field's default region.
  protected readonly region: Signal<RegionCode | null> = computed(
    () => this.selected()?.region ?? this.fieldOptions().defaultRegion ?? null,
  );

  protected readonly callingCode: Signal<string | null> = computed(() =>
    showsCallingCode(this.fieldOptions()) ? (this.selected()?.callingCode ?? null) : null,
  );

  protected readonly triggerAriaLabel: Signal<string> = computed(() => {
    const selected: RegionOption | null = this.selected();
    return selected === null ? this.triggerLabel() : `${this.triggerLabel()}, ${selected.displayName}`;
  });

  protected readonly activeRowId: Signal<string | null> = computed(() => {
    const active: RegionCode | null = this.state()?.active ?? null;
    return active === null ? null : this.rowId(active);
  });

  constructor() {
    effect(() => {
      const options: TelixonPhoneInputOptions = this.fieldOptions();
      this.connection.filter(options.regionFilter ?? null, options.numberTypeFilter ?? null);
    });

    effect(() => this.connection.localize(this.locale()));

    effect(() => {
      if (this.phoneInput().disabled()) untracked(() => this.picker()?.close());
    });

    // The field replaces its widget when its options ask for one, which the picker follows.
    afterRenderEffect(() => {
      const phone = this.phoneInput().phone();
      const listOptions: PickerListOptions = this.listOptions();
      untracked(() => this.connection.connect(phone, this.elements(), listOptions));
    });

    // The rows are in the DOM by now, which is what the measuring, the scroll, and the focus need.
    afterRenderEffect(() => {
      const isOpen: boolean = this.isOpen();
      untracked(() => (isOpen ? this.showList() : this.hideList()));
    });

    inject(DestroyRef).onDestroy(() => {
      this.presenter.destroy();
      this.connection.destroy();
    });
  }

  protected rowId(region: RegionCode): string | null {
    return this.connection.ids()?.option(region) ?? null;
  }

  private elements(): PickerElements {
    return {
      trigger: this.trigger().nativeElement,
      popup: this.popup().nativeElement,
      listbox: this.listbox().nativeElement,
      search: this.search().nativeElement,
      returnFocusTo: this.phoneInput().element,
    };
  }

  private showList(): void {
    this.presenter.show(resolveAnchor(this.host, this.anchor()), this.popupOffset());
    this.listbox().nativeElement.scrollTop = 0;
    this.connection.revealCursor();
    if (this.autoFocus()) this.search().nativeElement.focus({ preventScroll: true });
  }

  private hideList(): void {
    this.presenter.hide();
  }
}
