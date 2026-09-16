import { isPlatformBrowser } from '@angular/common';
import {
  afterNextRender,
  type EnvironmentProviders,
  ErrorHandler,
  inject,
  makeEnvironmentProviders,
  PLATFORM_ID,
  provideEnvironmentInitializer,
} from '@angular/core';
import { ensureEngineReady } from '@telixon/core';

/**
 * Options for {@link provideTelixon}.
 *
 * - `preloadEngine`: start loading the engine right after the application's first render, in the
 *   browser only. `false` by default. The first widget that needs the engine then loads it.
 */
export type TelixonOptions = {
  preloadEngine?: boolean;
};

/**
 * Add Telixon's providers to an Angular application.
 *
 * With `preloadEngine: true` the engine starts loading right after the first render. A phone field
 * on the first screen finds it ready. The load never holds up that render, while a failed load
 * reports to `ErrorHandler`. Without it the engine loads when the first widget calls
 * `ensureEngineReady` itself.
 *
 * ```ts
 * export const appConfig: ApplicationConfig = {
 *   providers: [provideTelixon({ preloadEngine: true })],
 * };
 * ```
 */
export function provideTelixon(options: TelixonOptions = {}): EnvironmentProviders {
  return makeEnvironmentProviders([
    provideEnvironmentInitializer((): void => {
      if (options.preloadEngine !== true || !isPlatformBrowser(inject(PLATFORM_ID))) return;
      const errorHandler: ErrorHandler = inject(ErrorHandler);

      // The engine loads after the first render.
      afterNextRender((): void => {
        ensureEngineReady().catch((error: unknown): void => errorHandler.handleError(error));
      });
    }),
  ]);
}
