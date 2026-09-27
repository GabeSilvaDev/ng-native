import { InjectionToken, type Signal, signal } from '@angular/core';

const ALWAYS = signal(true).asReadonly();

/**
 * Whether the screen something is on is the one in front: false while another screen is pushed
 * over it or presented from it, or while its tab is not the selected one. A navigation outlet
 * provides it for each screen it shows; outside one it is always true.
 *
 * For what native keeps showing whatever covers a screen: a bar docked on the keyboard belongs to
 * the keyboard's window, above every screen the app has, and has to step down itself.
 */
export const SCREEN_IN_FRONT = new InjectionToken<Signal<boolean>>('angular-native.screenInFront', {
  factory: () => ALWAYS,
});
