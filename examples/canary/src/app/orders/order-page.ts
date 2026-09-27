import {
  Component,
  computed,
  effect,
  inject,
  input,
  linkedSignal,
  resource,
  signal,
} from '@angular/core';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from '@ng-native/components';
import { AppState, SCREEN_IN_FRONT } from '@ng-native/device';
import { NativeHeader, NativeNavigation } from '@ng-native/router';
import { ORDER_POLL_MS, OrdersApi, type Order } from './orders-api.ts';

/**
 * One order's live status: asked for when the screen opens, asked again every couple of seconds
 * while the screen is in front and the app is, and never after either stops. "Next order" shows
 * another order on the same screen, and an answer still coming for the first is dropped rather
 * than shown on the second. Cancelling waits for the server, once however often it is tapped, and
 * a poll that was already on its way cannot put the order back as it was.
 */
@Component({
  selector: 'x-order',
  imports: [ActivityIndicator, NativeHeader, Pressable, ScrollView, Text, View],
  template: `
    <native-header [title]="'Order ' + shown()" />
    <scroll-view class="screen" [contentContainerStyle]="content">
      @if (order.error() && !order.hasValue()) {
        <text class="body danger">The order could not be loaded.</text>
        <pressable class="button" accessibilityRole="button" (press)="order.reload()">
          <text class="button-label">Try again</text>
        </pressable>
      } @else if (order.hasValue()) {
        @let current = order.value();
        <text class="heading">{{ current.item }}</text>
        <text class="body" accessibilityRole="summary">Status: {{ current.status }}</text>
        <text class="hint">Order {{ current.id }}, version {{ current.version }}</text>
        @if (current.status !== 'cancelled' && current.status !== 'delivered') {
          <pressable
            class="button"
            accessibilityRole="button"
            [disabled]="cancelling()"
            [accessibilityState]="{ disabled: cancelling(), busy: cancelling() }"
            (press)="cancel(current)"
          >
            <text class="button-label">{{ cancelling() ? 'Cancelling' : 'Cancel order' }}</text>
          </pressable>
        }
      } @else {
        <view class="centre"><activity-indicator /></view>
      }
      <pressable class="card" accessibilityRole="button" (press)="next()">
        <text class="button-label">Next order</text>
      </pressable>
      <pressable class="card" accessibilityRole="button" (press)="openAll()">
        <text class="button-label">All orders</text>
      </pressable>
    </scroll-view>
  `,
  styles: `
    .centre {
      padding: 24px;
      align-items: center;
    }
  `,
})
export class OrderPage {
  private readonly api = inject(OrdersApi);
  private readonly nav = inject(NativeNavigation);
  private readonly appState = inject(AppState);
  private readonly inFront = inject(SCREEN_IN_FRONT);
  private readonly pollMs = inject(ORDER_POLL_MS);

  readonly id = input.required<string>();
  /** The order on screen: the route's, until "Next order" moves on from it. */
  protected readonly shown = linkedSignal(() => this.id());
  protected readonly cancelling = signal(false);
  protected readonly content = { padding: 20, gap: 12 };

  /**
   * Keyed by the order shown, so a new order cancels the request for the old one, and reloaded by
   * the poll, which cancels a poll still on its way.
   */
  protected readonly order = resource({
    params: () => this.shown(),
    loader: ({ params, abortSignal }) => this.api.order(params, abortSignal),
  });

  /** Only while someone can see it: the screen in front, and the app in front of the user. */
  private readonly live = computed(() => this.inFront() && this.appState.active());

  constructor() {
    effect((onCleanup) => {
      if (!this.live()) return;
      const timer = setInterval(() => this.order.reload(), this.pollMs);
      onCleanup(() => clearInterval(timer));
    });
  }

  protected next(): void {
    const ids = this.api.ids();
    this.shown.set(ids[(ids.indexOf(this.shown()) + 1) % ids.length]!);
  }

  protected openAll(): void {
    void this.nav.push('/orders');
  }

  protected async cancel(order: Order): Promise<void> {
    if (this.cancelling()) return;
    this.cancelling.set(true);
    try {
      const cancelled = await this.api.cancel(order.id);
      // Set, not reloaded: setting cancels a poll still on its way, whose answer predates this.
      if (this.shown() === cancelled.id) this.order.set(cancelled);
    } finally {
      this.cancelling.set(false);
    }
  }
}
