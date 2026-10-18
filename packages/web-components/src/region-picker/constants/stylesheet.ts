/* The picker's own rules live in its shadow root. The page styles the parts through ::part() and the custom properties. */
export const REGION_PICKER_STYLESHEET = `
:host {
  position: relative;
  display: inline-flex;
  vertical-align: middle;
}

.tlx-region-picker__trigger {
  display: inline-flex;
  align-items: center;
  gap: 0.375em;
  padding: 0.5em 0.625em;
  border: 1px solid var(--tlx-picker-border, color-mix(in srgb, currentColor 30%, transparent));
  border-radius: var(--tlx-picker-radius, 0.375em);
  background: none;
  color: inherit;
  font: inherit;
  cursor: pointer;
}

.tlx-region-picker__trigger:disabled {
  cursor: default;
}

:host([data-disabled]) .tlx-region-picker__trigger {
  opacity: 0.55;
}

.tlx-region-picker__chevron {
  width: 0.4em;
  height: 0.4em;
  margin-block-start: -0.2em;
  border-inline-end: 1.5px solid currentColor;
  border-block-end: 1.5px solid currentColor;
  opacity: 0.6;
  transform: rotate(45deg);
}

.tlx-region-picker__popup {
  position: fixed;
  inset: auto;
  box-sizing: border-box;
  width: var(--tlx-picker-popup-width, 20em);
  max-width: 90vw;
  margin: 0;
  padding: 0;
  overflow: hidden;
  border: 1px solid var(--tlx-picker-border, color-mix(in srgb, currentColor 30%, transparent));
  border-radius: var(--tlx-picker-radius, 0.375em);
  background: var(--tlx-picker-surface, Canvas);
  color: var(--tlx-picker-text, CanvasText);
  box-shadow: 0 4px 16px rgb(0 0 0 / 12%);
}

@supports not selector(:popover-open) {
  .tlx-region-picker__popup {
    position: absolute;
    inset-block-start: calc(100% + var(--tlx-picker-popup-offset-y, 4px));
    inset-inline-start: var(--tlx-picker-popup-offset-x, 0px);
    z-index: 1000;
  }

  .tlx-region-picker__popup[data-side='top'] {
    inset-block: auto calc(100% + var(--tlx-picker-popup-offset-y, 4px));
  }

  .tlx-region-picker__popup[data-align='end'] {
    inset-inline: auto calc(-1 * var(--tlx-picker-popup-offset-x, 0px));
  }
}

.tlx-region-picker__popup[hidden] {
  display: none;
}

.tlx-region-picker__search {
  box-sizing: border-box;
  width: 100%;
  padding: 0.625em 0.75em;
  border: 0;
  background: none;
  color: inherit;
  font: inherit;
  outline-offset: -2px;
}

.tlx-region-picker__listbox {
  max-height: var(--tlx-picker-list-height, 16em);
  margin: 0;
  padding: 0.25em;
  border-block-start: 1px solid var(--tlx-picker-border, color-mix(in srgb, currentColor 30%, transparent));
  overflow-y: auto;
  overscroll-behavior: contain;
  list-style: none;
}

.tlx-region-picker__option {
  display: flex;
  align-items: center;
  gap: 0.625em;
  padding: 0.4375em 0.5em;
  border-radius: var(--tlx-picker-radius, 0.375em);
  cursor: pointer;
}

.tlx-region-picker__option[data-active] {
  background: var(--tlx-picker-active, color-mix(in srgb, currentColor 10%, transparent));
}

@media (forced-colors: active) {
  .tlx-region-picker__option[data-active] {
    outline: 2px solid transparent;
    outline-offset: -2px;
  }
}

.tlx-region-picker__option[aria-selected='true']::after {
  content: '';
  flex-shrink: 0;
  width: 0.35em;
  height: 0.7em;
  margin-block-start: -0.25em;
  border-inline-end: 1.5px solid currentColor;
  border-block-end: 1.5px solid currentColor;
  transform: rotate(45deg);
}

.tlx-region-picker__option-name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tlx-region-picker__option-calling-code,
.tlx-region-picker__empty {
  opacity: 0.65;
}

.tlx-region-picker__empty {
  padding: 0.75em;
}
`;
