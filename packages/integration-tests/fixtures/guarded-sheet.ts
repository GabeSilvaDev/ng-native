import { Component, signal } from '@angular/core';
import type { Routes } from '@angular/router';
import { Text } from '../../components/src/text.ts';
import { NativeStackOutlet } from '../../router/src/native-stack-outlet.ts';

@Component({
  selector: 'x-guard-shell',
  imports: [NativeStackOutlet],
  template: `<native-stack-outlet />`,
})
export class GuardShell {}

@Component({ selector: 'x-guard-home', imports: [Text], template: `<text>home</text>` })
export class GuardHome {}

/**
 * An editor presented as a sheet, which refuses a swipe down while it holds unsaved changes and
 * hears the attempt, to ask whether to discard them.
 */
@Component({
  selector: 'x-editor-sheet',
  imports: [Text],
  template: `<text>editor</text>`,
  host: {
    '[preventNativeDismiss]': 'dirty()',
    '(nativeDismissCancelled)': 'attempts.set(attempts() + 1)',
  },
})
export class EditorSheet {
  readonly dirty = signal(false);
  readonly attempts = signal(0);
  constructor() {
    editors.push(this);
  }
}

/** Every editor made, newest last, for a test to reach the page on the screen. */
export const editors: EditorSheet[] = [];

export const guardRoutes: Routes = [
  { path: '', component: GuardHome },
  { path: 'editor', component: EditorSheet },
];
