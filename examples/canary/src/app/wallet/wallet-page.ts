import { Component, computed, inject, signal } from '@angular/core';
import type { NativeSyntheticEvent } from 'react-native';
import { Pressable, ScrollView, Text, View } from '@ng-native/components';
import { NativeHeader } from '@ng-native/router';
import {
  CARDS,
  CATEGORY_NAMES,
  CATEGORY_TONES,
  CURRENCIES,
  Wallet,
  type Card,
  type Transaction,
} from './wallet-model.ts';

const WEEKDAY = new Intl.DateTimeFormat('en-GB', { weekday: 'short' });
const DAY = new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
const CARD_WIDTH = 300;

/**
 * A wallet: cards under a hero that drifts away, a balance that recedes, and a compact bar that
 * arrives and pins as the hero leaves, all played by the scroll on the native side with
 * `animation-timeline: scroll()`; a week of spending as bars that grow in, staggered by a token;
 * where the money went as one bar split by `flex: var(--share)`; and every amount in the currency
 * chosen, formatted by `Intl`.
 */
@Component({
  selector: 'x-wallet',
  imports: [NativeHeader, Pressable, ScrollView, Text, View],
  template: `
    <native-header title="Wallet" [hidden]="true" />
    <scroll-view class="page" contentInsetAdjustmentBehavior="never" [stickyHeaderIndices]="[1]">
      <view class="hero" [style.--card]="wallet.card().tone">
        <view class="drift">
          <scroll-view
            class="cards"
            [horizontal]="true"
            [pagingEnabled]="false"
            [snapToInterval]="cardStep"
            decelerationRate="fast"
            [showsHorizontalScrollIndicator]="false"
            [scrollEventThrottle]="32"
            [contentContainerStyle]="cardsContent"
            (momentumScrollEnd)="settleCard($event)"
          >
            @for (card of cards; track card.id) {
              <view
                class="card"
                [style.--card]="card.tone"
                accessibilityRole="summary"
                [accessibilityLabel]="card.name + ' card ending ' + card.last4"
              >
                <view class="card-top">
                  <text class="card-name">{{ card.name }}</text>
                  <text class="card-network">VISA</text>
                </view>
                <view class="chip"
                  ><view class="chip-line"></view><view class="chip-line"></view
                ></view>
                <text class="card-number">{{
                  revealed() ? '4000 1234 5678 ' + card.last4 : '•••• •••• •••• ' + card.last4
                }}</text>
                <text class="card-holder">{{ card.holder }}</text>
              </view>
            }
          </scroll-view>
          <pressable
            class="reveal"
            accessibilityRole="button"
            [accessibilityLabel]="revealed() ? 'Hide card number' : 'Show card number'"
            (press)="revealed.set(!revealed())"
          >
            <text class="reveal-label">{{ revealed() ? 'Hide number' : 'Show number' }}</text>
          </pressable>
        </view>
        <view class="balance-block">
          <text class="balance-label">Balance</text>
          <text class="balance" accessibilityRole="header">{{
            wallet.format(wallet.balance())
          }}</text>
        </view>
      </view>

      <view class="compact" [style.--card]="wallet.card().tone">
        <text class="compact-title">{{ wallet.card().name }}</text>
        <text class="compact-balance">{{ wallet.format(wallet.balance()) }}</text>
      </view>

      <view class="currencies" accessibilityRole="tablist">
        @for (code of currencies; track code) {
          <pressable
            class="currency"
            [class.on]="wallet.currency() === code"
            accessibilityRole="tab"
            [accessibilityLabel]="code"
            [accessibilityState]="{ selected: wallet.currency() === code }"
            (press)="wallet.currency.set(code)"
          >
            <text class="currency-label">{{ code }}</text>
          </pressable>
        }
      </view>

      <view class="panel">
        <view class="panel-head">
          <text class="panel-title">This week</text>
          <text class="panel-note">{{ chosenDay() }}</text>
        </view>
        <view class="chart">
          @for (pence of wallet.days(); track $index) {
            <pressable
              class="column"
              [class.picked]="picked() === $index"
              accessibilityRole="button"
              [accessibilityLabel]="dayName($index) + ', ' + wallet.format(pence)"
              (press)="picked.set($index)"
            >
              <view class="track">
                <view class="bar" [style.--amount]="barHeight(pence)" [style.--i]="$index"></view>
              </view>
              <text class="day">{{ dayName($index) }}</text>
            </pressable>
          }
        </view>
      </view>

      <view class="panel">
        <text class="panel-title">Where it went</text>
        <view class="split">
          @for (part of wallet.categories(); track part.category) {
            <view
              class="segment"
              [style.--share]="part.share"
              [style.--tone]="categoryTone(part.category)"
            ></view>
          }
        </view>
        <view class="legend">
          @for (part of wallet.categories(); track part.category) {
            <view class="legend-row" [style.--tone]="categoryTone(part.category)">
              <view class="legend-dot"></view>
              <text class="legend-name">{{ categoryName(part.category) }}</text>
              <text class="legend-amount">{{ wallet.format(part.pence) }}</text>
            </view>
          }
        </view>
      </view>

      <view class="panel">
        <text class="panel-title">Activity</text>
        @for (one of wallet.transactions(); track one.id) {
          <view
            class="row"
            [style.--tone]="categoryTone(one.category)"
            [accessible]="true"
            [accessibilityLabel]="one.merchant + ', ' + wallet.format(one.amount)"
          >
            <view class="avatar"
              ><text class="avatar-initial">{{ one.merchant[0] }}</text></view
            >
            <view class="row-text">
              <text class="merchant">{{ one.merchant }}</text>
              <text class="when">{{ whenOf(one) }}</text>
            </view>
            <text class="amount" [class.income]="one.amount > 0">{{
              wallet.format(one.amount)
            }}</text>
          </view>
        }
      </view>
    </scroll-view>
  `,
  styles: `
    :host {
      --ink: light-dark(oklch(0.2 0.02 280), oklch(0.96 0.01 280));
      --soft: light-dark(oklch(0.52 0.02 280), oklch(0.72 0.02 280));
      --surface: light-dark(white, oklch(0.21 0.02 280));
      --ground: light-dark(oklch(0.97 0.006 280), oklch(0.13 0.02 280));
    }
    .page {
      flex: 1;
      background-color: var(--ground);
    }
    .hero {
      padding-top: calc(env(safe-area-inset-top) + 16px);
      padding-bottom: 28px;
      background-image:
        radial-gradient(circle at 15% 0%, oklch(from var(--card) l c h / 0.65) 0%, transparent 60%),
        radial-gradient(
          circle at 100% 40%,
          oklch(from var(--card) calc(l + 0.1) c calc(h + 60) / 0.35) 0%,
          transparent 55%
        ),
        linear-gradient(180deg, oklch(0.16 0.03 285), oklch(0.2 0.04 285) 70%, var(--ground));
    }
    .drift {
      animation: drift linear both;
      animation-timeline: scroll();
      animation-range: 0 300px;
    }
    @keyframes drift {
      to {
        translate: 0 120px;
        scale: 0.86;
        opacity: 0.2;
      }
    }
    .cards {
      flex-grow: 0;
    }
    .card {
      width: 300px;
      height: 188px;
      margin-right: 14px;
      padding: 18px 20px;
      border-radius: 22px;
      justify-content: space-between;
      background-image:
        radial-gradient(circle at 90% 10%, rgba(255, 255, 255, 0.35) 0%, transparent 45%),
        linear-gradient(
          135deg,
          oklch(from var(--card) calc(l + 0.12) c calc(h - 25)),
          var(--card) 55%,
          oklch(from var(--card) calc(l - 0.18) c calc(h + 20))
        );
      border-width: 1px;
      border-color: rgba(255, 255, 255, 0.22);
      box-shadow: 0 24px 40px -18px oklch(from var(--card) calc(l - 0.1) c h / 0.8);
    }
    .card-top {
      flex-direction: row;
      justify-content: space-between;
    }
    .card-name {
      color: rgba(255, 255, 255, 0.92);
      font-size: 15px;
      font-weight: 700;
    }
    .card-network {
      color: white;
      font-size: 16px;
      font-weight: 900;
      font-style: italic;
      letter-spacing: 1px;
    }
    .chip {
      width: 40px;
      height: 30px;
      border-radius: 6px;
      justify-content: space-evenly;
      padding: 0 4px;
      background-image: linear-gradient(135deg, oklch(0.9 0.1 90), oklch(0.72 0.12 75));
    }
    .chip-line {
      height: 1px;
      background-color: rgba(120, 80, 0, 0.45);
    }
    .card-number {
      color: white;
      font-size: 19px;
      font-weight: 600;
      letter-spacing: 2px;
      font-variant-numeric: tabular-nums;
      text-shadow: 0 1px 2px oklch(from var(--card) calc(l - 0.3) c h / 0.6);
    }
    .card-holder {
      color: rgba(255, 255, 255, 0.8);
      font-size: 13px;
      letter-spacing: 1.2px;
      text-transform: uppercase;
    }
    .reveal {
      align-self: flex-start;
      margin: 14px 20px 0;
      padding: 7px 14px;
      border-radius: 999px;
      background-color: rgba(255, 255, 255, 0.14);
      border-width: 1px;
      border-color: rgba(255, 255, 255, 0.2);
    }
    .reveal-label {
      color: white;
      font-size: 13px;
      font-weight: 600;
    }
    .balance-block {
      margin: 22px 20px 0;
      animation: recede linear both;
      animation-timeline: scroll();
      animation-range: 0 200px;
    }
    @keyframes recede {
      to {
        opacity: 0;
        translate: 0 30px;
      }
    }
    .balance-label {
      color: rgba(255, 255, 255, 0.7);
      font-size: 13px;
      font-weight: 700;
      letter-spacing: 1.4px;
      text-transform: uppercase;
    }
    .balance {
      margin-top: 4px;
      color: white;
      font-size: 42px;
      font-weight: 800;
      letter-spacing: -1px;
      font-variant-numeric: tabular-nums;
    }
    .compact {
      flex-direction: row;
      align-items: center;
      justify-content: space-between;
      padding: calc(env(safe-area-inset-top) + 8px) 20px 12px;
      background-color: light-dark(white, oklch(0.18 0.02 280));
      border-bottom-width: 1px;
      border-bottom-color: oklch(from var(--card) l c h / 0.2);
      /* Arrives as it reaches the top, where it then stays pinned. */
      animation: arrive linear both;
      animation-timeline: scroll();
      animation-range: 330px 420px;
    }
    @keyframes arrive {
      from {
        opacity: 0;
      }
      to {
        opacity: 1;
      }
    }
    .compact-title {
      color: var(--ink);
      font-size: 16px;
      font-weight: 700;
    }
    .compact-balance {
      color: oklch(from var(--card) calc(l - 0.05) c h);
      font-size: 16px;
      font-weight: 800;
    }
    .currencies {
      flex-direction: row;
      gap: 8px;
      /* Up under the pinned bar, which is invisible until the hero has scrolled away. */
      margin: calc(-1 * env(safe-area-inset-top) - 30px) 16px 6px;
      padding: 4px;
      border-radius: 14px;
      background-color: light-dark(oklch(0.93 0.01 280), oklch(0.2 0.02 280));
    }
    .currency {
      flex: 1;
      padding: 8px 0;
      border-radius: 10px;
      align-items: center;
    }
    .on {
      background-color: var(--surface);
      box-shadow: 0 2px 8px -2px rgba(30, 20, 60, 0.25);
    }
    .currency-label {
      color: var(--ink);
      font-size: 14px;
      font-weight: 700;
    }
    .panel {
      margin: 12px 16px;
      padding: 16px;
      border-radius: 22px;
      background-color: var(--surface);
      box-shadow: 0 10px 28px -20px light-dark(rgba(30, 20, 60, 0.4), black);
    }
    .panel-head {
      flex-direction: row;
      justify-content: space-between;
      align-items: baseline;
    }
    .panel-title {
      color: var(--ink);
      font-size: 17px;
      font-weight: 800;
    }
    .panel-note {
      color: var(--soft);
      font-size: 13px;
      font-variant-numeric: tabular-nums;
    }
    .chart {
      flex-direction: row;
      align-items: flex-end;
      height: 170px;
      margin-top: 12px;
    }
    .column {
      flex: 1;
      align-items: center;
    }
    .track {
      height: 140px;
      justify-content: flex-end;
    }
    .bar {
      width: 22px;
      height: calc(var(--amount) * 1px);
      border-radius: 8px;
      background-image: linear-gradient(
        180deg,
        oklch(from var(--bar, #7c3aed) calc(l + 0.1) c calc(h - 20)),
        var(--bar, #7c3aed)
      );
      transform-origin: bottom;
      opacity: 0.55;
      animation: grow 600ms cubic-bezier(0.2, 0.9, 0.3, 1.15) both;
      animation-delay: calc(var(--i) * 55ms);
      transition: opacity 160ms ease-out;
    }
    .picked .bar {
      opacity: 1;
    }
    @keyframes grow {
      from {
        scale: 1 0;
      }
    }
    .day {
      margin-top: 8px;
      color: var(--soft);
      font-size: 12px;
      font-weight: 600;
    }
    .picked .day {
      color: var(--ink);
      font-weight: 800;
    }
    .split {
      flex-direction: row;
      height: 14px;
      margin: 14px 0 12px;
      border-radius: 7px;
      overflow: hidden;
      gap: 3px;
    }
    .segment {
      flex: var(--share);
      background-color: var(--tone);
    }
    .legend {
      gap: 8px;
    }
    .legend-row {
      flex-direction: row;
      align-items: center;
      gap: 10px;
    }
    .legend-dot {
      width: 10px;
      height: 10px;
      border-radius: 5px;
      background-color: var(--tone);
      box-shadow: 0 0 0 3px oklch(from var(--tone) l c h / 0.2);
    }
    .legend-name {
      flex: 1;
      color: var(--ink);
      font-size: 14px;
    }
    .legend-amount {
      color: var(--soft);
      font-size: 14px;
      font-variant-numeric: tabular-nums;
    }
    .row {
      flex-direction: row;
      align-items: center;
      gap: 12px;
      padding: 10px 0;
    }
    .row + .row {
      border-top-width: 1px;
      border-top-color: light-dark(oklch(0.94 0.005 280), oklch(0.26 0.02 280));
    }
    .avatar {
      width: 38px;
      height: 38px;
      border-radius: 12px;
      align-items: center;
      justify-content: center;
      background-image: linear-gradient(
        135deg,
        oklch(from var(--tone) calc(l + 0.12) c calc(h - 20)),
        var(--tone)
      );
    }
    .avatar-initial {
      color: white;
      font-size: 16px;
      font-weight: 800;
    }
    .row-text {
      flex: 1;
    }
    .merchant {
      color: var(--ink);
      font-size: 15px;
      font-weight: 600;
    }
    .when {
      color: var(--soft);
      font-size: 12px;
    }
    .amount {
      color: var(--ink);
      font-size: 15px;
      font-weight: 700;
      font-variant-numeric: tabular-nums;
    }
    .income {
      color: light-dark(oklch(0.52 0.15 150), oklch(0.78 0.16 150));
    }
  `,
})
export class WalletPage {
  protected readonly wallet = inject(Wallet);
  protected readonly cards = CARDS;
  protected readonly currencies = CURRENCIES;
  protected readonly cardStep = CARD_WIDTH + 14;
  protected readonly cardsContent = { paddingHorizontal: 20 };
  protected readonly revealed = signal(false);
  protected readonly picked = signal(6);

  private readonly tallest = computed(() => Math.max(1, ...this.wallet.days()));
  protected readonly chosenDay = computed(() => {
    const pence = this.wallet.days()[this.picked()] ?? 0;
    return `${this.dayName(this.picked())}, ${this.wallet.format(pence)}`;
  });

  protected barHeight(pence: number): number {
    return Math.max(6, Math.round((pence / this.tallest()) * 140));
  }

  protected dayName(index: number): string {
    const date = new Date();
    date.setDate(date.getDate() - (6 - index));
    return index === 6 ? 'Today' : WEEKDAY.format(date);
  }

  protected whenOf(one: Transaction): string {
    if (one.daysAgo === 0) return 'Today';
    if (one.daysAgo === 1) return 'Yesterday';
    const date = new Date();
    date.setDate(date.getDate() - one.daysAgo);
    return DAY.format(date);
  }

  protected categoryTone(category: Transaction['category']): string {
    return CATEGORY_TONES[category];
  }

  protected categoryName(category: Transaction['category']): string {
    return CATEGORY_NAMES[category];
  }

  protected settleCard(event: NativeSyntheticEvent<{ contentOffset?: { x?: number } }>): void {
    const index = Math.round((event.nativeEvent?.contentOffset?.x ?? 0) / this.cardStep);
    const card: Card | undefined = CARDS[Math.max(0, Math.min(CARDS.length - 1, index))];
    if (card) this.wallet.card.set(card);
  }
}
