import { Component } from '@angular/core';
import { Text } from '../../components/src/text.ts';
import { View } from '../../components/src/view.ts';

@Component({
  imports: [Text, View],
  selector: 'x-shadowed',
  template: `<view class="card"><text>shadowed</text></view>`,
  styles: `
    .card {
      box-shadow: 0 1px 2px rgb(1, 2, 3);
      background-color: rgb(4, 5, 6);
    }
  `,
})
export class Shadowed {}
