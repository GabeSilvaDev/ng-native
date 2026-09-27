import { Component, signal } from '@angular/core';
import { Text } from '../../components/src/text.ts';
import { View } from '../../components/src/view.ts';
import { TabSafeAreaView } from '../../router/src/tab-safe-area-view.ts';

@Component({
  selector: 'x-tab-safe-area',
  imports: [TabSafeAreaView, Text, View],
  template: `
    <tab-safe-area-view nativeID="all"><text>everything</text></tab-safe-area-view>
    <!-- The panel pattern: the background on the parent, the inset inside it. -->
    <view nativeID="panel">
      <tab-safe-area-view nativeID="some" class="content" [edges]="edges()">
        <text>above the tab bar</text>
      </tab-safe-area-view>
    </view>
  `,
  styles: `
    .content {
      padding-bottom: 16px;
    }
  `,
})
export class TabSafeAreaHost {
  readonly edges = signal<readonly ('top' | 'bottom')[]>(['bottom']);
}
