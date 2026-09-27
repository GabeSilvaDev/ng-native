import { Component } from '@angular/core';
import { View } from '../../components/src/view.ts';

/** The style binding forms Angular's compiler emits, which a DOM renderer normalises. */
@Component({
  imports: [View],
  selector: 'style-bindings',
  template: `
    <view
      nativeID="target"
      [style.width.px]="width"
      [style.font-size]="fontSize"
      [style.opacity]="opacity"
      [style.max-width.%]="maxWidth"
    ></view>
  `,
})
export class StyleBindings {
  width = 10;
  fontSize = '12px';
  opacity = 0.5;
  maxWidth = 50;
}
