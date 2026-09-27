import { Component, effect, inject, signal, untracked } from '@angular/core';
import { Pressable, ScrollView, Text, View } from '@ng-native/components';
import { NativeHeader, NativeNavigation } from '@ng-native/router';
import { Basket, PRODUCTS, price, saving, type Product } from './shop-model.ts';

/**
 * A shop: a grid of products drawn in CSS, sale prices struck through, star ratings filled to a
 * tenth by clipping, and a basket button whose badge bumps on every add, by taking its class
 * away and giving it back so the keyframes play again.
 */
@Component({
  selector: 'x-shop',
  imports: [NativeHeader, Pressable, ScrollView, Text, View],
  template: `
    <native-header title="Shop" [largeTitle]="true" />
    <view class="screen">
      <scroll-view
        class="page"
        contentInsetAdjustmentBehavior="automatic"
        [contentContainerStyle]="content"
      >
        <view class="promo">
          <text class="promo-title">Autumn edit</text>
          <text class="promo-hint">Up to 20% off outdoor, this week only</text>
        </view>
        <view class="grid">
          @for (product of products; track product.id) {
            <pressable
              class="tile"
              [style.--tone]="product.tone"
              accessibilityRole="button"
              [accessibilityLabel]="
                product.name +
                ', ' +
                priceOf(product.price) +
                (product.was ? ', was ' + priceOf(product.was) : '')
              "
              (press)="open(product)"
            >
              <view class="art">
                <text class="glyph">{{ product.glyph }}</text>
                @if (product.was) {
                  <view class="badge"
                    ><text class="badge-label">-{{ saving(product) }}%</text></view
                  >
                }
              </view>
              <text class="maker">{{ product.maker }}</text>
              <text class="name" [numberOfLines]="1">{{ product.name }}</text>
              <view class="stars" [accessibilityLabel]="product.rating + ' out of 5'">
                <view class="star-row">
                  @for (n of five; track n) {
                    <text class="star">★</text>
                  }
                </view>
                <view class="stars-fill" [style.width.%]="product.rating * 20">
                  <view class="star-row gold">
                    @for (n of five; track n) {
                      <text class="star">★</text>
                    }
                  </view>
                </view>
              </view>
              <view class="price-row">
                <text class="price" [class.on-sale]="product.was">{{
                  priceOf(product.price)
                }}</text>
                @if (product.was) {
                  <text class="was">{{ priceOf(product.was) }}</text>
                }
              </view>
            </pressable>
          }
        </view>
      </scroll-view>

      <pressable
        class="basket"
        accessibilityRole="button"
        [accessibilityLabel]="'Basket, ' + basket.count() + ' items'"
        (press)="openBasket()"
      >
        <text class="basket-glyph">🛍</text>
        @if (basket.count()) {
          <view class="count" [class.bump]="bumping()">
            <text class="count-label">{{ basket.count() }}</text>
          </view>
        }
      </pressable>
    </view>
  `,
  styleUrl: './shop-styles.css',
  styles: `
    .screen,
    .page {
      flex: 1;
      background-color: var(--ground);
    }
    .promo {
      margin: 6px 16px 18px;
      padding: 18px;
      border-radius: 20px;
      background-image:
        radial-gradient(circle at 100% 0%, oklch(0.85 0.14 85 / 0.8) 0%, transparent 55%),
        linear-gradient(120deg, oklch(0.55 0.17 40), oklch(0.62 0.2 20));
    }
    .promo-title {
      color: white;
      font-size: 24px;
      font-weight: 900;
      letter-spacing: -0.5px;
    }
    .promo-hint {
      margin-top: 4px;
      color: rgba(255, 255, 255, 0.85);
      font-size: 14px;
    }
    .grid {
      flex-direction: row;
      flex-wrap: wrap;
      padding: 0 10px;
      row-gap: 20px;
    }
    .tile {
      width: 50%;
      padding: 0 6px;
    }
    .tile:active .art {
      scale: 0.97;
    }
    .art {
      aspect-ratio: 0.9;
      border-radius: 20px;
      align-items: center;
      justify-content: center;
      margin-bottom: 10px;
      background-image:
        radial-gradient(
          circle at 30% 25%,
          oklch(from var(--tone) 0.97 calc(c * 0.3) h) 0%,
          transparent 70%
        ),
        linear-gradient(
          160deg,
          oklch(from var(--tone) 0.92 calc(c * 0.35) h),
          oklch(from var(--tone) 0.8 calc(c * 0.6) h)
        );
      transition: scale 140ms ease-out;
    }
    .glyph {
      font-size: 64px;
      padding: 12px;
      text-shadow: 0 10px 18px oklch(from var(--tone) 0.4 c h / 0.35);
    }
    .badge {
      position: absolute;
      top: 10px;
      left: 10px;
      padding: 3px 8px;
      border-radius: 999px;
      background-color: var(--sale);
    }
    .badge-label {
      color: white;
      font-size: 12px;
      font-weight: 800;
    }
    .maker {
      color: var(--soft);
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.8px;
    }
    .name {
      margin: 2px 0 4px;
      color: var(--ink);
      font-size: 16px;
      font-weight: 700;
    }
    .price-row {
      margin-top: 4px;
    }
    .price {
      font-size: 16px;
    }
    .was {
      font-size: 13px;
    }
    .basket {
      position: absolute;
      right: 20px;
      bottom: 34px;
      width: 60px;
      height: 60px;
      border-radius: 30px;
      align-items: center;
      justify-content: center;
      background-color: var(--ink);
      box-shadow: 0 14px 26px -10px rgba(0, 0, 0, 0.5);
      transition: scale 120ms ease-out;
    }
    .basket:active {
      scale: 0.92;
    }
    .basket-glyph {
      font-size: 26px;
    }
    .count {
      position: absolute;
      top: -2px;
      right: -2px;
      min-width: 22px;
      height: 22px;
      padding: 0 6px;
      border-radius: 11px;
      align-items: center;
      justify-content: center;
      background-color: var(--sale);
      border-width: 2px;
      border-color: var(--ground);
    }
    .bump {
      animation: bump 380ms cubic-bezier(0.3, 1.6, 0.5, 1);
    }
    @keyframes bump {
      40% {
        scale: 1.45;
      }
    }
    .count-label {
      color: white;
      font-size: 12px;
      font-weight: 800;
      font-variant-numeric: tabular-nums;
    }
  `,
})
export class ShopPage {
  protected readonly basket = inject(Basket);
  private readonly nav = inject(NativeNavigation);
  protected readonly products = PRODUCTS;
  protected readonly content = { paddingBottom: 120 };
  protected readonly priceOf = price;
  protected readonly five = [1, 2, 3, 4, 5];
  protected readonly saving = saving;
  protected readonly bumping = signal(false);

  constructor() {
    // Off and on again, a frame apart, so the same animation plays for every add.
    effect(() => {
      if (!this.basket.adds()) return;
      untracked(() => this.bumping.set(false));
      requestAnimationFrame(() => this.bumping.set(true));
    });
  }

  protected open(product: Product): void {
    void this.nav.push(`/shop/${product.id}`);
  }

  protected openBasket(): void {
    void this.nav.present('/shop/basket', { as: 'pageSheet' });
  }
}
