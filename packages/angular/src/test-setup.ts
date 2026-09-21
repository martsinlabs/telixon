import { setupTestBed } from '@analogjs/vitest-angular/setup-testbed';
import '@angular/compiler';

setupTestBed({ zoneless: true, errorOnUnknownElements: true, errorOnUnknownProperties: true });
