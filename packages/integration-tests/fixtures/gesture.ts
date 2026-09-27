import { Component, signal } from '@angular/core';
import { NativeGestureBase } from '../../components/src/native-gesture.ts';
import { View } from '../../components/src/view.ts';

@Component({
  selector: 'x-draggable',
  imports: [NativeGestureBase, View],
  template: `<view [style]="base" [gesture]="pan()"><view /></view>`,
})
export class Draggable {
  readonly base = { flex: 1, backgroundColor: 'red' };
  readonly pan = signal<object>({ name: 'pan' });
}
