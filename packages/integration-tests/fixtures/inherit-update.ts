import { Component, signal } from '@angular/core';
import { Text } from '../../components/src/text.ts';
import { View } from '../../components/src/view.ts';

/**
 * The child text carries no class of its own and never changes. Only the wrapper's class toggles,
 * so the text's colour can only move if inherited style is re-resolved for a node that is not
 * itself dirty.
 */
@Component({
  imports: [Text, View],
  selector: 'x-inherit-update',
  template: `
    <view class="wrap" [class.dark]="dark()">
      <text>inherits</text>
      <view><text class="deep">matched by a descendant selector</text></view>
    </view>
  `,
  styles: `
    .wrap {
      color: rgb(255, 0, 0);
    }
    .wrap.dark {
      color: rgb(0, 0, 255);
    }
    /* Nothing inheritable changes here, only what a descendant matches. */
    .wrap.dark .deep {
      letter-spacing: 7px;
    }
  `,
})
export class InheritUpdate {
  readonly dark = signal(false);
}
