import { Component, inject } from '@angular/core';
import { Pressable, ScrollView, Text } from '@ng-native/components';
import { NativeHeader, NativeNavigation } from '@ng-native/router';
import { OrdersApi } from './orders-api.ts';

/** Your orders, each one a tap away from its live status. */
@Component({
  selector: 'x-orders',
  imports: [NativeHeader, Pressable, ScrollView, Text],
  template: `
    <native-header title="Orders" />
    <scroll-view class="screen" [contentContainerStyle]="content">
      @for (id of ids; track id) {
        <pressable class="card" accessibilityRole="button" (press)="open(id)">
          <text class="body">Order {{ id }}</text>
        </pressable>
      }
    </scroll-view>
  `,
})
export class OrdersPage {
  private readonly nav = inject(NativeNavigation);
  protected readonly ids = inject(OrdersApi).ids();
  protected readonly content = { padding: 16, gap: 8 };

  protected open(id: string): void {
    void this.nav.push(['/orders', id]);
  }
}
