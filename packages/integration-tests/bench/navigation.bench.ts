/**
 * A push and a pop through the real `@angular/router`, into a stack outlet, with a screen of
 * fifty rows. Timed from the call to the commit that shows the screen.
 *
 *     node --no-opt --no-sparkplug --no-maglev --import ./bench/release.mjs \
 *       --import @ng-native/testing/register bench/navigation.bench.ts
 */
import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { mount } from '@ng-native/platform';
import { createFakeFabric } from '@ng-native/testing';
import { NativeStackOutlet } from '../../router/src/native-stack-outlet.ts';
import { provideNativeRouter } from '../../router/src/provide-native-router.ts';
import { Text } from '../../components/src/text.ts';
import { View } from '../../components/src/view.ts';

@Component({
  selector: 'x-home',
  imports: [Text, View],
  template: `<view><text>Home</text></view>`,
})
class Home {}

@Component({
  selector: 'x-detail',
  imports: [Text, View],
  template: `
    <view>
      @for (row of rows; track row) {
        <view
          ><text>detail row {{ row }}</text></view
        >
      }
    </view>
  `,
})
class Detail {
  readonly rows = Array.from({ length: Number(process.env['ROWS'] ?? 50) }, (_, i) => i);
}

@Component({
  selector: 'x-shell',
  imports: [NativeStackOutlet],
  template: `<native-stack-outlet />`,
})
class Shell {
  readonly router = inject(Router);
}

const median = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)]!;

setTimeout(async () => {
  const fabric = createFakeFabric();
  const app = mount(1, Shell, fabric, {
    providers: [
      provideNativeRouter([
        { path: '', component: Home },
        { path: 'detail/:id', component: Detail },
      ]),
    ],
  });
  const router = (app.componentRef.instance as Shell).router;
  await router.navigateByUrl('/');
  app.applicationRef.tick();
  const pushes: number[] = [];
  const pops: number[] = [];
  for (let i = 0; i < 40; i++) {
    let started = performance.now();
    await router.navigateByUrl(`/detail/${i}`);
    app.applicationRef.tick();
    const push = performance.now() - started;
    started = performance.now();
    await router.navigateByUrl('/');
    app.applicationRef.tick();
    const pop = performance.now() - started;
    if (i >= 5) {
      pushes.push(push);
      pops.push(pop);
    }
  }
  console.log(`push   median ${median(pushes).toFixed(2)}ms`);
  console.log(`back   median ${median(pops).toFixed(2)}ms`);
  process.exit(0);
});
