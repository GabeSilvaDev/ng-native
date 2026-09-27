import { Component } from '@angular/core';
import { Text } from '../../components/src/text.ts';
import { View } from '../../components/src/view.ts';

/**
 * The child deliberately declares a `.wrap` rule of its own, but renders no `.wrap` element. It
 * exists to prove the child's sheet is never matched against the *parent's* `.wrap` node.
 */
@Component({
  selector: 'x-cc-child',
  template: `<text class="label">child</text><text class="own">own</text>`,
  styles: `
    .wrap {
      color: rgb(0, 0, 255);
    }
    .own {
      color: rgb(0, 255, 0);
    }
  `,
})
export class CrossChild {}

@Component({
  selector: 'x-cc-parent',
  imports: [CrossChild, Text, View],
  template: `<view class="wrap"><x-cc-child /></view>`,
  styles: `
    .wrap {
      color: rgb(255, 0, 0);
      font-size: 21px;
    }
  `,
})
export class CrossParent {}
