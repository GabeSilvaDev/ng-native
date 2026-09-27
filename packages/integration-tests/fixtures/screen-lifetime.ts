import { Component, DestroyRef, ElementRef, inject, signal } from '@angular/core';
import type { Routes } from '@angular/router';
import { ScrollView } from '../../components/src/scroll-view.ts';
import { Text } from '../../components/src/text.ts';
import { View } from '../../components/src/view.ts';
import { NativeHeader } from '../../router/src/native-header.ts';
import { NativeStackOutlet } from '../../router/src/native-stack-outlet.ts';

/** Every page host created so far, for the test to walk before the page is destroyed. */
export const hosts: object[] = [];
export const live = signal(0);

@Component({
  selector: 'x-shell',
  imports: [NativeStackOutlet],
  template: `<native-stack-outlet />`,
})
export class Shell {}

@Component({ selector: 'x-home', imports: [Text], template: `<text>home</text>` })
export class Home {}

/** The shape that leaked: a header written in the page, and a few hundred nodes under it. */
@Component({
  selector: 'x-headed',
  imports: [NativeHeader, ScrollView, Text, View],
  template: `
    <native-header [title]="'Rows ' + ticks()" />
    <scroll-view>
      @for (row of rows; track row) {
        <view>
          <text>{{ row }}</text>
        </view>
      }
    </scroll-view>
  `,
})
export class Headed {
  protected readonly rows = Array.from({ length: 50 }, (_, i) => i);
  protected readonly ticks = signal(0);

  constructor() {
    hosts.push(inject(ElementRef).nativeElement as object);
    live.update((n) => n + 1);
    inject(DestroyRef).onDestroy(() => live.update((n) => n - 1));
  }
}

/** A page with no header, which is what a presented screen usually is. */
@Component({
  selector: 'x-bare',
  imports: [Text, View],
  template: `
    @for (row of rows; track row) {
      <view>
        <text>{{ row }}</text>
      </view>
    }
  `,
})
export class Bare {
  protected readonly rows = Array.from({ length: 50 }, (_, i) => i);

  constructor() {
    hosts.push(inject(ElementRef).nativeElement as object);
    live.update((n) => n + 1);
    inject(DestroyRef).onDestroy(() => live.update((n) => n - 1));
  }
}

export const routes: Routes = [
  { path: '', component: Home },
  { path: 'headed', component: Headed },
  { path: 'headed/:id', component: Headed },
  { path: 'bare/:id', component: Bare },
  { path: 'modal', component: Bare },
];
