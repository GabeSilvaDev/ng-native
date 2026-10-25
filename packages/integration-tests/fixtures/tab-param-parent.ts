import { Component } from '@angular/core';
import type { Routes } from '@angular/router';
import { Text } from '../../components/src/text.ts';
import { NativeStackOutlet } from '../../router/src/native-stack-outlet.ts';
import { NativeTab } from '../../router/src/native-tab.ts';
import { NativeTabsOutlet } from '../../router/src/native-tabs-outlet.ts';

@Component({
  selector: 'x-shell',
  imports: [NativeStackOutlet],
  template: `<native-stack-outlet />`,
})
export class Shell {}

/** A bar under a parameter: a city, whose name can be written with an accent or a space. */
@Component({
  selector: 'x-city-bar',
  imports: [NativeTab, NativeTabsOutlet],
  template: `
    <native-tabs-outlet>
      <native-tab path="home" title="Home" />
      <native-tab path="library" title="Library" />
    </native-tabs-outlet>
  `,
})
export class CityBar {}

/** A tab's own stack, where a page pushed inside the tab goes. */
@Component({
  selector: 'x-tab-stack',
  imports: [NativeStackOutlet],
  template: `<native-stack-outlet />`,
})
export class TabStack {}

@Component({ selector: 'x-home', imports: [Text], template: `<text>home</text>` })
export class Home {}

@Component({ selector: 'x-library', imports: [Text], template: `<text>library</text>` })
export class Library {}

@Component({ selector: 'x-album', imports: [Text], template: `<text>album</text>` })
export class Album {}

export const routes: Routes = [
  {
    path: 'city/:name',
    component: CityBar,
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'home' },
      { path: 'home', component: Home },
      {
        path: 'library',
        component: TabStack,
        children: [
          { path: '', component: Library },
          { path: ':id', component: Album },
        ],
      },
    ],
  },
];
