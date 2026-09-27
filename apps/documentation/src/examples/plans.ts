/*
 * The CSS engine, shown with ordinary component CSS: custom properties on `:host`, layered
 * gradients, a descendant selector reaching `<text>`, an attribute selector for the chosen plan,
 * `:active` with a transition, and a `prefers-color-scheme` query - this is the dark screen it
 * picks. It is compiled at build time into rules the engine matches against the native tree:
 * there is no DOM and no stylesheet at runtime.
 */
import { Component, signal } from '@angular/core';
import { Pressable, Text, View } from '@ng-native/components';

@Component({
  selector: 'app-plans',
  imports: [Pressable, Text, View],
  template: `
    <view class="screen">
      <view class="glow"></view>
      <view class="badge"><text class="badge-mark">✦</text></view>
      <text class="title">Go Pro</text>
      <text class="lede">Unlimited projects, instant sync and priority support.</text>

      @for (perk of perks; track perk) {
        <view class="perk">
          <view class="tick"><text>✓</text></view>
          <text class="perk-label">{{ perk }}</text>
        </view>
      }

      @for (plan of plans; track plan.name) {
        <pressable
          class="plan"
          [attr.data-selected]="chosen() === plan.name ? '' : null"
          (press)="chosen.set(plan.name)"
        >
          <view>
            <text class="name">{{ plan.name }}</text>
            <text class="detail">{{ plan.detail }}</text>
          </view>
          <text class="price">{{ plan.price }}</text>
        </pressable>
      }

      <pressable class="cta"><text>Start free trial</text></pressable>

      <view class="quote">
        <text class="stars">★★★★★</text>
        <text class="quote-text"
          >“We shipped our app in a month, in the Angular we already knew.”</text
        >
        <text class="quote-by">Grace, CTO at Northwind</text>
      </view>
      <text class="footer">Restore purchase · Terms · Privacy</text>
    </view>
  `,
  styles: `
    :host {
      --accent: #ff3d6e;
      --accent-2: #8b5cf6;
      --radius: 20px;
      flex: 1;
    }
    .screen {
      flex: 1;
      padding: 76px 22px 24px;
      background-color: #ffffff;
    }
    .glow {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 420px;
      background-image:
        radial-gradient(circle at 20% 0%, rgba(139, 92, 246, 0.35), transparent 60%),
        radial-gradient(circle at 90% 10%, rgba(255, 61, 110, 0.28), transparent 55%);
    }
    .badge {
      width: 64px;
      height: 64px;
      align-items: center;
      justify-content: center;
      border-radius: 20px;
      background-image: linear-gradient(135deg, var(--accent), var(--accent-2));
      box-shadow: 0 12px 30px rgba(255, 61, 110, 0.45);
    }
    .badge text {
      font-size: 28px;
      color: #ffffff;
    }
    .title {
      margin-top: 22px;
      font-size: 40px;
      font-weight: 800;
      letter-spacing: -1px;
      color: #0b0b12;
    }
    .lede {
      margin: 6px 0 18px;
      font-size: 16px;
      line-height: 22px;
      color: #6b6b7b;
    }
    .perk {
      flex-direction: row;
      align-items: center;
      gap: 12px;
      margin-bottom: 12px;
    }
    .tick {
      width: 24px;
      height: 24px;
      align-items: center;
      justify-content: center;
      border-radius: 12px;
      background-color: rgba(139, 92, 246, 0.14);
    }
    .tick text {
      font-size: 13px;
      font-weight: 700;
      color: var(--accent-2);
    }
    .perk-label {
      font-size: 15px;
      color: #2a2a36;
    }
    .plan {
      flex-direction: row;
      align-items: center;
      justify-content: space-between;
      margin-top: 12px;
      padding: 18px;
      border-width: 1.5px;
      border-color: #e8e8ef;
      border-radius: var(--radius);
      background-color: #ffffff;
      transition: transform 150ms;
    }
    /* excerpt: css */
    .plan:active {
      transform: scale(0.97);
    }
    .plan[data-selected] {
      border-color: var(--accent);
      background-image: linear-gradient(135deg, rgba(255, 61, 110, 0.08), rgba(139, 92, 246, 0.08));
      box-shadow: 0 10px 28px rgba(255, 61, 110, 0.22);
    }
    .plan[data-selected] .name {
      color: var(--accent);
    }
    /* excerpt end */
    .name {
      font-size: 17px;
      font-weight: 700;
      color: #0b0b12;
    }
    .detail {
      margin-top: 2px;
      font-size: 13px;
      color: #8a8a99;
    }
    .price {
      font-size: 17px;
      font-weight: 700;
      color: #0b0b12;
    }
    .cta {
      margin-top: 22px;
      padding: 18px;
      align-items: center;
      border-radius: 18px;
      background-image: linear-gradient(90deg, var(--accent), var(--accent-2));
      box-shadow: 0 14px 30px rgba(139, 92, 246, 0.4);
    }
    .cta text {
      font-size: 17px;
      font-weight: 700;
      color: #ffffff;
    }
    .quote {
      margin-top: 20px;
      padding: 16px 18px;
      border-radius: var(--radius);
      background-color: rgba(139, 92, 246, 0.08);
    }
    .stars {
      font-size: 13px;
      letter-spacing: 2px;
      color: #f5b301;
    }
    .quote-text {
      margin-top: 6px;
      font-size: 15px;
      line-height: 21px;
      font-style: italic;
      color: #2a2a36;
    }
    .quote-by {
      margin-top: 6px;
      font-size: 13px;
      color: #8a8a99;
    }
    .footer {
      margin-top: 18px;
      text-align: center;
      font-size: 12px;
      color: #8a8a99;
    }
    @media (prefers-color-scheme: dark) {
      .screen {
        background-color: #0a0a12;
      }
      .title,
      .name,
      .price {
        color: #ffffff;
      }
      .lede,
      .detail {
        color: #9a9aad;
      }
      .perk-label,
      .quote-text {
        color: #d8d8e4;
      }
      .quote {
        background-color: rgba(139, 92, 246, 0.14);
      }
      .plan {
        border-color: #23232f;
        background-color: #13131d;
      }
    }
  `,
})
export default class Plans {
  protected readonly perks = ['Unlimited projects', 'Sync across every device', 'Priority support'];
  protected readonly plans = [
    { name: 'Monthly', detail: 'Cancel anytime', price: '£9.99' },
    { name: 'Yearly', detail: 'Save 40% · £5.99 a month', price: '£71.88' },
  ];
  protected readonly chosen = signal('Yearly');
}
