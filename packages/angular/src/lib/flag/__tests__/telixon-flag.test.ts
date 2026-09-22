import { Component, provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { RegionCode } from '@telixon/core';
import { flagTransform } from '@telixon/web-sdk/flags';
import { afterEach, describe, expect, it } from 'vitest';
import { TelixonFlag } from '../telixon-flag';

@Component({
  imports: [TelixonFlag],
  template: `<telixon-flag [region]="region()" />`,
})
class FlagHost {
  readonly region = signal<RegionCode | null>('US');
}

afterEach(() => {
  TestBed.resetTestingModule();
});

describe('TelixonFlag', () => {
  it('renders the sprite cell of its region and follows a new one', async () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    const fixture = TestBed.createComponent(FlagHost);
    await fixture.whenStable();
    const flag: HTMLElement = fixture.nativeElement.querySelector('telixon-flag');
    const image: HTMLElement = fixture.nativeElement.querySelector('.tlx-flag__image');

    expect(flag.classList.contains('tlx-flag')).toBe(true);
    expect(flag.getAttribute('aria-hidden')).toBe('true');
    expect(image.style.transform).toBe(flagTransform('US'));

    fixture.componentInstance.region.set('GB');
    await fixture.whenStable();
    expect(image.style.transform).toBe(flagTransform('GB'));
  });

  it('shows the neutral flag for null', async () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    const fixture = TestBed.createComponent(FlagHost);
    fixture.componentInstance.region.set(null);
    await fixture.whenStable();

    const image: HTMLElement = fixture.nativeElement.querySelector('.tlx-flag__image');
    expect(image.style.transform).toBe(flagTransform(null));
  });
});
