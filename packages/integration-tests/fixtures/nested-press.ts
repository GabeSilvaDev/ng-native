import { Component } from '@angular/core';
import { Text } from '../../components/src/text.ts';
import { View } from '../../components/src/view.ts';
import { Pressable } from '../../components/src/pressable.ts';

@Component({
  selector: 'x-nested',
  imports: [Pressable, Text, View],
  template: `
    <pressable (press)="log.push('outer')">
      <view>
        <pressable (press)="log.push('inner')">
          <text>inner</text>
        </pressable>
      </view>
    </pressable>
  `,
})
export class Nested {
  log: string[] = [];
}
