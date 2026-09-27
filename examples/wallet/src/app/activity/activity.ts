import { Component, computed, inject, signal } from '@angular/core';
import { Pressable, Text, View, VirtualList } from '@ng-native/components';
import {
  NativeHeader,
  NativeHeaderItem,
  NativeNavigation,
  NativeSearchBar,
  NativeStackOutlet,
} from '@ng-native/router';
import { Ledger } from '../payments/ledger.ts';
import { PaymentRow } from '../payments/payment-row.ts';

/** The activity tab is a stack of its own: the native header its large title and search bar need. */
@Component({
  selector: 'app-activity-stack',
  imports: [NativeStackOutlet],
  template: `<native-stack-outlet />`,
})
export class ActivityStack {}

/**
 * Every payment, searchable from the navigation bar. The list is virtual: a few hundred rows,
 * and only the ones on screen exist, recycled as they scroll.
 */
@Component({
  selector: 'app-activity',
  imports: [
    NativeHeader,
    NativeHeaderItem,
    NativeSearchBar,
    PaymentRow,
    Pressable,
    Text,
    View,
    VirtualList,
  ],
  template: `
    <native-header title="Activity" [largeTitle]="true">
      <native-header-item type="searchBar">
        <native-search-bar testID="search" placeholder="Search payments" [(query)]="query" />
      </native-header-item>
    </native-header>
    <virtual-list
      #list
      testID="payments"
      class="flex-1 bg-white dark:bg-black"
      contentInsetAdjustmentBehavior="automatic"
      [items]="shown()"
      [itemHeight]="rowHeight"
    >
      @for (row of list.window(); track row.slot) {
        <pressable
          class="justify-center px-5 active:bg-zinc-100 dark:active:bg-zinc-900"
          accessibilityRole="button"
          [style]="row.style"
          (press)="open(row.item.id)"
        >
          <app-payment-row [payment]="row.item" />
        </pressable>
      }
    </virtual-list>
    @if (!shown().length) {
      <view class="absolute inset-x-0 top-1/3 items-center">
        <text class="text-zinc-500">No payments match "{{ query() }}"</text>
      </view>
    }
  `,
})
export class Activity {
  private readonly ledger = inject(Ledger);
  private readonly navigation = inject(NativeNavigation);

  protected readonly rowHeight = 68;
  protected readonly query = signal('');
  protected readonly shown = computed(() => {
    const query = this.query().trim().toLowerCase();
    const payments = this.ledger.payments();
    if (!query) return payments;
    return payments.filter((p) => `${p.name} ${p.category}`.toLowerCase().includes(query));
  });

  protected open(id: string): void {
    void this.navigation.push(['/payment', id]);
  }
}
