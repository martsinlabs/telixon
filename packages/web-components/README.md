# @telixon/web-components

Phone fields as custom elements, built on [`@telixon/web-sdk`](https://www.npmjs.com/package/@telixon/web-sdk). The element wraps your own `<input>`. The user sees a formatted number while the form submits it in E.164. A region picker adds the flag and a searchable list of regions.

[![conformance](https://img.shields.io/endpoint?url=https://proof.telixon.dev/parity-badge.json)](https://proof.telixon.dev/parity.html)
[![benchmarks](https://img.shields.io/endpoint?url=https://proof.telixon.dev/bench-badge.json)](https://proof.telixon.dev/benchmark.html)

`<telixon-phone-field>`, `<telixon-region-picker>`, and `<telixon-flag>` are standard custom elements. They run in every current browser and inside the markup of any framework. The input stays in the page, where your styles, labels, and autofill apply to it. The picker keeps its trigger and list in a shadow root, styled through `::part()`, which a server-rendered page hydrates without a mismatch.

**[Documentation](https://telixon.dev/web-components/)**

## Install

```bash
npm install @telixon/web-components
```

```css
/* styles.css */
@import '@telixon/web-components/flags/flags.css';
```

Nothing registers at import time. One call defines the three elements:

```js
import { defineTelixonElements } from '@telixon/web-components';

defineTelixonElements();
```

A page without a bundler does the same from a module script, with the package, `@telixon/core`, `@telixon/web-sdk`, and `@telixon/web-sdk/flags` behind an import map or a CDN that resolves them.

## Quick start

A phone field with a region picker inside a form:

```html
<form>
  <telixon-phone-field name="phone" default-region="US" calling-code-in-input="false" required>
    <telixon-region-picker></telixon-region-picker>
    <input type="tel" autocomplete="tel" />
  </telixon-phone-field>

  <button>Save</button>
</form>
```

The form submits `phone` as the number in E.164 while it is valid. An invalid number blocks submission with a message anchored at the input. An empty `required` field does the same. The inner input carries no `name` of its own, since the element submits the value. The elements run once the engine has loaded. Until then the input stays a plain input.

```js
const field = document.querySelector('telixon-phone-field');
field.addEventListener('telixon-change', (event) => console.log(event.detail.value)); // "+14155550132"
field.value = '+14155550132';
```

## Elements

`<telixon-phone-field>` runs the phone widget on the input inside it and hands the form its value. `<telixon-region-picker>` adds the flag and a searchable list of regions to the field around it. `<telixon-flag region="US">` shows the flag of a region. The [documentation](https://telixon.dev/web-components/) lists every attribute, property, event, state, part, and custom property.

## TypeScript

The main entry types the three tags for `document.createElement` and `querySelector`, and the `telixon-change` and `telixon-state` events for `addEventListener` on the element and on any ancestor they bubble to. `@telixon/web-components/react` types the tags for JSX in React 19, with a `ref` typed as the element class. `@telixon/web-components/vue` types them for Vue templates.

## Server rendering

The server renders the tags and their attributes. Under the `node` export condition the package resolves to an entry a server bundle imports without a DOM, where the element classes are stubs. On the client the elements upgrade and attach to the input, while the picker builds its markup inside a shadow root, which hydration leaves alone. React 19 sets properties such as `options` and adds listeners such as `ontelixon-change` on a client render only. A page it hydrates passes the options as attributes and adds listeners from an effect on a ref.

## Support

Questions belong in [Discussions](https://github.com/martsinlabs/telixon/discussions). Bugs and
feature requests belong in [Issues](https://github.com/martsinlabs/telixon/issues). Report a
vulnerability as [SECURITY.md](https://github.com/martsinlabs/telixon/blob/main/SECURITY.md) describes.

## Contributing

Setup, workflow, and the engineering standards are in
[CONTRIBUTING.md](https://github.com/martsinlabs/telixon/blob/main/CONTRIBUTING.md).

## License

[Apache-2.0](./LICENSE) © Martsin Labs
