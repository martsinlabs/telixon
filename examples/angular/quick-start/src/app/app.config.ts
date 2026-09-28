import { provideZonelessChangeDetection, type ApplicationConfig } from '@angular/core';
import { provideTelixon } from '@telixon/angular';

export const appConfig: ApplicationConfig = {
  providers: [provideZonelessChangeDetection(), provideTelixon({ preloadEngine: true })],
};
