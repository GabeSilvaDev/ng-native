import { Component, signal } from '@angular/core';
import { Pressable } from '../../components/src/pressable.ts';
import { Text } from '../../components/src/text.ts';
import { View } from '../../components/src/view.ts';

// Lowercase element names are load-bearing, not style: the compiler silently empties a template
// that contains a capitalized one.
@Component({
  imports: [Pressable, Text, View],
  selector: 'app-root',
  template: `
    <view [style]="boxStyle">
      @if (count() > 0) {
        <text>count is {{ count() }}</text>
      }
      @for (item of items(); track item) {
        <text>item {{ item }}</text>
      }
      <pressable (touchEnd)="inc()"><text>tap</text></pressable>
    </view>
  `,
})
export class Counter {
  count = signal(0);
  items = signal<number[]>([]);
  boxStyle = { padding: 8, backgroundColor: '#ff0000' };

  inc(): void {
    this.count.update((c) => c + 1);
    this.items.update((a) => [...a, a.length]);
  }
}
