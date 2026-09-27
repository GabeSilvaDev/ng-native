import { Component, signal, viewChild } from '@angular/core';
import { TemplateSlot } from '../../components/src/template-slot.ts';
import { Text } from '../../components/src/text.ts';
import { View } from '../../components/src/view.ts';

/** Projects its content into a container it can mount again, as a dock or a portal does. */
@Component({
  selector: 'x-remounting',
  imports: [TemplateSlot, View],
  template: `
    <ng-template #content><ng-content /></ng-template>
    @for (mount of mounts(); track mount) {
      <view nativeID="container"
        ><ng-container [templateSlot]="content" [templateSlotContext]="none"
      /></view>
    }
  `,
})
export class Remounting {
  readonly mounts = signal([0]);
  readonly none = {};
}

@Component({
  selector: 'x-reparent',
  imports: [Remounting, Text],
  template: `<x-remounting><text nativeID="moved">projected</text></x-remounting>`,
})
export class Reparent {
  readonly holder = viewChild.required(Remounting);
}
