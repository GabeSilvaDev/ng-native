import { Component } from '@angular/core';
import type { Routes } from '@angular/router';
import { KeyboardDock } from '../../components/src/keyboard-dock.ts';
import { Text } from '../../components/src/text.ts';
import { TextInput } from '../../components/src/text-input.ts';
import { NativeStackOutlet } from '../../router/src/native-stack-outlet.ts';

@Component({
  selector: 'x-docked-shell',
  imports: [NativeStackOutlet],
  template: `<native-stack-outlet />`,
})
export class DockedShell {}

/** A thread: a transcript and its composer, docked on the keyboard. */
@Component({
  selector: 'x-thread',
  imports: [KeyboardDock, Text, TextInput],
  template: `
    <text>thread</text>
    <keyboard-dock><text-input nativeID="composer" /></keyboard-dock>
  `,
})
export class Thread {}

/** Whatever the thread opens: a profile pushed, or a sheet presented. */
@Component({ selector: 'x-profile', imports: [Text], template: `<text>profile</text>` })
export class Profile {}

export const dockedRoutes: Routes = [
  { path: '', component: Thread },
  { path: 'profile', component: Profile },
];
