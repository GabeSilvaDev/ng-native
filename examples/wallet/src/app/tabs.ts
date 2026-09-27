import { Component } from '@angular/core';
import { nativePlatform } from '@ng-native/fabric';
import { NativeHeader, NativeTab, NativeTabsOutlet, type TabIcon } from '@ng-native/router';

/**
 * SF Symbols on iOS. Android has no symbol set, so it gets an image, drawn as a mask so the bar
 * tints it like a symbol.
 */
const icon = (symbol: string, image: unknown): TabIcon =>
  nativePlatform() === 'android' ? { template: image } : { sfSymbol: symbol };

/** A real tab bar: UITabBarController on iOS, a bottom navigation bar on Android. */
@Component({
  selector: 'app-tabs',
  imports: [NativeHeader, NativeTab, NativeTabsOutlet],
  template: `
    <native-header [hidden]="true" />
    <native-tabs-outlet>
      <native-tab path="home" title="Home" [icon]="home" />
      <native-tab path="activity" title="Activity" [icon]="activity" />
      <native-tab path="settings" title="Settings" [icon]="settings" />
    </native-tabs-outlet>
  `,
})
export class Tabs {
  protected readonly home = icon('house.fill', require('../../assets/tab-home.png'));
  protected readonly activity = icon(
    'list.bullet.rectangle',
    require('../../assets/tab-activity.png'),
  );
  protected readonly settings = icon('gearshape.fill', require('../../assets/tab-settings.png'));
}
