export const PACKAGE_NAME = '@telixon/angular';
export const FLAGS_STYLESHEET = '@telixon/angular/flags/flags.css';
export const PROVIDER_NAME = 'provideTelixon';
export const PRELOAD_ARGUMENTS = '{ preloadEngine: true }';
export const APPLICATION_PROJECT_TYPE = 'application';

/** The builders whose `styles` option the CLI bundles into the application. */
export const APPLICATION_BUILDERS: ReadonlySet<string> = new Set([
  '@angular/build:application',
  '@angular-devkit/build-angular:application',
  '@angular-devkit/build-angular:browser-esbuild',
  '@angular-devkit/build-angular:browser',
]);
