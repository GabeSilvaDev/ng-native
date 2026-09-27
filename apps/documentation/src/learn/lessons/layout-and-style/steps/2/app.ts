import { Component } from '@angular/core';
import { Text, View } from '@ng-native/components';

@Component({
  selector: 'app-root',
  imports: [Text, View],
  template: `
    <view class="screen">
      <text class="title">Today</text>
      <text>3 left to do</text>
      <view class="habit">
        <text>Drink water</text>
        <text class="status">To do</text>
      </view>
    </view>
  `,
  styles: `
    .screen {
      flex: 1;
      padding: 16px 20px;
      padding-top: calc(var(--safe-area-inset-top, 0px) + 16px);
      background-color: #f4f4f5;
    }

    .title {
      font-size: 30px;
      font-weight: 700;
    }

    .habit {
      flex-direction: row;
      justify-content: space-between;
      padding: 16px;
      border-radius: 12px;
      background-color: #ffffff;
    }

    .status {
      color: #71717a;
    }
  `,
})
export class App {}
