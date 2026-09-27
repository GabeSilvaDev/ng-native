import { Component, computed, inject, input, signal } from '@angular/core';
import { Pressable, ScrollView, Text, View } from '@ng-native/components';
import { NativeHeader } from '@ng-native/router';
import { Basket, PRODUCTS, price, saving } from './shop-model.ts';

/**
 * One product: its art large over a glow of its own colour, popping in on keyframes; sizes as
 * chips; and an add button that says it worked. A product with sizes cannot be added until one
 * is chosen, and the button says so rather than doing nothing.
 */
@Component({
  selector: 'x-product',
  imports: [NativeHeader, Pressable, ScrollView, Text, View],
  template: `
    @if (product(); as product) {
      <native-header [title]="product.name" />
      <scroll-view
        class="page"
        contentInsetAdjustmentBehavior="automatic"
        [style.--tone]="product.tone"
      >
        <view class="hero">
          <text class="glyph">{{ product.glyph }}</text>
          @if (product.was) {
            <view class="badge"
              ><text class="badge-label">Save {{ saving(product) }}%</text></view
            >
          }
        </view>
        <view class="info">
          <text class="maker">{{ product.maker }}</text>
          <text class="name" accessibilityRole="header">{{ product.name }}</text>
          <view class="rating">
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
            <text class="reviews">{{ product.rating }} · {{ product.reviews }} reviews</text>
          </view>
          <view class="price-row">
            <text class="price big" [class.on-sale]="product.was">{{
              priceOf(product.price)
            }}</text>
            @if (product.was) {
              <text class="was">{{ priceOf(product.was) }}</text>
            }
          </view>

          @if (product.sizes; as sizes) {
            <text class="label">Size</text>
            <view class="sizes" accessibilityRole="radiogroup">
              @for (one of sizes; track one) {
                <pressable
                  class="size"
                  [class.picked]="size() === one"
                  accessibilityRole="radio"
                  [accessibilityLabel]="'Size ' + one"
                  [accessibilityState]="{ checked: size() === one }"
                  (press)="size.set(one)"
                >
                  <text class="size-label">{{ one }}</text>
                </pressable>
              }
            </view>
          }

          <pressable
            class="add"
            [class.done]="added()"
            accessibilityRole="button"
            [accessibilityLabel]="buttonLabel()"
            [accessibilityState]="{ disabled: needsSize() }"
            (press)="add()"
          >
            <text class="add-label">{{ buttonLabel() }}</text>
          </pressable>
        </view>
      </scroll-view>
    }
  `,
  styleUrl: './shop-styles.css',
  styles: `
    .page {
      flex: 1;
      background-color: var(--ground);
    }
    .hero {
      height: 320px;
      margin: 8px 16px 0;
      border-radius: 28px;
      align-items: center;
      justify-content: center;
      background-image:
        radial-gradient(
          circle at 50% 40%,
          oklch(from var(--tone) 0.97 calc(c * 0.25) h) 0%,
          transparent 65%
        ),
        linear-gradient(
          170deg,
          oklch(from var(--tone) 0.9 calc(c * 0.4) h),
          oklch(from var(--tone) 0.72 calc(c * 0.7) h)
        );
    }
    .glyph {
      font-size: 150px;
      padding: 24px;
      text-shadow: 0 24px 40px oklch(from var(--tone) 0.35 c h / 0.45);
      animation: pop 520ms cubic-bezier(0.2, 1.4, 0.4, 1) both;
    }
    @keyframes pop {
      from {
        opacity: 0;
        scale: 0.6;
        rotate: -12deg;
      }
    }
    .badge {
      position: absolute;
      top: 16px;
      right: 16px;
      padding: 6px 12px;
      border-radius: 999px;
      background-color: var(--sale);
    }
    .badge-label {
      color: white;
      font-size: 13px;
      font-weight: 800;
    }
    .info {
      padding: 18px 20px 60px;
    }
    .maker {
      color: var(--soft);
      font-size: 13px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .name {
      margin-top: 4px;
      color: var(--ink);
      font-size: 28px;
      font-weight: 900;
      letter-spacing: -0.6px;
    }
    .rating {
      flex-direction: row;
      align-items: center;
      gap: 8px;
      margin-top: 8px;
    }
    .reviews {
      color: var(--soft);
      font-size: 13px;
    }
    .price-row {
      margin-top: 14px;
    }
    .big {
      font-size: 26px;
    }
    .was {
      font-size: 17px;
    }
    .label {
      margin-top: 22px;
      color: var(--ink);
      font-size: 15px;
      font-weight: 700;
    }
    .sizes {
      flex-direction: row;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 10px;
    }
    .size {
      min-width: 52px;
      padding: 12px 14px;
      border-radius: 14px;
      align-items: center;
      border-width: 1.5px;
      border-color: light-dark(oklch(0.88 0.01 60), oklch(0.35 0.01 60));
      background-color: var(--surface);
      transition: background-color 140ms ease-out;
    }
    .picked {
      border-color: var(--tone);
      background-color: oklch(from var(--tone) l c h / 0.14);
    }
    .size-label {
      color: var(--ink);
      font-size: 16px;
      font-weight: 700;
    }
    .add {
      margin-top: 26px;
      padding: 18px;
      border-radius: 18px;
      align-items: center;
      background-image: linear-gradient(
        135deg,
        var(--tone),
        oklch(from var(--tone) calc(l - 0.1) c calc(h + 20))
      );
      box-shadow: 0 16px 28px -14px oklch(from var(--tone) calc(l - 0.1) c h / 0.8);
      transition: scale 120ms ease-out;
    }
    .add:active {
      scale: 0.97;
    }
    .done {
      background-image: linear-gradient(135deg, oklch(0.62 0.17 150), oklch(0.52 0.15 160));
    }
    .add-label {
      color: white;
      font-size: 17px;
      font-weight: 800;
    }
  `,
})
export class ProductPage {
  readonly id = input.required<string>();
  private readonly basket = inject(Basket);
  protected readonly priceOf = price;
  protected readonly five = [1, 2, 3, 4, 5];
  protected readonly saving = saving;
  protected readonly product = computed(() => PRODUCTS.find((one) => one.id === this.id()));
  protected readonly size = signal<string | null>(null);
  protected readonly added = signal(false);
  protected readonly needsSize = computed(() => !!this.product()?.sizes && this.size() === null);
  protected readonly buttonLabel = computed(() =>
    this.added() ? 'Added to basket' : this.needsSize() ? 'Choose a size' : 'Add to basket',
  );

  protected add(): void {
    const product = this.product();
    if (!product || this.needsSize()) return;
    this.basket.add(product, this.size());
    this.added.set(true);
    setTimeout(() => this.added.set(false), 1600);
  }
}
