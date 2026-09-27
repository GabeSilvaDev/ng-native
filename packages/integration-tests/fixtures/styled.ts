import { Component, signal } from '@angular/core';
import { Text } from '../../components/src/text.ts';
import { View } from '../../components/src/view.ts';

@Component({
  imports: [Text, View],
  selector: 'x-styled',
  styles: [
    `
      view {
        flex: 1;
      }
      .card {
        background-color: red;
        padding: 12px 8px;
        /* Inherited by any text inside that does not set its own. */
        color: rgb(1, 2, 3);
        font-size: 11px;
      }
      .card .label {
        color: blue;
        font-size: 20px;
      }
      #main .card {
        border-radius: 6px;
      }
      .card.raised {
        background-color: green;
      }
      .locked {
        background-color: black !important;
      }
    `,
  ],
  template: `
    <view nativeID="main">
      <view class="card" [class.raised]="raised()">
        <text class="label">styled</text>
        <text nativeID="inheriting">no rule of its own</text>
      </view>
    </view>
  `,
})
export class Styled {
  raised = signal(false);
}
