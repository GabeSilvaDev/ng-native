import { Component } from '@angular/core';
import { ScrollView } from '../../components/src/scroll-view.ts';
import { View } from '../../components/src/view.ts';
import { WorkletScrollBase } from '../../components/src/worklet-scroll.ts';
import { workletScroll, type WorkletScrollSpec } from '../../components/src/worklets.ts';

@Component({
  selector: 'x-scrolling',
  imports: [ScrollView, View, WorkletScrollBase],
  template: `<scroll-view [workletScroll]="onScroll"><view /></scroll-view>`,
})
export class Scrolling {
  readonly offset = { value: 0 };
  readonly onScroll: WorkletScrollSpec = workletScroll([this.offset], (event, into) => {
    into.value = event.contentOffset.y;
  });
}
