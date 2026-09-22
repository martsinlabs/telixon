import { Component, provideZonelessChangeDetection, signal, viewChild, viewChildren, type Type } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import type { RegionCode } from '@telixon/core';
import { flagTransform } from '@telixon/web-sdk/flags';
import { afterEach, describe, expect, it } from 'vitest';
import { TelixonFlag } from '../../flag';
import { TelixonPhoneInput, type TelixonPhoneInputOptions } from '../../phone-input';
import { TelixonRegionPicker } from '../telixon-region-picker';
import { TelixonRegionOptionTemplate } from '../templates/telixon-region-option-template';
import { TelixonRegionTriggerTemplate } from '../templates/telixon-region-trigger-template';

afterEach(() => {
  TestBed.resetTestingModule();
});

@Component({
  imports: [ReactiveFormsModule, TelixonPhoneInput, TelixonRegionPicker],
  template: `
    <div class="box">
      <telixon-region-picker
        [for]="phone"
        [prioritize]="prioritize()"
        [locale]="locale()"
        [autoFocus]="autoFocus()"
        [anchor]="anchor()"
        [popupOffset]="popupOffset()"
      />
      <input #phone="telixonPhoneInput" [telixonPhoneInput]="options()" [formControl]="control" />
    </div>
    <button id="outside">outside</button>
  `,
})
class FieldHost {
  readonly options = signal<TelixonPhoneInputOptions>({ mode: 'international', defaultRegion: 'US' });
  readonly prioritize = signal<readonly RegionCode[]>([]);
  readonly locale = signal('en');
  readonly autoFocus = signal(true);
  readonly anchor = signal<string | undefined>(undefined);
  readonly popupOffset = signal({ x: 0, y: 4 });
  readonly control = new FormControl<string | null>(null);
  readonly picker = viewChild.required(TelixonRegionPicker);
  readonly directive = viewChild.required(TelixonPhoneInput);
}

@Component({
  imports: [
    TelixonPhoneInput,
    TelixonRegionPicker,
    TelixonRegionOptionTemplate,
    TelixonRegionTriggerTemplate,
    TelixonFlag,
  ],
  template: `
    <telixon-region-picker [for]="phone">
      <ng-template telixonRegionTrigger let-region let-option="option">
        <span id="custom-trigger">{{ region }} {{ option?.displayName ?? 'loading' }}</span>
      </ng-template>
      <ng-template telixonRegionOption let-option>
        <span class="custom-option">{{ option.region }} / {{ option.displayName }}</span>
      </ng-template>
    </telixon-region-picker>
    <input #phone="telixonPhoneInput" [telixonPhoneInput]="{ mode: 'international', defaultRegion: 'US' }" />
  `,
})
class TemplatesHost {}

@Component({
  imports: [TelixonPhoneInput, TelixonRegionPicker],
  template: `
    <telixon-region-picker [for]="first" />
    <input #first="telixonPhoneInput" telixonPhoneInput />
    <telixon-region-picker [for]="second" />
    <input #second="telixonPhoneInput" telixonPhoneInput />
  `,
})
class TwoFieldsHost {
  readonly pickers = viewChildren(TelixonRegionPicker);
}

function configure(): void {
  TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
}

// Renders, lets the engine promise resolve, then renders what the widgets reported.
async function settle<T>(fixture: ComponentFixture<T>): Promise<void> {
  await fixture.whenStable();
  await new Promise((resolve) => setTimeout(resolve, 0));
  await fixture.whenStable();
}

async function mount<T>(host: Type<T>): Promise<ComponentFixture<T>> {
  const fixture: ComponentFixture<T> = TestBed.createComponent(host);
  await settle(fixture);
  return fixture;
}

function part<E extends HTMLElement>(fixture: ComponentFixture<unknown>, selector: string): E {
  return fixture.nativeElement.querySelector(selector);
}

const trigger = (fixture: ComponentFixture<unknown>) => part<HTMLButtonElement>(fixture, '.tlx-region-picker__trigger');
const popup = (fixture: ComponentFixture<unknown>) => part<HTMLElement>(fixture, '.tlx-region-picker__popup');
const search = (fixture: ComponentFixture<unknown>) => part<HTMLInputElement>(fixture, '.tlx-region-picker__search');
const phoneField = (fixture: ComponentFixture<unknown>) =>
  part<HTMLInputElement>(fixture, 'input:not(.tlx-region-picker__search)');
const triggerFlag = (fixture: ComponentFixture<unknown>) =>
  part<HTMLElement>(fixture, '.tlx-region-picker__trigger .tlx-flag__image').style.transform;

function rows(fixture: ComponentFixture<unknown>): HTMLElement[] {
  return Array.from(fixture.nativeElement.querySelectorAll('.tlx-region-picker__option'));
}

function row(fixture: ComponentFixture<unknown>, region: RegionCode): HTMLElement {
  return part(fixture, `.tlx-region-picker__option[data-region="${region}"]`);
}

function press(element: HTMLElement, key: string): void {
  element.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
}

function typeText(input: HTMLInputElement, text: string): void {
  for (const data of text) {
    input.dispatchEvent(
      new InputEvent('beforeinput', { inputType: 'insertText', data, bubbles: true, cancelable: true }),
    );
  }
}

async function query(fixture: ComponentFixture<unknown>, text: string): Promise<void> {
  search(fixture).value = text;
  search(fixture).dispatchEvent(new Event('input', { bubbles: true }));
  await settle(fixture);
}

async function open(fixture: ComponentFixture<unknown>): Promise<void> {
  trigger(fixture).click();
  await settle(fixture);
}

describe('TelixonRegionPicker: first paint', () => {
  it('shows the flag of the default region before the engine loads', () => {
    configure();
    const fixture = TestBed.createComponent(FieldHost);
    fixture.detectChanges();

    expect(fixture.componentInstance.picker().picker()).toBe(null);
    expect(triggerFlag(fixture)).toBe(flagTransform('US'));
    expect(trigger(fixture).disabled).toBe(true);
    expect(popup(fixture).hidden).toBe(true);
  });

  it('comes to life with the phone field', async () => {
    configure();
    const fixture = await mount(FieldHost);

    expect(fixture.componentInstance.picker().picker()).not.toBe(null);
    expect(trigger(fixture).disabled).toBe(false);
    expect(trigger(fixture).getAttribute('aria-label')).toBe('Select region, United States');
    expect(rows(fixture)).toEqual([]);
  });
});

describe('TelixonRegionPicker: the list', () => {
  it('opens on a click, renders the rows, and moves focus into the search field', async () => {
    configure();
    const fixture = await mount(FieldHost);

    await open(fixture);

    expect(popup(fixture).hidden).toBe(false);
    expect(trigger(fixture).getAttribute('aria-expanded')).toBe('true');
    expect(rows(fixture).length).toBeGreaterThan(200);
    expect(row(fixture, 'US').getAttribute('aria-selected')).toBe('true');
    expect(document.activeElement).toBe(search(fixture));
  });

  it('hands a picked region to the phone field, closes, and returns focus to the field', async () => {
    configure();
    const fixture = TestBed.createComponent(FieldHost);
    fixture.componentInstance.options.set({
      mode: 'international',
      defaultRegion: 'US',
      display: { callingCodeInInput: false },
    });
    await settle(fixture);
    await open(fixture);

    row(fixture, 'GB').click();
    await settle(fixture);

    expect(fixture.componentInstance.directive().state()?.region).toBe('GB');
    expect(part(fixture, '.tlx-region-picker__calling-code').textContent?.trim()).toBe('+44');
    expect(triggerFlag(fixture)).toBe(flagTransform('GB'));
    expect(popup(fixture).hidden).toBe(true);
    expect(rows(fixture)).toEqual([]);
    expect(document.activeElement).toBe(phoneField(fixture));
  });

  it('moves the flag when a typed number resolves to another region', async () => {
    configure();
    const fixture = TestBed.createComponent(FieldHost);
    fixture.componentInstance.options.set({ mode: 'international' });
    await settle(fixture);
    expect(triggerFlag(fixture)).toBe(flagTransform(null));

    typeText(phoneField(fixture), '+442071838750');
    await settle(fixture);

    expect(triggerFlag(fixture)).toBe(flagTransform('GB'));
  });

  it('narrows the rows through the search field and says when nothing matches', async () => {
    configure();
    const fixture = await mount(FieldHost);
    await open(fixture);

    await query(fixture, 'germ');
    expect(rows(fixture).map((element) => element.dataset['region'])).toEqual(['DE']);

    await query(fixture, 'zzzz');
    expect(rows(fixture)).toEqual([]);
    expect(part(fixture, '.tlx-region-picker__empty').textContent?.trim()).toBe('No matches');
  });

  it('announces the empty list from a status region outside the listbox', async () => {
    configure();
    const fixture = await mount(FieldHost);
    await open(fixture);
    const status = part(fixture, '.tlx-region-picker__empty');
    expect(status.getAttribute('role')).toBe('status');
    expect(status.textContent?.trim()).toBe('');

    await query(fixture, 'zzzz');

    expect(status.textContent?.trim()).toBe('No matches');
    expect(part(fixture, '.tlx-region-picker__listbox').contains(status)).toBe(false);
    expect(part(fixture, '.tlx-region-picker__listbox').children.length).toBe(0);
  });

  it('leaves focus on the trigger with autoFocus off', async () => {
    configure();
    const fixture = await mount(FieldHost);
    fixture.componentInstance.autoFocus.set(false);
    await settle(fixture);
    trigger(fixture).focus();

    await open(fixture);

    expect(popup(fixture).hidden).toBe(false);
    expect(document.activeElement).toBe(trigger(fixture));
  });

  it('closes on a press outside', async () => {
    configure();
    const fixture = await mount(FieldHost);
    await open(fixture);

    part(fixture, '#outside').dispatchEvent(new Event('pointerdown', { bubbles: true }));
    await settle(fixture);

    expect(popup(fixture).hidden).toBe(true);
  });
});

describe('TelixonRegionPicker: the top layer', () => {
  it('shows the list as a popover with its own coordinates, and hides it again', async () => {
    const calls: string[] = [];
    const prototype = HTMLElement.prototype as { showPopover?: () => void; hidePopover?: () => void };
    prototype.showPopover = (): void => void calls.push('show');
    prototype.hidePopover = (): void => void calls.push('hide');
    try {
      configure();
      const fixture = await mount(FieldHost);

      await open(fixture);
      expect(calls).toEqual(['show']);
      expect(popup(fixture).getAttribute('popover')).toBe('manual');
      expect(popup(fixture).style.top).toMatch(/px$/);
      expect(popup(fixture).style.left).toMatch(/px$/);
      expect(popup(fixture).getAttribute('data-side')).toBe('bottom');

      press(search(fixture), 'Escape');
      await settle(fixture);
      expect(calls).toEqual(['show', 'hide']);
    } finally {
      delete prototype.showPopover;
      delete prototype.hidePopover;
    }
  });

  it('stays inside the picker without the Popover API', async () => {
    configure();
    const fixture = await mount(FieldHost);

    await open(fixture);

    expect(popup(fixture).hidden).toBe(false);
    expect(popup(fixture).style.top).toBe('');
    expect(popup(fixture).getAttribute('data-align')).toBe('start');
  });

  it('takes its width from the closest ancestor a selector names', async () => {
    const prototype = HTMLElement.prototype as { showPopover?: () => void; hidePopover?: () => void };
    prototype.showPopover = (): void => undefined;
    prototype.hidePopover = (): void => undefined;
    try {
      configure();
      const fixture = TestBed.createComponent(FieldHost);
      fixture.componentInstance.anchor.set('.box');
      await settle(fixture);

      await open(fixture);

      expect(popup(fixture).style.width).toBe('0px');
    } finally {
      delete prototype.showPopover;
      delete prototype.hidePopover;
    }
  });

  it('keeps the offset from its anchor', async () => {
    const prototype = HTMLElement.prototype as { showPopover?: () => void; hidePopover?: () => void };
    prototype.showPopover = (): void => undefined;
    prototype.hidePopover = (): void => undefined;
    try {
      configure();
      const fixture = TestBed.createComponent(FieldHost);
      fixture.componentInstance.popupOffset.set({ x: 10, y: 12 });
      await settle(fixture);

      await open(fixture);

      expect(popup(fixture).style.top).toBe('12px');
      expect(popup(fixture).style.left).toBe('10px');
      expect(part(fixture, 'telixon-region-picker').style.getPropertyValue('--tlx-picker-popup-offset-y')).toBe('12px');
    } finally {
      delete prototype.showPopover;
      delete prototype.hidePopover;
    }
  });

  it('anchors itself when no ancestor matches the selector', async () => {
    configure();
    const fixture = TestBed.createComponent(FieldHost);
    fixture.componentInstance.anchor.set('.nothing');
    await settle(fixture);

    await open(fixture);

    expect(popup(fixture).style.width).toBe('');
  });

  it('keeps the trigger a tab stop, which Safari denies a plain button', async () => {
    configure();
    const fixture = await mount(FieldHost);

    expect(trigger(fixture).getAttribute('tabindex')).toBe('0');
  });
});

describe('TelixonRegionPicker: inside a form field', () => {
  it('keeps its clicks from the ancestors, which a Material form field answers by focusing its input', async () => {
    configure();
    const fixture = await mount(FieldHost);
    const reached: string[] = [];
    fixture.nativeElement.addEventListener('click', (event: MouseEvent) => {
      reached.push((event.target as HTMLElement).className);
    });

    await open(fixture);
    search(fixture).click();
    part(fixture, '#outside').click();

    expect(reached).toEqual(['']);
    expect(popup(fixture).hidden).toBe(false);
  });
});

describe('TelixonRegionPicker: keyboard', () => {
  it('opens on ArrowDown, moves the cursor, and picks on Enter', async () => {
    configure();
    const fixture = await mount(FieldHost);
    fixture.componentInstance.prioritize.set(['US', 'CA', 'GB']);
    await settle(fixture);

    press(trigger(fixture), 'ArrowDown');
    await settle(fixture);
    expect(popup(fixture).hidden).toBe(false);
    expect(row(fixture, 'US').dataset['active']).toBe('true');
    expect(search(fixture).getAttribute('aria-activedescendant')).toBe(row(fixture, 'US').id);

    press(search(fixture), 'ArrowDown');
    await settle(fixture);
    expect(row(fixture, 'CA').dataset['active']).toBe('true');
    expect(search(fixture).getAttribute('aria-activedescendant')).toBe(row(fixture, 'CA').id);

    press(search(fixture), 'Enter');
    await settle(fixture);
    expect(fixture.componentInstance.directive().state()?.region).toBe('CA');
    expect(popup(fixture).hidden).toBe(true);
  });

  it('closes on Escape and hands focus back to the trigger', async () => {
    configure();
    const fixture = await mount(FieldHost);
    await open(fixture);

    press(search(fixture), 'Escape');
    await settle(fixture);

    expect(popup(fixture).hidden).toBe(true);
    expect(document.activeElement).toBe(trigger(fixture));
  });
});

describe('TelixonRegionPicker: following the field', () => {
  it('takes its filters from the field and follows them when they change', async () => {
    configure();
    const fixture = TestBed.createComponent(FieldHost);
    fixture.componentInstance.options.set({
      mode: 'international',
      defaultRegion: 'US',
      regionFilter: ['US', 'CA', 'GB'],
    });
    await settle(fixture);
    await open(fixture);
    expect(rows(fixture).map((element) => element.dataset['region'])).toEqual(['CA', 'GB', 'US']);

    fixture.componentInstance.options.set({ mode: 'international', defaultRegion: 'US', regionFilter: ['US', 'CA'] });
    await settle(fixture);
    expect(rows(fixture).map((element) => element.dataset['region'])).toEqual(['CA', 'US']);
  });

  it('follows the field to a new widget and keeps the filters', async () => {
    configure();
    const fixture = TestBed.createComponent(FieldHost);
    fixture.componentInstance.options.set({ mode: 'international', defaultRegion: 'US', regionFilter: ['US', 'FR'] });
    await settle(fixture);
    const before = fixture.componentInstance.picker().picker();

    fixture.componentInstance.options.set({ mode: 'national', defaultRegion: 'US', regionFilter: ['US', 'FR'] });
    await settle(fixture);
    expect(fixture.componentInstance.picker().picker()).not.toBe(before);

    await open(fixture);
    expect(rows(fixture).map((element) => element.dataset['region'])).toEqual(['FR', 'US']);
    row(fixture, 'FR').click();
    await settle(fixture);
    expect(fixture.componentInstance.directive().state()?.region).toBe('FR');
  });

  it('shows the calling code once the field keeps it out of its text', async () => {
    configure();
    const fixture = TestBed.createComponent(FieldHost);
    fixture.componentInstance.options.set({
      mode: 'international',
      defaultRegion: 'US',
      display: { callingCodeInInput: false },
    });
    await settle(fixture);

    expect(part(fixture, '.tlx-region-picker__calling-code').textContent?.trim()).toBe('+1');
  });

  it('closes an open list when the control is disabled', async () => {
    configure();
    const fixture = await mount(FieldHost);
    await open(fixture);

    fixture.componentInstance.control.disable();
    await settle(fixture);

    expect(popup(fixture).hidden).toBe(true);
    expect(rows(fixture)).toEqual([]);
  });

  it('keeps an open list open, with its query, when the field gets a new widget', async () => {
    configure();
    const fixture = await mount(FieldHost);
    await open(fixture);
    await query(fixture, 'united');
    const before = fixture.componentInstance.picker().picker();

    fixture.componentInstance.options.set({ mode: 'national', defaultRegion: 'GB' });
    await settle(fixture);

    expect(fixture.componentInstance.picker().picker()).not.toBe(before);
    expect(popup(fixture).hidden).toBe(false);
    expect(search(fixture).value).toBe('united');
    expect(rows(fixture).length).toBeGreaterThan(1);
    expect(rows(fixture).length).toBeLessThan(10);
    expect(document.activeElement).toBe(search(fixture));
  });

  it('turns inert with a disabled control', async () => {
    configure();
    const fixture = await mount(FieldHost);

    fixture.componentInstance.control.disable();
    await settle(fixture);

    expect(trigger(fixture).disabled).toBe(true);
    expect(part(fixture, 'telixon-region-picker').hasAttribute('data-disabled')).toBe(true);
  });
});

describe('TelixonRegionPicker: the rows', () => {
  it('puts the priority regions first and keeps an open list through an equal array', async () => {
    configure();
    const fixture = await mount(FieldHost);
    fixture.componentInstance.prioritize.set(['GB', 'US']);
    await settle(fixture);
    await open(fixture);
    expect(
      rows(fixture)
        .slice(0, 2)
        .map((element) => element.dataset['region']),
    ).toEqual(['GB', 'US']);

    fixture.componentInstance.prioritize.set(['GB', 'US']);
    await settle(fixture);
    expect(popup(fixture).hidden).toBe(false);
  });

  it('renames the regions of an open list when the locale changes', async () => {
    configure();
    const fixture = await mount(FieldHost);
    await open(fixture);
    const before = fixture.componentInstance.picker().picker();
    expect(row(fixture, 'DE').textContent).toContain('Germany');

    fixture.componentInstance.locale.set('de');
    await settle(fixture);

    expect(fixture.componentInstance.picker().picker()).toBe(before);
    expect(popup(fixture).hidden).toBe(false);
    expect(row(fixture, 'DE').textContent).toContain('Deutschland');
  });

  it('keeps an open list open through new priority regions', async () => {
    configure();
    const fixture = await mount(FieldHost);
    await open(fixture);

    fixture.componentInstance.prioritize.set(['UA', 'PL']);
    await settle(fixture);

    expect(popup(fixture).hidden).toBe(false);
    expect(
      rows(fixture)
        .slice(0, 2)
        .map((element) => element.dataset['region']),
    ).toEqual(['UA', 'PL']);
  });

  it('names the regions in the given locale', async () => {
    configure();
    const fixture = TestBed.createComponent(FieldHost);
    fixture.componentInstance.locale.set('de');
    await settle(fixture);
    await open(fixture);

    expect(row(fixture, 'DE').textContent).toContain('Deutschland');
  });

  it('renders the custom trigger and row templates', async () => {
    configure();
    const fixture = TestBed.createComponent(TemplatesHost);
    fixture.detectChanges();
    expect(part(fixture, '#custom-trigger').textContent?.trim()).toBe('US loading');

    await settle(fixture);
    expect(part(fixture, '#custom-trigger').textContent?.trim()).toBe('US United States');

    await open(fixture);
    expect(row(fixture, 'GB').querySelector('.custom-option')?.textContent?.trim()).toBe('GB / United Kingdom');
  });

  it('keeps the ids of two pickers on one page apart', async () => {
    configure();
    const fixture = await mount(TwoFieldsHost);
    const listboxes: HTMLElement[] = Array.from(fixture.nativeElement.querySelectorAll('.tlx-region-picker__listbox'));

    expect(listboxes[0]!.id).not.toBe('');
    expect(listboxes[0]!.id).not.toBe(listboxes[1]!.id);
  });
});

describe('TelixonRegionPicker: lifecycle', () => {
  it('renders the flag of the default region on the server and stays inert', async () => {
    const scope = globalThis as { ngServerMode?: boolean };
    scope.ngServerMode = true;
    try {
      configure();
      const fixture = await mount(FieldHost);

      expect(fixture.componentInstance.picker().picker()).toBe(null);
      expect(triggerFlag(fixture)).toBe(flagTransform('US'));
      expect(trigger(fixture).disabled).toBe(true);
      expect(rows(fixture)).toEqual([]);
    } finally {
      delete scope.ngServerMode;
    }
  });

  it('lets go of the document when it is destroyed', async () => {
    configure();
    const fixture = await mount(FieldHost);
    const picker = fixture.componentInstance.picker();
    await open(fixture);

    fixture.destroy();

    expect(picker.picker()).toBe(null);
    expect(() => document.body.dispatchEvent(new Event('pointerdown', { bubbles: true }))).not.toThrow();
  });
});
