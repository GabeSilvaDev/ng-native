/**
 * Fixture for `status-bar.test.ts`. See `button-app.ts` for why a `@Component` lives out here.
 */
import { Component, inject } from '@angular/core';
import { StatusBar } from '@ng-native/device';
import { Text } from '@ng-native/components';

@Component({
  selector: 'app-root',
  imports: [Text],
  template: `<text>A light screen</text>`,
})
export class StatusBarApp {
  constructor() {
    inject(StatusBar).set({ style: 'dark' });
  }
}
