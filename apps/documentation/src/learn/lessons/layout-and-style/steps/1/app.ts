import { Component } from '@angular/core';
import { Text, View } from '@ng-native/components';

@Component({
  selector: 'app-root',
  imports: [Text, View],
  template: `
    <view class="screen">
      <text class="title">Today</text>
      <text>3 left to do</text>
    </view>
  `,
  styles: `
    .screen {
      flex: 1;
      padding: 16px 20px;
      padding-top: calc(var(--safe-area-inset-top, 0px) + 16px);
    }

    .title {
      font-size: 30px;
      font-weight: 700;
    }
  `,
})
export class App {}
