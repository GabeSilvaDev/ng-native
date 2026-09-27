import { Component, signal } from '@angular/core';
import { Text } from '../../components/src/text.ts';
import { View } from '../../components/src/view.ts';

interface Item {
  id: number;
  label: string;
}

@Component({
  imports: [Text, View],
  selector: 'x-list',
  template: `
    <view>
      <view tag="static"><text>never changes</text></view>
      <view tag="dynamic" [style]="dynamicStyle()">
        @for (item of items(); track item.id) {
          <text>{{ item.label }}</text>
        }
      </view>
    </view>
  `,
})
export class List {
  items = signal<Item[]>([
    { id: 1, label: 'a' },
    { id: 2, label: 'b' },
    { id: 3, label: 'c' },
  ]);
  dynamicStyle = signal<Record<string, unknown>>({ padding: 4 });

  setItems(items: Item[]): void {
    this.items.set(items);
  }

  setStyle(style: Record<string, unknown>): void {
    this.dynamicStyle.set(style);
  }
}
