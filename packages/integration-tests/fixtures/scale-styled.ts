import { Component, signal } from '@angular/core';
import { Pressable } from '../../components/src/pressable.ts';
import { Text } from '../../components/src/text.ts';
import { View } from '../../components/src/view.ts';

interface Row {
  id: number;
  label: string;
}

/**
 * The scale fixture's twin, identical except that it carries a stylesheet, so the two can be
 * measured against each other to price the CSS path.
 *
 * The sheet is deliberately the shape a real component library produces rather than a minimal
 * one: several rules that match, many more that do not, and a descendant selector, since a rule
 * that fails still costs a comparison and that is most of what a matcher does.
 */
@Component({
  imports: [Pressable, Text, View],
  selector: 'x-scale-styled',
  template: `
    <view class="list">
      <view class="static" tag="static"><text>never changes</text></view>
      @for (row of rows(); track row.id) {
        <pressable class="row" (touchEnd)="hit(row.id)"
          ><text class="label">{{ row.label }}</text></pressable
        >
      }
    </view>
  `,
  styles: `
    .list {
      flex-grow: 1;
      background-color: #101014;
      color: #ffffff;
    }
    .static {
      padding: 8px;
    }
    .row {
      padding: 10px;
      background-color: #1c1c24;
    }
    .list .label {
      font-size: 15px;
      color: #c8c8d0;
    }
    .row .label {
      letter-spacing: 0.2px;
    }
    .a1 {
      opacity: 1;
    }
    .a2 {
      opacity: 1;
    }
    .a3 {
      opacity: 1;
    }
    .a4 {
      opacity: 1;
    }
    .a5 {
      opacity: 1;
    }
    .a6 {
      opacity: 1;
    }
    .a7 {
      opacity: 1;
    }
    .a8 {
      opacity: 1;
    }
    .a9 {
      opacity: 1;
    }
    .a10 {
      opacity: 1;
    }
    .a11 {
      opacity: 1;
    }
    .a12 {
      opacity: 1;
    }
    .a13 {
      opacity: 1;
    }
    .a14 {
      opacity: 1;
    }
    .a15 {
      opacity: 1;
    }
    .a16 {
      opacity: 1;
    }
    .a17 {
      opacity: 1;
    }
    .a18 {
      opacity: 1;
    }
    .a19 {
      opacity: 1;
    }
    .a20 {
      opacity: 1;
    }
  `,
})
export class ScaleStyled {
  rows = signal<Row[]>([]);
  hits = 0;

  setRows(rows: Row[]): void {
    this.rows.set(rows);
  }

  hit(_id: number): void {
    this.hits++;
  }
}
