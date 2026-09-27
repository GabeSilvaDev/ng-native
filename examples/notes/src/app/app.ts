import { Component } from '@angular/core';
import { SafeAreaProvider } from '@ng-native/components';
import { nativePlatform } from '@ng-native/fabric';
import { NativeStackOutlet } from '@ng-native/router';

/** The shell: a native stack, with the tab bar as its first screen. */
@Component({
  selector: 'app-root',
  imports: [NativeStackOutlet, SafeAreaProvider],
  template: `
    <safe-area-provider>
      <native-stack-outlet />
    </safe-area-provider>
  `,
  // The class the Tailwind preset's ios: and android: variants match against.
  host: { '[class]': 'platformClass', '[style]': 'fill' },
})
export class App {
  protected readonly platformClass = `platform-${nativePlatform()}`;
  protected readonly fill = { flex: 1 };
}
