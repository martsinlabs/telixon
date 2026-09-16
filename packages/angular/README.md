# @telixon/angular

The Angular binding for [`@telixon/web-sdk`](https://www.npmjs.com/package/@telixon/web-sdk). `provideTelixon` adds Telixon's providers to an application and can preload the phone-number engine.

**[Documentation](https://telixon.dev/web-sdk/)**

## Install

```bash
npm install @telixon/angular
```

`@telixon/core` and `@telixon/web-sdk` come with it. The package re-exports both, which puts every widget, function, and type behind one import.

## Quick start

```ts
import { ApplicationConfig } from '@angular/core';
import { provideTelixon } from '@telixon/angular';

export const appConfig: ApplicationConfig = {
  providers: [provideTelixon({ preloadEngine: true })],
};
```

## Versions

The major version follows Angular's. `@telixon/angular` 20 targets Angular 20. Each Angular major gets its own line of the package. The package's own changes bump the minor and patch versions.

## Support

Questions belong in [Discussions](https://github.com/martsinlabs/telixon/discussions). Bugs and
feature requests belong in [Issues](https://github.com/martsinlabs/telixon/issues). Vulnerabilities
follow [SECURITY.md](https://github.com/martsinlabs/telixon/blob/main/SECURITY.md).

## Contributing

Setup, workflow, and the engineering standards are in
[CONTRIBUTING.md](https://github.com/martsinlabs/telixon/blob/main/CONTRIBUTING.md).

## License

[Apache-2.0](./LICENSE) © Martsin Labs
