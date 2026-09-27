import { Component } from '@angular/core';
import { Pressable } from '../../components/src/pressable.ts';
import { Text } from '../../components/src/text.ts';
import { View } from '../../components/src/view.ts';

/**
 * Compiled twice by `web-parity.test.ts`: once as Metro compiles for a device, where these styles
 * become the native rule set, and once as it compiles for the web, where they stay CSS. Only CSS
 * both engines accept belongs in here, and longhands where jsdom would need to expand a shorthand
 * itself: it keeps `border-radius` and `gap` as written and reports every longhand empty. Chromium
 * expands both, and `packages/web/browser` lays a real `gap` out.
 */
@Component({
  selector: 'x-web-parity',
  imports: [Pressable, Text, View],
  template: `
    <pressable testID="press" class="press"><text>Press</text></pressable>

    <view class="copy"><text testID="inherited">Inherited</text></view>

    <view testID="row" class="row" [style]="rowStyle">
      <view class="cell"></view>
      <view class="cell"></view>
    </view>

    <view testID="moved" [style]="moved"></view>
  `,
  styles: `
    .press {
      background-color: rgb(10, 20, 30);
      border-top-left-radius: 6px;
    }
    .press:active {
      background-color: rgb(40, 50, 60);
      opacity: 0.5;
    }
    .copy {
      color: rgb(200, 0, 0);
      font-size: 18px;
      font-weight: 700;
      font-style: italic;
      letter-spacing: 1px;
    }
    .row {
      flex-direction: row;
      justify-content: space-between;
      align-items: center;
      row-gap: 8px;
      column-gap: 12px;
      padding: 4px 6px;
    }
    .cell {
      width: 20px;
      height: 20px;
    }
  `,
})
export class WebParity {
  protected readonly rowStyle = { paddingTop: 12, flexGrow: 1 };
  protected readonly moved = {
    width: 40,
    transform: [{ translateX: 10 }, { rotate: '45deg' }, { scale: 2 }],
  };
}
