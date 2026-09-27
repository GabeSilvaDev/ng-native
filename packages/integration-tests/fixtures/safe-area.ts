import { Component, signal } from '@angular/core';
import { SafeAreaProvider } from '../../components/src/safe-area-provider.ts';
import { SafeAreaView } from '../../components/src/safe-area-view.ts';
import { View } from '../../components/src/view.ts';
import { Text } from '../../components/src/text.ts';

@Component({
  selector: 'x-safe-area',
  imports: [SafeAreaProvider, SafeAreaView, Text, View],
  template: `
    <safe-area-provider nativeID="provider">
      <safe-area-view nativeID="all"><text>everything</text></safe-area-view>
      <safe-area-view nativeID="some" [edges]="edges()" mode="margin">
        <text>bottom only</text>
      </safe-area-view>
      <safe-area-view nativeID="record" [edges]="{ top: 'maximum' }">
        <text>as much as it already had</text>
      </safe-area-view>
      <!-- A floating button, positioned from the stylesheet rather than from a signal. -->
      <view nativeID="floating"></view>
      <!-- What a presented screen needs: a provider of its own that does not redefine the app's. -->
      <safe-area-provider nativeID="nested" [reportInsets]="false">
        <text>a modal</text>
      </safe-area-provider>
    </safe-area-provider>
  `,
  styles: `
    #floating {
      margin-bottom: var(--safe-area-inset-bottom, 0px);
      padding-top: var(--safe-area-inset-top, 0px);
    }
  `,
})
export class SafeAreaHost {
  readonly edges = signal<readonly ('top' | 'bottom')[]>(['bottom']);
}
