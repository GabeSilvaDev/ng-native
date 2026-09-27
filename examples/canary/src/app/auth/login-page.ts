import { Component, inject, signal } from '@angular/core';
import { FormField, email, form, required, submit } from '@angular/forms/signals';
import { Pressable, ScrollView, Text, TextInput } from '@ng-native/components';
import { NativeHeader, NativeNavigation } from '@ng-native/router';
import { Session } from './session.ts';

/** Sign in: an email and a password, then a code on the next screen. */
@Component({
  selector: 'x-login',
  imports: [FormField, NativeHeader, Pressable, ScrollView, Text, TextInput],
  template: `
    <native-header title="Sign in" />
    <scroll-view
      class="screen"
      [contentContainerStyle]="content"
      keyboardShouldPersistTaps="handled"
    >
      @if (session.notice(); as notice) {
        <text class="body" accessibilityRole="alert">{{ notice }}</text>
      }
      <text-input
        class="field"
        accessibilityLabel="Email"
        placeholder="Email"
        [formField]="f.email"
        keyboardType="email-address"
        autoCapitalize="none"
        textContentType="username"
        autoComplete="email"
      />
      <text-input
        class="field"
        accessibilityLabel="Password"
        placeholder="Password"
        [formField]="f.password"
        [secureTextEntry]="true"
        textContentType="password"
        autoComplete="current-password"
        (submitEditing)="signIn()"
      />
      @if (problem(); as problem) {
        <text class="danger" accessibilityRole="alert">{{ problem }}</text>
      }
      <pressable
        class="button"
        accessibilityRole="button"
        [disabled]="f().submitting() || locked()"
        (press)="signIn()"
      >
        <text class="button-label">{{ f().submitting() ? 'Signing in' : 'Sign in' }}</text>
      </pressable>
    </scroll-view>
  `,
})
export class LoginPage {
  protected readonly session = inject(Session);
  private readonly nav = inject(NativeNavigation);
  protected readonly content = { padding: 20, gap: 12 };
  protected readonly data = signal({ email: '', password: '' });
  protected readonly f = form(this.data, (path) => {
    required(path.email, { message: 'Enter your email' });
    email(path.email, { message: 'That is not an email address' });
    required(path.password, { message: 'Enter your password' });
  });
  protected readonly problem = signal<string | null>(null);
  protected readonly locked = signal(false);

  protected async signIn(): Promise<void> {
    this.problem.set(null);
    await submit(this.f, async () => {
      const { email, password } = this.data();
      const answer = await this.session.checkPassword(email, password);
      if (answer === 'ok') {
        this.session.notice.set(null);
        void this.nav.push('/auth/code');
      } else if (answer === 'locked') {
        this.locked.set(true);
        this.problem.set('Too many attempts. Try again later.');
      } else {
        this.problem.set('That password is not right.');
      }
      return undefined;
    });
    if (this.f().invalid()) this.problem.set('Enter an email address and a password.');
  }
}
