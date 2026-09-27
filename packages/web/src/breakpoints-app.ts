/**
 * A row that stacks on a phone and shares the line on a tablet: `flex-col md:flex-row`, for
 * `browser/breakpoints.test.ts`. See `button-app.ts` for why it lives here.
 */
import { Component } from '@angular/core';
import { Text, View } from '@ng-native/components';

@Component({
  selector: 'app-root',
  imports: [Text, View],
  template: `
    <view id="layout">
      <view class="flex flex-col md:flex-row">
        <text>First</text>
        <text>Second</text>
      </view>
    </view>
  `,
})
export class BreakpointsApp {}
