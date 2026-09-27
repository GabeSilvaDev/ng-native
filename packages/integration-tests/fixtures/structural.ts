import { Component, signal } from '@angular/core';
import { View } from '../../components/src/view.ts';

@Component({
  selector: 'x-structural',
  imports: [View],
  template: `
    <view nativeID="list">
      @for (n of rows(); track n) {
        <view class="row" [nativeID]="'row' + n"></view>
      }
    </view>
  `,
  styles: `
    .row:first-child {
      border-top-width: 2px;
    }
    .row:last-child {
      border-bottom-width: 4px;
    }
    .row:nth-child(odd) {
      background-color: #eee;
    }
    .row + .row {
      margin-top: 8px;
    }
  `,
})
export class StructuralHost {
  readonly count = signal(3);
  readonly rows = () => Array.from({ length: this.count() }, (_, i) => i);
}
