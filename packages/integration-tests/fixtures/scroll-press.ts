import { Component, signal } from '@angular/core';
import { Pressable } from '../../components/src/pressable.ts';
import { ScrollView } from '../../components/src/scroll-view.ts';
import { Text } from '../../components/src/text.ts';

/** A tall row in a list, which is the shape where a scroll reads as a tap. */
@Component({
  selector: 'x-scroll-press',
  imports: [Pressable, ScrollView, Text],
  template: `
    <scroll-view nativeID="list">
      <pressable nativeID="row" (press)="taps.set(taps() + 1)">
        <text>A row, 72pt tall</text>
      </pressable>
    </scroll-view>
  `,
})
export class ScrollPress {
  readonly taps = signal(0);
}
