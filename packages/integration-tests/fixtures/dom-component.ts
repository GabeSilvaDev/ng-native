import { Component, signal } from '@angular/core';
import { DomComponent } from '@ng-native/expo/dom-component';

@Component({
  selector: 'dom-component-fixture',
  imports: [DomComponent],
  template: `
    <dom-component
      [src]="note"
      class="flex-1"
      [inputs]="{ label: label() }"
      [outputs]="outputs()"
    />
  `,
})
export class DomComponentFixture {
  /** What `import note from './web/note.ts'` gives native code; see dom-component-metro.test.ts. */
  readonly note = { domComponent: 'note.ts?file=file:///app/web/note.ts' };
  readonly label = signal('Draft');
  readonly sent: unknown[] = [];
  readonly outputs = signal<Record<string, (value: never) => void>>({
    sent: (value: unknown) => this.sent.push(value),
  });
}
