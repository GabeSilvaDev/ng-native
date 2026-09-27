import { Component, inject, signal } from '@angular/core';
import { Pressable, ScrollView, Text, TextInput } from '@ng-native/components';
import { NativeHeader } from '@ng-native/router';
import { Session } from './session.ts';

/** The second step: a six-digit code, as from an authenticator app. */
@Component({
  selector: 'x-code',
  imports: [NativeHeader, Pressable, ScrollView, Text, TextInput],
  template: `
    <native-header title="Enter the code" />
    <scroll-view
      class="screen"
      [contentContainerStyle]="content"
      keyboardShouldPersistTaps="handled"
    >
      <text-input
        class="field"
        accessibilityLabel="Code"
        placeholder="6-digit code"
        [(value)]="code"
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="one-time-code"
        [maxLength]="6"
      />
      @if (wrong()) {
        <text class="danger" accessibilityRole="alert">That code is not right.</text>
      }
      <pressable
        class="button"
        accessibilityRole="button"
        [disabled]="checking()"
        (press)="check()"
      >
        <text class="button-label">Continue</text>
      </pressable>
    </scroll-view>
  `,
})
export class CodePage {
  private readonly session = inject(Session);
  protected readonly content = { padding: 20, gap: 12 };
  protected readonly code = signal('');
  protected readonly wrong = signal(false);
  protected readonly checking = signal(false);

  protected async check(): Promise<void> {
    if (this.checking()) return;
    this.checking.set(true);
    try {
      this.wrong.set(!(await this.session.checkCode(this.code())));
    } finally {
      this.checking.set(false);
    }
  }
}
