import { Component } from '@angular/core';
import { Text } from '../../components/src/text.ts';
import { View } from '../../components/src/view.ts';

@Component({
  selector: 'x-token-kid',
  template: `<view nativeID="inner"><text nativeID="inner-text">kid</text></view>`,
  styles: `
    view {
      padding-top: var(--pad);
      background-color: var(--bg);
    }
    text {
      color: var(--ink, rgb(3, 3, 3));
      font-weight: var(--weight);
      font-size: 20px;
      letter-spacing: var(--ls);
    }
  `,
})
export class TokenKid {}

@Component({
  selector: 'x-token-host',
  imports: [TokenKid, Text, View],
  template: `
    <view nativeID="plain"><x-token-kid /></view>
    <view nativeID="themed" class="themed"><x-token-kid /></view>
  `,
  styles: `
    .themed {
      --pad: 4px;
      --bg: rgb(2, 2, 2);
    }
  `,
})
export class TokenHost {}
