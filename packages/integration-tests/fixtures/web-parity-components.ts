import { Component, signal } from '@angular/core';
import { ActivityIndicator } from '../../components/src/activity-indicator.ts';
import { Image } from '../../components/src/image.ts';
import { ImageBackground } from '../../components/src/image-background.ts';
import { KeyboardAvoidingView } from '../../components/src/keyboard-avoiding-view.ts';
import { Modal } from '../../components/src/modal.ts';
import { Pressable } from '../../components/src/pressable.ts';
import { RefreshControl } from '../../components/src/refresh-control.ts';
import { SafeAreaProvider } from '../../components/src/safe-area-provider.ts';
import { SafeAreaView } from '../../components/src/safe-area-view.ts';
import { ScrollView } from '../../components/src/scroll-view.ts';
import { SectionList, SectionHeader } from '../../components/src/section-list.ts';
import { Switch } from '../../components/src/switch.ts';
import { Text } from '../../components/src/text.ts';
import { TextInput } from '../../components/src/text-input.ts';
import { TouchableOpacity } from '../../components/src/touchable-opacity.ts';
import { View } from '../../components/src/view.ts';
import { VirtualList } from '../../components/src/virtual-list.ts';

/**
 * Every component in `@ng-native/components`, each in its documented usage and each with a
 * `testID`, for `web-parity.test.ts` to render on a device and in a browser and compare what each
 * says about itself: its role, label, state and value, and the props the web gives a meaning to.
 */
@Component({
  selector: 'x-web-parity-components',
  imports: [
    ActivityIndicator,
    Image,
    ImageBackground,
    KeyboardAvoidingView,
    Modal,
    Pressable,
    RefreshControl,
    SafeAreaProvider,
    SafeAreaView,
    ScrollView,
    SectionHeader,
    SectionList,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    VirtualList,
  ],
  template: `
    <safe-area-provider testID="provider">
      <view testID="view" accessibilityLabel="Card" accessibilityRole="summary">
        <text testID="heading" accessibilityRole="header">Settings</text>
        <text testID="text" [numberOfLines]="2">Body copy</text>
      </view>

      <pressable
        testID="pressable"
        accessibilityRole="button"
        accessibilityLabel="Save"
        accessibilityHint="Saves the draft"
        [accessibilityState]="{ selected: true }"
      >
        <text>Save</text>
      </pressable>
      <pressable testID="disabled" [disabled]="true"><text>Off</text></pressable>
      <pressable
        testID="toggle"
        accessibilityRole="togglebutton"
        [accessibilityState]="{ checked: true }"
      >
        <text>Bold</text>
      </pressable>
      <touchable-opacity testID="opacity" accessibilityLabel="Next"
        ><text>Next</text></touchable-opacity
      >

      <image
        testID="image"
        accessibilityLabel="Avatar"
        [source]="{ uri: 'https://example.com/a.png' }"
        resizeMode="contain"
        [style]="{ width: 40, height: 40 }"
      />
      <image-background
        testID="image-background"
        [source]="{ uri: 'https://example.com/b.png' }"
        [style]="{ width: 80, height: 40 }"
      >
        <text>Over</text>
      </image-background>

      <text-input
        testID="input"
        placeholder="Email"
        [maxLength]="40"
        keyboardType="email-address"
        returnKeyType="next"
        [(value)]="email"
      />
      <text-input testID="locked" [disabled]="true" value="Fixed" />
      <switch testID="switch" [(checked)]="on" accessibilityLabel="Wi-Fi" />
      <switch testID="switch-off" [disabled]="true" />
      <activity-indicator testID="spinner" size="large" accessibilityLabel="Loading" />
      <view
        testID="slider"
        accessibilityRole="adjustable"
        [accessibilityValue]="{ min: 0, max: 10, now: 4 }"
      ></view>
      <view testID="hidden" [accessibilityElementsHidden]="true"></view>
      <view testID="live" accessibilityLiveRegion="polite"></view>

      <scroll-view testID="scroll" [style]="{ height: 80 }">
        <refresh-control [refreshing]="false" />
        <text>Scrolled</text>
      </scroll-view>
      <keyboard-avoiding-view testID="avoiding">
        <text>Composer</text>
      </keyboard-avoiding-view>
      <safe-area-view testID="safe" [edges]="['bottom']"><text>Footer</text></safe-area-view>

      <virtual-list testID="list" #list [items]="rows" [itemHeight]="20" [style]="{ height: 60 }">
        @for (row of list.window(); track row.slot) {
          <view [style]="row.style"
            ><text>{{ row.item }}</text></view
          >
        }
      </virtual-list>
      <section-list
        testID="sections"
        [sections]="sections"
        [itemHeight]="20"
        [style]="{ height: 60 }"
      >
        <ng-template sectionHeader let-section
          ><text>{{ section.title }}</text></ng-template
        >
      </section-list>

      <modal testID="modal" [visible]="true" accessibilityLabel="Dialog"><text>Shown</text></modal>
    </safe-area-provider>
  `,
})
export class WebParityComponents {
  protected readonly email = signal('');
  protected readonly on = signal(true);
  protected readonly rows = ['one', 'two', 'three', 'four'];
  protected readonly sections = [{ title: 'A', data: ['a1', 'a2'] }];
}
