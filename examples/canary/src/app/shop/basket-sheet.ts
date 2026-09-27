import { Component, computed, inject } from '@angular/core';
import { Pressable, ScrollView, Text, View } from '@ng-native/components';
import { NativeNavigation } from '@ng-native/router';
import { Basket, FREE_DELIVERY, price, type Line } from './shop-model.ts';

/**
 * The basket, as a page sheet: each line with a stepper, a meter to free delivery that fills
 * as the basket does, and the totals.
 */
@Component({
  selector: 'x-basket',
  imports: [Pressable, ScrollView, Text, View],
  template: `
    <view class="sheet">
      <view class="head">
        <text class="title" accessibilityRole="header">Basket</text>
        <pressable
          class="close"
          accessibilityRole="button"
          accessibilityLabel="Close"
          (press)="nav.back()"
        >
          <text class="close-label">Done</text>
        </pressable>
      </view>
      @if (basket.lines().length) {
        <scroll-view class="lines">
          <view class="meter-block">
            <text class="meter-label">{{ deliveryNote() }}</text>
            <view class="meter"
              ><view class="meter-fill" [style.width.%]="towardsFree()"></view
            ></view>
          </view>
          @for (line of basket.lines(); track line.product.id + line.size) {
            <view class="line" [style.--tone]="line.product.tone">
              <view class="thumb"
                ><text class="thumb-glyph">{{ line.product.glyph }}</text></view
              >
              <view class="line-text">
                <text class="line-name">{{ line.product.name }}</text>
                @if (line.size) {
                  <text class="line-size">Size {{ line.size }}</text>
                }
                <text class="price">{{ priceOf(line.product.price * line.quantity) }}</text>
              </view>
              <view class="stepper">
                <pressable
                  class="step"
                  accessibilityRole="button"
                  [accessibilityLabel]="'One fewer ' + line.product.name"
                  (press)="basket.change(line, -1)"
                >
                  <text class="step-label">−</text>
                </pressable>
                <text class="quantity" [accessibilityLabel]="lineLabel(line)">{{
                  line.quantity
                }}</text>
                <pressable
                  class="step"
                  accessibilityRole="button"
                  [accessibilityLabel]="'One more ' + line.product.name"
                  (press)="basket.change(line, 1)"
                >
                  <text class="step-label">+</text>
                </pressable>
              </view>
            </view>
          }
          <view class="totals">
            <view class="total-row"
              ><text class="total-name">Subtotal</text
              ><text class="total-value">{{ priceOf(basket.subtotal()) }}</text></view
            >
            <view class="total-row"
              ><text class="total-name">Delivery</text
              ><text class="total-value">{{
                basket.delivery() ? priceOf(basket.delivery()) : 'Free'
              }}</text></view
            >
            <view class="total-row grand"
              ><text class="total-name">Total</text
              ><text class="total-value" accessibilityRole="summary">{{
                priceOf(basket.total())
              }}</text></view
            >
          </view>
        </scroll-view>
      } @else {
        <view class="empty">
          <text class="empty-glyph">🛍</text>
          <text class="empty-label">Your basket is empty</text>
        </view>
      }
    </view>
  `,
  styleUrl: './shop-styles.css',
  styles: `
    .sheet {
      flex: 1;
      background-color: var(--ground);
    }
    .head {
      flex-direction: row;
      align-items: center;
      justify-content: space-between;
      /* Nothing in a sheet; the status bar's height when the basket is opened as a screen. */
      padding: calc(env(safe-area-inset-top) + 20px) 20px 10px;
    }
    .title {
      color: var(--ink);
      font-size: 28px;
      font-weight: 900;
    }
    .close-label {
      color: var(--sale);
      font-size: 17px;
      font-weight: 700;
    }
    .lines {
      flex: 1;
    }
    .meter-block {
      margin: 6px 20px 16px;
      gap: 8px;
    }
    .meter-label {
      color: var(--ink);
      font-size: 14px;
      font-weight: 600;
    }
    .meter {
      height: 8px;
      border-radius: 4px;
      overflow: hidden;
      background-color: light-dark(oklch(0.9 0.01 60), oklch(0.3 0.01 60));
    }
    .meter-fill {
      height: 8px;
      border-radius: 4px;
      background-image: linear-gradient(90deg, oklch(0.72 0.17 150), oklch(0.62 0.17 165));
      transition: width 300ms ease-out;
    }
    .line {
      flex-direction: row;
      align-items: center;
      gap: 12px;
      margin: 0 16px 10px;
      padding: 12px;
      border-radius: 18px;
      background-color: var(--surface);
    }
    .thumb {
      width: 64px;
      height: 64px;
      border-radius: 14px;
      align-items: center;
      justify-content: center;
      background-image: linear-gradient(
        160deg,
        oklch(from var(--tone) 0.92 calc(c * 0.35) h),
        oklch(from var(--tone) 0.8 calc(c * 0.6) h)
      );
    }
    .thumb-glyph {
      font-size: 32px;
    }
    .line-text {
      flex: 1;
      gap: 2px;
    }
    .line-name {
      color: var(--ink);
      font-size: 15px;
      font-weight: 700;
    }
    .line-size {
      color: var(--soft);
      font-size: 13px;
    }
    .stepper {
      flex-direction: row;
      align-items: center;
      gap: 4px;
      padding: 4px;
      border-radius: 999px;
      background-color: light-dark(oklch(0.94 0.01 60), oklch(0.28 0.01 60));
    }
    .step {
      width: 30px;
      height: 30px;
      border-radius: 15px;
      align-items: center;
      justify-content: center;
      background-color: var(--surface);
    }
    .step-label {
      color: var(--ink);
      font-size: 18px;
      font-weight: 700;
    }
    .quantity {
      min-width: 20px;
      text-align: center;
      color: var(--ink);
      font-size: 15px;
      font-weight: 800;
      font-variant-numeric: tabular-nums;
    }
    .totals {
      margin: 10px 20px 40px;
      gap: 8px;
    }
    .total-row {
      flex-direction: row;
      justify-content: space-between;
    }
    .total-name,
    .total-value {
      color: var(--soft);
      font-size: 15px;
      font-variant-numeric: tabular-nums;
    }
    .grand {
      padding-top: 10px;
      border-top-width: 1px;
      border-top-color: light-dark(oklch(0.9 0.01 60), oklch(0.3 0.01 60));
    }
    .grand .total-name,
    .grand .total-value {
      color: var(--ink);
      font-size: 18px;
      font-weight: 800;
    }
    .empty {
      flex: 1;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }
    .empty-glyph {
      font-size: 56px;
    }
    .empty-label {
      color: var(--soft);
      font-size: 17px;
    }
  `,
})
export class BasketSheet {
  protected readonly basket = inject(Basket);
  protected readonly nav = inject(NativeNavigation);
  protected readonly priceOf = price;
  protected readonly towardsFree = computed(() =>
    Math.min(100, (this.basket.subtotal() / FREE_DELIVERY) * 100),
  );
  protected readonly deliveryNote = computed(() => {
    const left = FREE_DELIVERY - this.basket.subtotal();
    return left > 0 ? `${price(left)} away from free delivery` : 'Free delivery unlocked';
  });

  protected lineLabel(line: Line): string {
    return `${line.quantity} of ${line.product.name}`;
  }
}
