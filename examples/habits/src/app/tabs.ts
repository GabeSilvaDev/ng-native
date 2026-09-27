import { Component } from '@angular/core';
import { NativeHeader, NativeTab, NativeTabsOutlet } from '@ng-native/router';

/** A real tab bar: UITabBarController on iOS, a bottom navigation bar on Android. */
@Component({
  selector: 'app-tabs',
  imports: [NativeHeader, NativeTab, NativeTabsOutlet],
  template: `
    <native-header [hidden]="true" />
    <native-tabs-outlet>
      <native-tab path="today" title="Today" sfSymbol="checkmark.circle.fill" />
      <native-tab path="settings" title="Settings" sfSymbol="gearshape.fill" />
    </native-tabs-outlet>
  `,
})
export class Tabs {}
