import { Component, signal } from '@angular/core';
import { Text } from '../../components/src/text.ts';
import { View } from '../../components/src/view.ts';
import { KeyboardAvoidingView } from '../../components/src/keyboard-avoiding-view.ts';
import { VirtualList } from '../../components/src/virtual-list.ts';

interface Row {
  kind: 'header' | 'item';
  label: string;
}

/** A section list is a flattened row list with two row heights. No separate component needed. */
@Component({
  selector: 'x-sections',
  imports: [VirtualList, KeyboardAvoidingView, Text, View],
  template: `
    <keyboard-avoiding-view [keyboardVerticalOffset]="20">
      <virtual-list #list [items]="rows()" [itemHeight]="heightOf" [overscan]="1" [style]="fill">
        @for (row of list.window(); track row.index) {
          <view [style]="row.style"
            ><text>{{ row.item.label }}</text></view
          >
        }
      </virtual-list>
    </keyboard-avoiding-view>
  `,
})
export class Sections {
  rows = signal<Row[]>(
    Array.from({ length: 30 }, (_, section) => [
      { kind: 'header' as const, label: `section ${section}` },
      ...Array.from({ length: 9 }, (_, i) => ({
        kind: 'item' as const,
        label: `item ${section}.${i}`,
      })),
    ]).flat(),
  );

  fill = { flex: 1 };
  heightOf = (row: Row): number => (row.kind === 'header' ? 60 : 30);
}
