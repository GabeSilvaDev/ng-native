/**
 * Fixture for `browser/limits.test.ts`: the base of a worklet directive, on a view, as a web build
 * would meet it. See `button-app.ts`'s doc comment for why a real `@Component` has to live in its
 * own file rather than inside a test.
 */
import { Component } from '@angular/core';
import { View } from '@ng-native/components';
import { WorkletStyleBase } from '../../components/src/worklet-style.ts';

@Component({
  selector: 'app-root',
  imports: [View, WorkletStyleBase],
  template: '<view [workletStyle]="spec"></view>',
})
export class WorkletApp {
  protected readonly spec = { style: () => ({}) };
}
