import { Component } from '@angular/core';
import type { Routes } from '@angular/router';
import { Text } from '../../components/src/text.ts';
import { NativeHeader } from '../../router/src/native-header.ts';
import { NativeStackOutlet } from '../../router/src/native-stack-outlet.ts';
import { NativeTab } from '../../router/src/native-tab.ts';
import { NativeTabsOutlet } from '../../router/src/native-tabs-outlet.ts';

@Component({
  selector: 'x-shell',
  imports: [NativeStackOutlet],
  template: `<native-stack-outlet />`,
})
export class Shell {}

/** A header that binds nothing, so the app's defaults are all that decide how it looks. */
@Component({
  selector: 'x-plain',
  imports: [NativeHeader, Text],
  template: `
    <native-header title="Plain" nativeID="plain-bar" />
    <text>plain</text>
  `,
})
export class Plain {}

/** A header that says what it wants, which the defaults must not touch. */
@Component({
  selector: 'x-own',
  imports: [NativeHeader, Text],
  template: `
    <native-header
      title="Own"
      nativeID="own-bar"
      backgroundColor="#ff0000"
      blurEffect="regular"
      userInterfaceStyle="light"
      [hideShadow]="false"
    />
    <text>own</text>
  `,
})
export class Own {}

/** A tab bar with one tab that binds nothing and one that brings its own appearance. */
@Component({
  selector: 'x-bar',
  imports: [NativeTab, NativeTabsOutlet],
  template: `
    <native-tabs-outlet nativeID="tabs">
      <native-tab path="first" title="First" nativeID="first-tab" />
      <native-tab
        path="second"
        title="Second"
        nativeID="second-tab"
        [standardAppearance]="{ tabBarBackgroundColor: '#00ff00' }"
      />
    </native-tabs-outlet>
  `,
})
export class Bar {}

@Component({ selector: 'x-first', imports: [Text], template: `<text>first</text>` })
export class First {}

@Component({ selector: 'x-second', imports: [Text], template: `<text>second</text>` })
export class Second {}

/** The same bar, with the outlet naming its own tint and scheme. */
@Component({
  selector: 'x-own-bar',
  imports: [NativeTab, NativeTabsOutlet],
  template: `
    <native-tabs-outlet nativeID="own-tabs" tintColor="#ff00ff" colorScheme="light">
      <native-tab path="first" title="First" />
    </native-tabs-outlet>
  `,
})
export class OwnBar {}

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'plain' },
  { path: 'plain', component: Plain },
  { path: 'own', component: Own },
  {
    path: 'tabs',
    component: Bar,
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'first' },
      { path: 'first', component: First },
      { path: 'second', component: Second },
    ],
  },
  {
    path: 'own-tabs',
    component: OwnBar,
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'first' },
      { path: 'first', component: First },
    ],
  },
];
