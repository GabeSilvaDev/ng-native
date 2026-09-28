import { Component, input, signal, viewChild } from '@angular/core';
import { Text } from '../../components/src/text.ts';
import { View } from '../../components/src/view.ts';
import { NativeStackOutlet } from '../../router/src/native-stack-outlet.ts';
import { NativeTab } from '../../router/src/native-tab.ts';
import { NativeTabsOutlet } from '../../router/src/native-tabs-outlet.ts';

@Component({
  selector: 'x-tab-library',
  imports: [Text, View],
  template: `<view><text>library</text></view>`,
})
export class TabLibrary {
  marker = 'library';
}

@Component({
  selector: 'x-tab-search',
  imports: [Text, View],
  template: `<view><text>search</text></view>`,
})
export class TabSearch {
  marker = 'search';
}

/** A tab page that throws while it is built. */
@Component({
  selector: 'x-tab-broken',
  imports: [Text],
  template: `<text>broken</text>`,
})
export class TabBroken {
  constructor() {
    throw new Error('the broken tab threw while it was built');
  }
}

/** A tab page with an input, for the binding `withComponentInputBinding()` turns on. */
@Component({
  selector: 'x-tab-titled',
  imports: [Text],
  template: `<text>{{ title() }}</text>`,
})
export class TabTitled {
  readonly title = input('untitled');
}

/** A tab that is itself a stack, which is the composition every real tab bar is built on. */
@Component({
  selector: 'x-tab-stacked',
  imports: [NativeStackOutlet],
  template: `<native-stack-outlet />`,
})
export class TabStacked {
  readonly outlet = viewChild.required(NativeStackOutlet);
}

@Component({
  selector: 'x-tabs-host',
  imports: [NativeTab, NativeTabsOutlet],
  template: `
    <native-tabs-outlet>
      <native-tab
        path="library"
        title="Library"
        sfSymbol="books.vertical.fill"
        [badge]="unread()"
      />
      <native-tab
        path="search"
        title="Search"
        [icon]="{ template: 42 }"
        [selectedIcon]="{ template: 43 }"
        [standardAppearance]="appearance"
      />
    </native-tabs-outlet>
  `,
})
export class TabsHost {
  readonly outlet = viewChild.required(NativeTabsOutlet);
  /** A badge that changes, which is the thing route data could not express. */
  readonly unread = signal('3');

  /** Colours nested inside a prop native parses itself, which nothing processes for us. */
  readonly appearance = {
    stacked: { selected: { tabBarItemTitleFontColor: 'red', tabBarItemTitleFontWeight: 600 } },
    tabBarBackgroundColor: 'blue',
  };
}
