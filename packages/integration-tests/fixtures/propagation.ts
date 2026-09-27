import { Component } from '@angular/core';
import { Pressable } from '../../components/src/pressable.ts';
import { Text } from '../../components/src/text.ts';
import { View } from '../../components/src/view.ts';
import type { TouchEvent } from '../../components/src/events.ts';

/**
 * A pressable row with a delete button inside it, which is the shape that asks for a press to
 * stay where it landed. The touch listeners are plain element events, which bubble whether or
 * not a responder owns the gesture, so they are where stopping a bubble actually matters.
 */
@Component({
  selector: 'x-propagation',
  imports: [Pressable, Text, View],
  template: `
    <view nativeID="list" (touchEnd)="log.push('list:touchEnd')">
      <pressable nativeID="row" (press)="log.push('row:press')" (touchEnd)="rowTouchEnd()">
        <text>Row</text>
        <pressable
          nativeID="delete"
          (press)="log.push('delete:press')"
          (touchEnd)="deleteTouchEnd($event)"
        >
          <text>Delete</text>
        </pressable>
      </pressable>
    </view>
  `,
})
export class Propagation {
  readonly log: string[] = [];
  stop = false;

  protected rowTouchEnd(): void {
    this.log.push('row:touchEnd');
  }

  protected deleteTouchEnd(event: TouchEvent): void {
    this.log.push('delete:touchEnd');
    if (this.stop) event.stopPropagation();
  }
}
