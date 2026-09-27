import { Component, inject, signal } from '@angular/core';
import { Pressable, SafeAreaView, ScrollView, Text, TextInput } from '@ng-native/components';
import { Keyboard } from '@ng-native/device';
import { Unread } from './unread.ts';
import { page } from '../screen-styles.ts';

/**
 * A tab with no stack of its own, and something to type in: switching away and back should find
 * the text still there, because the tab was detached rather than destroyed.
 */
@Component({
  selector: 'x-tab-search',
  imports: [SafeAreaView, ScrollView, Text, TextInput],
  template: `
    <!-- No header above a tab screen, so nothing insets it on Android, which draws edge to edge. -->
    <safe-area-view class="screen" [edges]="['top']">
      <scroll-view class="screen" [contentContainerStyle]="page.content">
        <text class="heading">Search</text>
        <text-input
          class="field"
          placeholder="Type something, then switch tabs"
          placeholderTextColor="#6c6c78"
        />
        <text class="hint">
          The keyboard is {{ keyboard.visible() ? keyboard.height() + 'pt tall' : 'down' }}. This
          tab has no stack: it is one screen behind a bar item.
        </text>
      </scroll-view>
    </safe-area-view>
  `,
})
export class TabSearch {
  protected readonly keyboard = inject(Keyboard);
  protected readonly page = page;
}

/** A tab that counts, which is the cheapest possible proof that its state survived a switch. */
@Component({
  selector: 'x-tab-profile',
  imports: [Pressable, SafeAreaView, ScrollView, Text],
  template: `
    <!-- No header above a tab screen, so nothing insets it on Android, which draws edge to edge. -->
    <safe-area-view class="screen" [edges]="['top']">
      <scroll-view class="screen" [contentContainerStyle]="page.content">
        <text class="heading">Profile</text>
        <text class="body">Tapped {{ taps() }} times.</text>
        <pressable class="button" (press)="tap()">
          <text class="button-label">Tap me, then switch tabs</text>
        </pressable>
        <pressable class="card" (press)="unread.clear()">
          <text class="button-label">Clear the badge</text>
        </pressable>
        <text class="hint">
          The badge on this tab is bound to a signal this page changes, which is why the tabs are
          declared in a template rather than in the route config.
        </text>
      </scroll-view>
    </safe-area-view>
  `,
})
export class TabProfile {
  protected readonly unread = inject(Unread);
  protected readonly page = page;
  protected readonly taps = signal(0);

  protected tap(): void {
    this.taps.update((value) => value + 1);
    this.unread.add();
  }
}
