import { Component, signal } from '@angular/core';
import { Text } from '../../components/src/text.ts';
import { View } from '../../components/src/view.ts';
import { FullWindowOverlay } from '../../router/src/full-window-overlay.ts';

/** A toast above everything the app shows, sheets and modals included. */
@Component({
  selector: 'x-overlaid',
  imports: [FullWindowOverlay, Text, View],
  template: `
    <view nativeID="app"><text>screen</text></view>
    @if (shown()) {
      <full-window-overlay>
        <view nativeID="toast"><text>Saved</text></view>
      </full-window-overlay>
    }
  `,
})
export class Overlaid {
  readonly shown = signal(true);
}
