import { Component, input, signal } from '@angular/core';
import { View } from '../../components/src/view.ts';

/** What the child saw, in order, so the test can read it without reaching for the instance. */
export const calls: number[] = [];

@Component({ selector: 'x-probe-child', template: '' })
export class ProbeChild {
  readonly value = input<number>(0);
  ngOnChanges(): void {
    calls.push(this.value());
  }
}

@Component({
  selector: 'x-probe-host',
  imports: [ProbeChild, View],
  template: `<view><x-probe-child [value]="n()" /></view>`,
})
export class ProbeHost {
  readonly n = signal(1);
}
