import { Component, input } from '@angular/core';
import { KeyboardAvoidingView } from '../../components/src/keyboard-avoiding-view.ts';
import { Text } from '../../components/src/text.ts';
import { View } from '../../components/src/view.ts';

/**
 * A keyboard-avoiding view styled the way a screen styles one: a bound style that fills the
 * screen and a class that pads it, both naming the properties the adjustment writes.
 */
@Component({
  selector: 'x-keyboard-styled',
  imports: [KeyboardAvoidingView, Text, View],
  template: `
    <keyboard-avoiding-view
      nativeID="avoider"
      class="padded"
      [behavior]="behavior()"
      [style]="own"
      [contentContainerStyle]="content"
    >
      <text>body</text>
    </keyboard-avoiding-view>
  `,
  styles: `
    .padded {
      padding-bottom: 8px;
      border-top-width: 2px;
    }
  `,
})
export class KeyboardStyled {
  readonly behavior = input<'padding' | 'height' | 'position'>('padding');
  protected readonly own = { flex: 1, height: 900, paddingBottom: 12, backgroundColor: 'red' };
  protected readonly content = { flex: 1, bottom: 4 };
}
