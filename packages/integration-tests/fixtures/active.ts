import { Component } from '@angular/core';
import { Text } from '../../components/src/text.ts';
import { View } from '../../components/src/view.ts';
import { Pressable } from '../../components/src/pressable.ts';

@Component({
  selector: 'x-active',
  imports: [Pressable, Text, View],
  template: `
    <view nativeID="outer">
      <pressable nativeID="btn" (press)="presses = presses + 1"
        ><text nativeID="inner">tap</text></pressable
      >
    </view>
  `,
  styles: `
    #btn {
      background-color: rgb(1, 1, 1);
    }
    #btn:active {
      background-color: rgb(2, 2, 2);
    }
    /* :active applies up the chain on the web, so an ancestor may style itself too. */
    #outer:active {
      border-top-width: 3px;
    }
  `,
})
export class Active {
  presses = 0;
}
