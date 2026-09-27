import { ChangeDetectorRef, Component, inject, signal } from '@angular/core';
import { Pressable } from '../../components/src/pressable.ts';
import { Switch } from '../../components/src/switch.ts';
import { Text } from '../../components/src/text.ts';
import { TextInput } from '../../components/src/text-input.ts';

/** Drives its own change detection, and so detaches before Angular first checks it. */
@Component({
  selector: 'x-detached',
  imports: [Pressable, Switch, Text, TextInput],
  template: `
    <pressable testID="go" accessibilityRole="button" accessibilityLabel="Go" (press)="hit()">
      <text>tap</text>
    </pressable>
    <text testID="count">{{ count() }}</text>
    <text numberOfLines="1" testID="line">one line</text>
    <text-input testID="field" />
    <switch testID="toggle" />
  `,
})
export class Detached {
  private readonly cdr = inject(ChangeDetectorRef);
  readonly count = signal(0);
  presses = 0;

  constructor() {
    this.cdr.detach();
  }

  hit(): void {
    this.presses++;
    this.count.set(this.presses);
    this.cdr.detectChanges();
  }
}
