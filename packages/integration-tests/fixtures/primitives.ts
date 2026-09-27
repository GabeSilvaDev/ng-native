import { Component, signal } from '@angular/core';
import { ActivityIndicator } from '../../components/src/activity-indicator.ts';
import { Image } from '../../components/src/image.ts';
import { Modal } from '../../components/src/modal.ts';
import { RefreshControl } from '../../components/src/refresh-control.ts';
import { SafeAreaView } from '../../components/src/safe-area-view.ts';
import { Switch } from '../../components/src/switch.ts';
import { Text } from '../../components/src/text.ts';
import { TextInput } from '../../components/src/text-input.ts';
import { View } from '../../components/src/view.ts';
import { ImageBackground } from '../../components/src/image-background.ts';
import { Pressable } from '../../components/src/pressable.ts';
import { ScrollView } from '../../components/src/scroll-view.ts';
import { TouchableOpacity } from '../../components/src/touchable-opacity.ts';

@Component({
  selector: 'x-primitives',
  imports: [
    Pressable,
    TouchableOpacity,
    ImageBackground,
    ScrollView,
    ActivityIndicator,
    Image,
    Modal,
    RefreshControl,
    SafeAreaView,
    Switch,
    Text,
    TextInput,
    View,
  ],
  template: `
    <safe-area-view>
      <text>plain <text>nested span</text></text>

      <image [source]="source" />
      <activity-indicator [animating]="true" />
      <switch [value]="on()" />
      <text-input [value]="draft()" />

      <scroll-view [contentContainerStyle]="contentStyle">
        <refresh-control [refreshing]="false" />
        <view><text>scrolled</text></view>
      </scroll-view>

      <modal><text>in a modal</text></modal>

      <pressable [disabled]="locked()" (press)="log('press')" (pressIn)="log('pressIn')">
        <text>press me</text>
      </pressable>

      <touchable-opacity [activeOpacity]="0.5" (press)="log('touchable')">
        <text>fade me</text>
      </touchable-opacity>

      <!-- A caller with an opacity of its own, which the component must ease back to. -->
      <touchable-opacity [activeOpacity]="0.5" [style]="{ opacity: 0.8 }">
        <text>dim already</text>
      </touchable-opacity>

      <image-background [source]="source"><text>over the image</text></image-background>
    </safe-area-view>
  `,
})
export class Primitives {
  source = { uri: 'https://example.invalid/x.png' };
  contentStyle = { padding: 16 };
  on = signal(false);
  draft = signal('');
  locked = signal(false);
  events: string[] = [];

  log(name: string): void {
    this.events.push(name);
  }
}
