import { Component, input } from '@angular/core';
import { KeyboardAvoidingView } from '../../components/src/keyboard-avoiding-view.ts';
import { ScrollView } from '../../components/src/scroll-view.ts';
import { Text } from '../../components/src/text.ts';
import { View } from '../../components/src/view.ts';

/**
 * An editor's layout: a body that should shrink and a fixed bar that should sit on the keyboard,
 * both inside the view that avoids it.
 */
@Component({
  selector: 'x-keyboard-editor',
  imports: [KeyboardAvoidingView, ScrollView, Text, View],
  template: `
    <keyboard-avoiding-view nativeID="avoider" [behavior]="behavior()">
      <scroll-view [style]="fill"><text>body</text></scroll-view>
      <view [style]="bar"><text>12 words</text></view>
    </keyboard-avoiding-view>
  `,
})
export class KeyboardEditor {
  readonly behavior = input<'padding' | 'height'>('padding');
  protected readonly fill = { flex: 1 };
  protected readonly bar = { height: 44 };
}
