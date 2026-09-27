import { Component, inject, input } from '@angular/core';
import { Pressable, ScrollView, Text } from '@ng-native/components';
import { NativeHeader, NativeNavigation } from '@ng-native/router';
import { Session } from './session.ts';

/** The signed-in app, and its settings in a sheet, from either of which the session can end. */
@Component({
  selector: 'x-account',
  imports: [NativeHeader, Pressable, ScrollView, Text],
  template: `
    <native-header [title]="settings() ? 'Settings' : 'Account'" />
    <scroll-view class="screen" [contentContainerStyle]="content">
      <text class="body">Signed in as {{ session.user()?.email }}</text>
      @if (!settings()) {
        <pressable class="button" accessibilityRole="button" (press)="openSettings()">
          <text class="button-label">Settings</text>
        </pressable>
        <pressable class="card" accessibilityRole="button" (press)="nav.push('/account/orders')">
          <text class="button-label">Orders</text>
        </pressable>
      } @else {
        <pressable class="card" accessibilityRole="button" (press)="session.expire()">
          <text class="button-label">Let the session expire</text>
        </pressable>
      }
      <pressable class="card" accessibilityRole="button" (press)="session.signOut()">
        <text class="danger">Sign out</text>
      </pressable>
    </scroll-view>
  `,
})
export class AccountPage {
  protected readonly session = inject(Session);
  protected readonly nav = inject(NativeNavigation);
  protected readonly content = { padding: 20, gap: 12 };
  /** From the route's data: the settings, in a sheet over the account. */
  readonly settings = input(false);

  protected openSettings(): void {
    void this.nav.present('/account/settings', { as: 'formSheet' });
  }
}
