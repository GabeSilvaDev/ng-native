import { Component } from '@angular/core';
import { Pressable } from '../../components/src/pressable.ts';
import { ScrollView } from '../../components/src/scroll-view.ts';
import { Text } from '../../components/src/text.ts';
import { View } from '../../components/src/view.ts';

@Component({
  selector: 'x-defer-triggers',
  imports: [Pressable, ScrollView, Text, View],
  template: `
    <scroll-view testID="scroller">
      <pressable #trigger testID="trigger"><text>open</text></pressable>
      @defer (on interaction(trigger)) {
        <text>interaction loaded</text>
      } @placeholder {
        <text>interaction waiting</text>
      }

      @defer (on hover) {
        <text>hover loaded</text>
      } @placeholder {
        <view testID="hover-target"><text>hover waiting</text></view>
      }

      @defer (on viewport) {
        <text>viewport loaded</text>
      } @placeholder {
        <view testID="spot" nativeID="spot"><text>viewport waiting</text></view>
      }
    </scroll-view>
  `,
})
export class DeferTriggers {}

@Component({
  selector: 'x-defer-focus',
  imports: [Text, View],
  template: `
    @defer (on interaction) {
      <text>focus loaded</text>
    } @placeholder {
      <view testID="focus-target" focusable="true"><text>focus waiting</text></view>
    }
  `,
})
export class DeferFocus {}
