import { Component, signal } from '@angular/core';
import { View } from '../../components/src/view.ts';

/** Custom properties set from bindings and a static style, and rules that read them. */
@Component({
  imports: [View],
  selector: 'style-custom-property',
  template: `
    <view
      nativeID="bound"
      class="tinted"
      [style.--tint]="tint()"
      [style.--brandGap]="gap()"
      [style.--columns]="3"
    >
      <view nativeID="inside" class="inside"></view>
    </view>
    <view nativeID="static" class="tinted" style="--tint: rgb(0, 128, 0)"></view>
    <view nativeID="unset" class="tinted"></view>
  `,
  styles: `
    .tinted {
      background-color: var(--tint, rgb(0, 0, 0));
      padding-top: var(--brandGap, 1px);
    }
    .inside {
      border-color: var(--tint);
      opacity: var(--columns);
    }
  `,
})
export class StyleCustomProperty {
  readonly tint = signal('rgb(0, 0, 255)');
  readonly gap = signal('4px');
}
