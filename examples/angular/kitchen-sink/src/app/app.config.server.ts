import { ErrorHandler, mergeApplicationConfig, type ApplicationConfig } from '@angular/core';
import { provideServerRendering, withRoutes } from '@angular/ssr';
import { appConfig } from './app.config';
import { serverRoutes } from './app.routes.server';

// An error during prerendering fails the build instead of landing in a log.
const rethrowingErrorHandler: ErrorHandler = {
  handleError(error: unknown): never {
    throw error;
  },
};

const serverConfig: ApplicationConfig = {
  providers: [
    provideServerRendering(withRoutes(serverRoutes)),
    { provide: ErrorHandler, useValue: rethrowingErrorHandler },
  ],
};

export const config = mergeApplicationConfig(appConfig, serverConfig);
