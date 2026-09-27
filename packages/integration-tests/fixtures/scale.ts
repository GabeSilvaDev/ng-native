import { Component, signal } from '@angular/core';
import { Pressable } from '../../components/src/pressable.ts';
import { Text } from '../../components/src/text.ts';
import { View } from '../../components/src/view.ts';

interface Row {
  id: number;
  label: string;
}

/** Each row carries a listener, so removal exercises destroyNode as well as the commit. */
@Component({
  imports: [Pressable, Text, View],
  selector: 'x-scale',
  template: `
    <view>
      <view tag="static"><text>never changes</text></view>
      @for (row of rows(); track row.id) {
        <pressable (touchEnd)="hit(row.id)"
          ><text>{{ row.label }}</text></pressable
        >
      }
    </view>
  `,
})
export class Scale {
  rows = signal<Row[]>([]);
  hits = 0;

  setRows(rows: Row[]): void {
    this.rows.set(rows);
  }

  hit(_id: number): void {
    this.hits++;
  }
}
