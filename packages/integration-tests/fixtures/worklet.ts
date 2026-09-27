import { Component, signal } from '@angular/core';
import { View } from '../../components/src/view.ts';
import { WorkletStyleBase } from '../../components/src/worklet-style.ts';
import { workletStyle, type WorkletStyleSpec } from '../../components/src/worklets.ts';

@Component({
  selector: 'x-sliding',
  imports: [WorkletStyleBase, View],
  template: `<view [style]="base" [workletStyle]="style()"><view /></view>`,
})
export class Sliding {
  readonly base = { flex: 1, backgroundColor: 'red' };
  readonly offset = { value: 0 };
  readonly style = signal<WorkletStyleSpec>(
    workletStyle([this.offset], (offset) => ({
      transform: [{ translateX: offset.value }],
    })),
  );
}
