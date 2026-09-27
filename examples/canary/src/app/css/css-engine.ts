import { Component, signal } from '@angular/core';
import { Pressable, ScrollView, Text, View } from '@ng-native/components';
import { NativeHeader } from '@ng-native/router';
import { Example, Section } from '../example.ts';
import { page } from '../screen-styles.ts';

/**
 * The parts of CSS that are not selectors: units, custom properties, media queries, transitions
 * and keyframes.
 *
 * There is no CSS parser on the device. Every rule here was compiled by the Metro transform into
 * the flat style objects Fabric commits, and what could not be worked out at build time - a
 * `var()`, a viewport unit, an `em` - travels as a reference and is resolved when a node matches.
 * That is why the engine can do a media query without a browser and why it drops anything it
 * cannot finish with a build warning rather than shipping a style that does nothing.
 */
@Component({
  selector: 'x-css-engine',
  imports: [Example, NativeHeader, Pressable, ScrollView, Section, Text, View],
  template: `
    <native-header title="CSS engine" />
    <scroll-view class="screen" [contentContainerStyle]="page.content">
      <text class="hint">
        Compiled at build time, resolved at match time. No parser ships to the device.
      </text>

      <x-section title="Units">
        <x-example
          title="px and rem"
          note="rem is 16px, the web default. Native has no root font size to read, so one is
                chosen rather than guessed at."
          code="width: 64px | 4rem"
        >
          <view class="u-px"></view>
          <view class="u-rem"></view>
        </x-example>
        <x-example
          title="Percentages"
          note="Resolved during native layout against the parent, not at build time."
          code="width: 40%"
        >
          <view class="u-pct"></view>
        </x-example>
        <x-example
          title="Viewport units"
          note="vw and vh are the window, and they follow it: rotate the simulator and these
                change without anything re-rendering."
          code="width: 50vw; height: 4vh"
        >
          <view class="u-vw"></view>
        </x-example>
        <x-example
          title="em, against the font size in scope"
          note="The inner box is 2em of the text around it, so it grows with the paragraph rather
                than with the root."
          code="width: 2em"
        >
          <view class="em-host">
            <text class="em-text">18px text</text>
            <view class="em-box"></view>
          </view>
          <view class="em-host em-large">
            <text class="em-text">28px text</text>
            <view class="em-box"></view>
          </view>
        </x-example>
      </x-section>

      <x-section title="Custom properties">
        <x-example
          title="A token, and a rule that beats it"
          note="Both boxes read --brand. The second also carries a more specific rule, which has
                to win - a token is resolved late, and late is not the same as important."
          code=":root { --brand: ... }  and  .tinted.override { ... }"
        >
          <view class="tinted"></view>
          <view class="tinted override"></view>
        </x-example>
        <x-example
          title="Arithmetic around one"
          note="calc() and max() over a token are folded at build time into a scale, an offset and
                a floor, so the device never sees an expression."
          code="width: calc(var(--gap) * 8); height: max(var(--gap), 20px)"
        >
          <view class="computed"></view>
        </x-example>
      </x-section>

      <x-section title="Media queries">
        <x-example
          title="prefers-color-scheme"
          note="Switch the simulator between light and dark: this repaints with no code involved,
                because the engine re-resolves the cascade when the condition changes."
          code="@media (prefers-color-scheme: dark) { ... }"
        >
          <view class="scheme"><text class="scheme-label">light or dark</text></view>
        </x-example>
        <x-example
          title="width"
          note="Rotate the device. The engine keeps the conditions in step through
                watchConditions, which an app calls once next to mount."
          code="@media (min-width: 500px) { ... }"
        >
          <view class="wide"><text class="wide-label">narrow or wide</text></view>
        </x-example>
      </x-section>

      <x-section title="Motion">
        <x-example
          title="transition"
          note="The property is eased on the JS thread and committed per frame. Tap to move it;
                tap again mid-flight and it carries on from where it had got to rather than
                snapping back."
          code="transition: transform 400ms ease-in-out"
        >
          <view class="track">
            <view class="slider" [class.slider-end]="moved()"></view>
          </view>
          <pressable class="button" (press)="moved.set(!moved())">
            <text class="button-label">Move it</text>
          </pressable>
        </x-example>
        <x-example
          title="@keyframes"
          note="A named animation, running on repeat. Compiled to the same commits a transition
                makes, so nothing here is a native animation driver."
          code="animation: pulse 1.2s ease-in-out infinite"
        >
          <view class="pulse"></view>
        </x-example>
      </x-section>

      <x-section title="Inheritance">
        <x-example
          title="What crosses a boundary and what does not"
          note="Colour and font size inherit down through views to the text inside them; a border
                does not, because native has no notion of inheriting one."
          code="the outer view sets color and fontSize"
        >
          <view class="inherits">
            <text>inherited from the view above</text>
            <view><text>and through another view</text></view>
          </view>
        </x-example>
      </x-section>
    </scroll-view>
  `,
  styles: `
    .u-px {
      width: 64px;
      height: 22px;
      border-radius: 6px;
      background-color: rgb(59, 110, 245);
    }
    .u-rem {
      width: 4rem;
      height: 22px;
      border-radius: 6px;
      background-color: rgb(47, 191, 159);
    }
    .u-pct {
      width: 40%;
      height: 22px;
      border-radius: 6px;
      background-color: rgb(200, 60, 160);
    }
    .u-vw {
      width: 50vw;
      height: 4vh;
      border-radius: 6px;
      background-color: rgb(59, 110, 245);
    }

    .em-host {
      font-size: 18px;
      gap: 6px;
      padding-bottom: 8px;
    }
    .em-large {
      font-size: 28px;
    }
    .em-text {
      color: var(--text);
      font-size: 1em;
    }
    .em-box {
      width: 2em;
      height: 12px;
      border-radius: 4px;
      background-color: rgb(47, 191, 159);
    }

    .tinted {
      height: 26px;
      border-radius: 6px;
      background-color: var(--accent);
    }
    .override {
      background-color: rgb(200, 60, 160);
    }
    .computed {
      width: calc(var(--gap) * 8);
      height: max(var(--gap), 20px);
      border-radius: 6px;
      background-color: rgb(59, 110, 245);
    }

    .scheme {
      padding: 12px;
      border-radius: 8px;
      background-color: rgb(255, 226, 150);
    }
    .scheme-label {
      color: rgb(20, 20, 26);
    }
    @media (prefers-color-scheme: dark) {
      .scheme {
        background-color: rgb(50, 50, 62);
      }
      .scheme-label {
        color: rgb(240, 240, 245);
      }
    }

    .wide {
      padding: 12px;
      border-radius: 8px;
      background-color: rgb(90, 60, 140);
    }
    .wide-label {
      color: rgb(255, 255, 255);
    }
    @media (min-width: 500px) {
      .wide {
        background-color: rgb(47, 191, 159);
      }
    }

    .track {
      height: 44px;
      justify-content: center;
    }
    .slider {
      width: 40px;
      height: 40px;
      border-radius: 8px;
      background-color: rgb(59, 110, 245);
      transition: transform 400ms ease-in-out;
    }
    .slider-end {
      transform: translateX(180px);
    }

    .pulse {
      width: 40px;
      height: 40px;
      border-radius: 20px;
      background-color: rgb(200, 60, 160);
      animation: pulse 1.2s ease-in-out infinite;
    }
    @keyframes pulse {
      0% {
        opacity: 0.25;
        transform: scale(0.8);
      }
      50% {
        opacity: 1;
        transform: scale(1.15);
      }
      100% {
        opacity: 0.25;
        transform: scale(0.8);
      }
    }

    .inherits {
      color: var(--accent);
      font-size: 17px;
      gap: 4px;
      border-left-width: 3px;
      border-left-color: rgb(59, 110, 245);
      padding-left: 10px;
    }
  `,
})
export class CssEnginePage {
  protected readonly page = page;
  protected readonly moved = signal(false);
}
