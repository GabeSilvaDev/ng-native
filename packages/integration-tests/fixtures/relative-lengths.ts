import { Component } from '@angular/core';
import { Text } from '../../components/src/text.ts';
import { View } from '../../components/src/view.ts';

@Component({
  imports: [Text, View],
  selector: 'x-relative-lengths',
  template: `
    <view nativeID="box">
      <text nativeID="label">label</text>
      <text nativeID="big">big</text>
    </view>
  `,
  styles: `
    #box {
      width: 50vw;
      height: 10vh;
      font-size: 20px;
      padding-top: 2em;
    }
    #label {
      margin-top: 0.5em;
    }
    #big {
      font-size: 1.5em;
    }
  `,
})
export class RelativeLengths {}
