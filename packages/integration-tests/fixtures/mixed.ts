import { Component } from '@angular/core';
import { View } from '../../components/src/view.ts';

@Component({
  selector: 'x-mix-kid',
  template: `
    <view nativeID="mixed"></view>
    <view nativeID="fallback-mixed"></view>
  `,
  styles: `
    #mixed {
      background-color: color-mix(in oklab, var(--brand) 90%, transparent);
    }
    #fallback-mixed {
      background-color: color-mix(in oklab, var(--missing, rgb(1, 2, 3)) 50%, transparent);
    }
  `,
})
export class MixKid {}

@Component({
  selector: 'x-mix-themed',
  template: `<view nativeID="themed-mixed"></view>`,
  styles: `
    #themed-mixed {
      background-color: color-mix(in oklab, var(--brand) 90%, transparent);
    }
  `,
})
export class MixThemed {}

@Component({
  selector: 'x-mix-host',
  imports: [MixKid, MixThemed, View],
  template: `
    <view><x-mix-kid /></view>
    <view class="themed"><x-mix-themed /></view>
  `,
  styles: `
    .themed {
      --brand: rgb(40, 50, 60);
    }
  `,
})
export class MixHost {}
