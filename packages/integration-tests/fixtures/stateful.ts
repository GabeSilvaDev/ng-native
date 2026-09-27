import { Component } from '@angular/core';
import { Text } from '../../components/src/text.ts';
import { View } from '../../components/src/view.ts';

@Component({
  imports: [Text, View],
  selector: 'x-stateful',
  template: `
    <view nativeID="a" [disabled]="true"><text nativeID="a-label">off</text></view>
    <view nativeID="b"><text nativeID="b-label">on</text></view>
  `,
  styles: `
    view:disabled {
      opacity: 0.4;
    }
    view:focus {
      border-top-width: 2px;
    }
    view:active {
      background-color: rgb(5, 5, 5);
    }
  `,
})
export class Stateful {}
