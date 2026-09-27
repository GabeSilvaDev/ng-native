import { Component, signal } from '@angular/core';
import { Text } from '../../components/src/text.ts';
import { View } from '../../components/src/view.ts';

@Component({
  imports: [Text, View],
  selector: 'x-global-styled',
  template: `
    <view class="box" nativeID="box"><text class="label">labelled</text></view>
    <view class="plain" nativeID="plain"><text nativeID="plain-text">plain</text></view>
  `,
  styles: `
    .box {
      padding: 2px;
    }
    .box .label {
      color: rgb(1, 1, 1);
    }
  `,
})
export class GlobalStyled {}

/** Repeated siblings with no styles of their own, so a global sheet is the only thing acting. */
@Component({
  imports: [View],
  selector: 'x-global-rows',
  template: `
    <view nativeID="list">
      @for (n of rows(); track n) {
        <view class="row" [nativeID]="'row' + n"></view>
      }
    </view>
  `,
})
export class GlobalRows {
  readonly count = signal(3);
  readonly rows = () => Array.from({ length: this.count() }, (_, i) => i);
}
