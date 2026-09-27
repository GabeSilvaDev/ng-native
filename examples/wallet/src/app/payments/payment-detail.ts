import { Component, computed, inject, input } from '@angular/core';
import { ScrollView, Text, View } from '@ng-native/components';
import { NativeHeader } from '@ng-native/router';
import { Ledger, TINTS, money } from './ledger.ts';
import { dayOf } from './payment-row.ts';

/** One payment in full. `id` is the route param, bound as an input. */
@Component({
  selector: 'app-payment-detail',
  imports: [NativeHeader, ScrollView, Text, View],
  template: `
    <native-header [title]="payment()?.name ?? 'Payment'" />
    <scroll-view
      class="flex-1 bg-zinc-100 dark:bg-black"
      contentInsetAdjustmentBehavior="automatic"
    >
      @if (payment(); as p) {
        <view class="items-center gap-2 px-5 pt-8 pb-6">
          <view
            class="size-16 items-center justify-center rounded-2xl"
            [style.background-color]="tint()"
          >
            <text class="text-2xl font-bold text-white">{{ p.name[0] }}</text>
          </view>
          <text class="text-lg font-semibold text-zinc-900 dark:text-white">{{ p.name }}</text>
          <text
            class="text-4xl font-bold"
            [class]="p.pence > 0 ? 'text-emerald-600' : 'text-zinc-900 dark:text-white'"
            >{{ amount() }}</text
          >
        </view>
        <view class="mx-4 rounded-xl bg-white dark:bg-zinc-900">
          @for (fact of facts(); track fact.label; let last = $last) {
            <view
              class="flex-row justify-between px-4 py-3"
              [class]="last ? '' : 'border-b-hairline border-zinc-200 dark:border-zinc-800'"
            >
              <text class="text-zinc-500">{{ fact.label }}</text>
              <text class="text-zinc-900 dark:text-white">{{ fact.value }}</text>
            </view>
          }
        </view>
      } @else {
        <text class="p-5 text-zinc-500">This payment no longer exists.</text>
      }
    </scroll-view>
  `,
})
export class PaymentDetail {
  private readonly ledger = inject(Ledger);

  readonly id = input.required<string>();

  protected readonly payment = computed(() => this.ledger.find(this.id()));
  protected readonly tint = computed(() => TINTS[this.payment()?.category ?? ''] ?? '#71717a');
  protected readonly amount = computed(() => money(this.payment()?.pence ?? 0, { signed: true }));
  protected readonly facts = computed(() => {
    const p = this.payment();
    if (!p) return [];
    return [
      { label: 'Category', value: p.category },
      { label: 'Date', value: dayOf(p.date) },
      { label: 'Card', value: '•••• 4821' },
      ...(p.note ? [{ label: 'Note', value: p.note }] : []),
    ];
  });
}
