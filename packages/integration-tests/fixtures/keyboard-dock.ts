import { Component, viewChild } from '@angular/core';
import { KeyboardDock, KeyboardLift } from '../../components/src/keyboard-dock.ts';

export { provideKeyboardController } from '../../components/src/keyboard-dock.ts';
import { Text } from '../../components/src/text.ts';
import { TextInput } from '../../components/src/text-input.ts';
import { View } from '../../components/src/view.ts';

/** A thread's composer, docked on the keyboard, and the transcript above keeping clear of it. */
@Component({
  selector: 'x-docked-composer',
  imports: [KeyboardDock, Text, TextInput, View],
  template: `
    <view nativeID="screen" [style]="{ flex: 1 }">
      <view nativeID="transcript" [style]="{ flex: 1, paddingBottom: dock.covered() }">
        <text>transcript</text>
      </view>
      <keyboard-dock #dock nativeID="dock">
        <text-input nativeID="composer" />
      </keyboard-dock>
    </view>
  `,
})
export class DockedComposer {
  readonly dock = viewChild.required(KeyboardDock);
}

/** The same, with the transcript rising with the bar, and a field that names itself. */
@Component({
  selector: 'x-lifted-composer',
  imports: [KeyboardDock, KeyboardLift, Text, TextInput, View],
  template: `
    <view nativeID="screen" [style]="{ flex: 1 }">
      <view [style]="{ flex: 1, overflow: 'hidden' }">
        <view nativeID="transcript" [keyboardLift]="dock" [style]="{ flex: 1 }">
          <text>transcript</text>
        </view>
      </view>
      <keyboard-dock #dock nativeID="dock">
        <text-input />
      </keyboard-dock>
    </view>
  `,
})
export class LiftedComposer {
  readonly dock = viewChild.required(KeyboardDock);
}
