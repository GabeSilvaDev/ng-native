import { Component, signal } from '@angular/core';
import { Text } from '../../components/src/text.ts';
import { View } from '../../components/src/view.ts';

@Component({
  selector: 'x-text-direction',
  imports: [Text, View],
  template: `
    <view class="rtl">
      <text testID="plain">latin</text>
      <text testID="arabic">نص عربي قصير</text>
      <text testID="start" class="start">start</text>
      <text testID="end" class="end">end</text>
      <text testID="left" class="left">left</text>
      <text testID="centre" class="centre">centre</text>
      <text testID="written" [style]="written">written</text>
      <view class="ltr"><text testID="back">back to ltr</text></view>
    </view>
    <view [style]="inline()"><text testID="inline">inline</text></view>
    <text testID="none">no direction</text>
    <text testID="none-end" class="end">no direction, end</text>
  `,
  styles: `
    .rtl {
      direction: rtl;
    }
    .ltr {
      direction: ltr;
    }
    .start {
      text-align: start;
    }
    .end {
      text-align: end;
    }
    .left {
      text-align: left;
    }
    .centre {
      text-align: center;
    }
  `,
})
export class TextDirection {
  readonly written = { writingDirection: 'ltr' };
  readonly inline = signal<Record<string, string>>({ direction: 'rtl' });
}
