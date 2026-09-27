import { Component } from '@angular/core';
import { Text, View } from '@ng-native/components';

@Component({
  selector: 'app-root',
  imports: [Text, View],
  template: `
    <view class="screen">
      <text>Hello</text>
    </view>
  `,
  styles: `
    .screen {
      flex: 1;
      padding: 16px 20px;
      padding-top: calc(var(--safe-area-inset-top, 0px) + 16px);
    }
  `,
})
export class App {}
