import { provideZonelessChangeDetection } from '@angular/core';
import { createCustomElement } from '@angular/elements';
import { createApplication } from '@angular/platform-browser';
import { provideTelixon } from '@telixon/angular';
import { Contact } from './contact';

// The demo is a custom element, which lets the docs place it inline.
const application = await createApplication({
  providers: [provideZonelessChangeDetection(), provideTelixon({ preloadEngine: true })],
});
customElements.define('telixon-material-demo', createCustomElement(Contact, { injector: application.injector }));
