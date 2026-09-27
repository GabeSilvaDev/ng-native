import { Component, inject } from '@angular/core';
import { Pressable, ScrollView, Text } from '@ng-native/components';
import { NativeHeader, NativeNavigation } from '@ng-native/router';
import { page } from '../screen-styles.ts';

/**
 * The intents a URL cannot express. Every button here is `Router.navigate` underneath, with the
 * presentation riding in `NavigationExtras.state`, so the URL stays correct through all of them
 * and a guard or a deep link would see exactly what it sees anywhere else.
 */
@Component({
  selector: 'x-navigation',
  imports: [NativeHeader, Pressable, ScrollView, Text],
  template: `
    <native-header title="Navigation" />
    <scroll-view class="screen" [contentContainerStyle]="page.content">
      <text class="hint">
        Each of these lands on the same route. What changes is how the screen arrives and what it
        leaves behind.
      </text>

      <pressable class="button" (press)="push()">
        <text class="button-label">push</text>
        <text class="hint-on-accent">stacks on top; back returns here</text>
      </pressable>

      <pressable class="card" (press)="replace()">
        <text class="button-label">replace</text>
        <text class="hint">supersedes this screen; back skips it</text>
      </pressable>

      <pressable class="card" (press)="presentSheet()">
        <text class="button-label">present as a sheet</text>
        <text class="hint">half height, drag to resize or dismiss</text>
      </pressable>

      <pressable class="card" (press)="presentFullScreen()">
        <text class="button-label">present full screen</text>
        <text class="hint">slides up; Close is the only way out</text>
      </pressable>

      <pressable class="card" (press)="home()">
        <text class="button-label">reset to home</text>
        <text class="hint">empties the stack; nothing to go back to</text>
      </pressable>
    </scroll-view>
  `,
})
export class NavigationPage {
  protected readonly page = page;
  private readonly nav = inject(NativeNavigation);

  protected push(): void {
    void this.nav.push('/detail');
  }

  protected replace(): void {
    void this.nav.replace('/detail');
  }

  protected presentSheet(): void {
    void this.nav.present('/sheet', {
      as: 'formSheet',
      presentation: {
        sheetAllowedDetents: [0.5, 1],
        sheetGrabberVisible: true,
        sheetCornerRadius: 20,
      },
    });
  }

  protected presentFullScreen(): void {
    void this.nav.present('/sheet', {
      as: 'fullScreenModal',
      presentation: { stackAnimation: 'slide_from_bottom', gestureEnabled: false },
    });
  }

  protected home(): void {
    void this.nav.reset('/');
  }
}
