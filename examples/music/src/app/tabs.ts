import { Component } from '@angular/core';
import { nativePlatform } from '@ng-native/fabric';
import { NativeHeader, NativeTab, NativeTabsOutlet, type TabIcon } from '@ng-native/router';

/**
 * SF Symbols on iOS. Android has no symbol set, so it gets an image, drawn as a mask so the bar
 * tints it like a symbol.
 */
const icon = (symbol: string, image: unknown): TabIcon =>
  nativePlatform() === 'android' ? { template: image } : { sfSymbol: symbol };

/**
 * A real tab bar. The mini player docked above it is placed by each tab rather than here: only
 * inside a tab can it learn how much of the screen the bar covers (see mini-player-bar.ts).
 */
@Component({
  selector: 'app-tabs',
  imports: [NativeHeader, NativeTab, NativeTabsOutlet],
  template: `
    <native-header [hidden]="true" />
    <native-tabs-outlet>
      <native-tab path="library" title="Library" [icon]="library" />
      <native-tab path="settings" title="Settings" [icon]="settings" />
    </native-tabs-outlet>
  `,
})
export class Tabs {
  protected readonly library = icon('music.note.list', require('../../assets/tab-library.png'));
  protected readonly settings = icon('gearshape.fill', require('../../assets/tab-settings.png'));
}
