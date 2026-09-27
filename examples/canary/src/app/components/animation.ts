import { Component, signal } from '@angular/core';
import { Animated, Easing } from 'react-native';
import { Pressable, ScrollView, Text, View } from '@ng-native/components';
import { AnimatedStyle } from '@ng-native/components/animations';
import { NativeHeader } from '@ng-native/router';
import { page } from '../screen-styles.ts';

/**
 * A native-driver animation keeps its frame rate with the JavaScript thread
 * blocked, because the whole thing runs on the UI thread once it has started.
 *
 * Both boxes animate the same way. The one on the native driver is untouched by the block; the
 * one on the JavaScript driver stops dead for as long as the loop runs, which is the difference
 * the driver makes made visible.
 */
@Component({
  selector: 'x-animation',
  imports: [AnimatedStyle, NativeHeader, Pressable, ScrollView, Text, View],
  template: `
    <native-header title="Animation" backTitle="Back" />
    <scroll-view class="screen" [contentContainerStyle]="page.content">
      <text class="hint">
        Two identical animations. Start them, then block the JavaScript thread: the native one
        carries on, the JavaScript one freezes.
      </text>

      <view class="track">
        <view [style]="box" [animatedStyle]="nativeStyle"><text [style]="label">native</text></view>
      </view>

      <view class="track">
        <view [style]="boxAlt" [animatedStyle]="jsStyle"><text [style]="label">js</text></view>
      </view>

      <pressable class="button" (press)="run()">
        <text class="button-label">run both</text>
      </pressable>

      <pressable class="card" (press)="block()">
        <text class="button-label">block the JS thread for 2s</text>
        <text class="hint">{{ blocked() ? 'blocking...' : 'a busy loop, no timers' }}</text>
      </pressable>

      <text class="hint">
        Below is a CSS transition instead: no animated values, no directive. The class toggles and
        the engine eases the properties that changed, because the stylesheet said to.
      </text>

      <view class="swatches">
        <view class="swatch" [class.on]="lit()"></view>
        <view class="swatch wide" [class.on]="lit()"></view>
      </view>

      <pressable class="card" (press)="lit.set(!lit())">
        <text class="button-label">toggle the class</text>
        <text class="hint">colour, opacity and width, all from CSS</text>
      </pressable>

      <text class="hint">
        And Angular's own instructions. The row leaves on a transition, held in the tree until it
        finishes, and arrives on a @keyframes animation, which plays from its own frames however
        late the class lands.
      </text>

      @if (row()) {
        <view class="leaver" animate.enter="arriving" animate.leave="leaving">
          <text class="button-label">animate.enter and animate.leave</text>
        </view>
      }

      <pressable class="card" (press)="row.set(!row())">
        <text class="button-label">{{ row() ? 'remove the row' : 'bring it back' }}</text>
      </pressable>
    </scroll-view>
  `,
  styles: `
    .track {
      height: 64px;
      justify-content: center;
      background-color: var(--card-inset);
      border-radius: 12px;
    }

    .swatches {
      flex-direction: row;
      gap: 12px;
      align-items: center;
    }

    .swatch {
      width: 80px;
      height: 60px;
      border-radius: 12px;
      background-color: rgb(59, 110, 245);
      opacity: 1;
      transition:
        background-color 500ms ease-in-out,
        opacity 500ms linear;
    }

    /* A second one whose width transitions too, to show layout easing rather than just paint. */
    .swatch.wide {
      transition: all 500ms ease-out;
    }

    .swatch.on {
      background-color: rgb(240, 90, 60);
      opacity: 0.35;
    }

    .swatch.wide.on {
      width: 160px;
    }

    .leaver {
      padding: 16px;
      border-radius: 10px;
      align-items: center;
      background-color: var(--card);
      opacity: 1;
      transition: opacity 450ms ease-in;
    }

    /* animate.leave holds the element in the tree until this transition ends. */
    .leaver.leaving {
      opacity: 0;
    }

    @keyframes arrive {
      from {
        opacity: 0;
        transform: translateY(16px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    /*
     * animate.enter needs an animation, not a transition: Angular adds the enter class after the
     * element has already committed once, so a transition would have nothing to move from, while
     * an animation plays from its own first frame.
     */
    .leaver.arriving {
      animation: arrive 400ms ease-out;
    }
  `,
})
export class AnimationPage {
  protected readonly page = page;

  private readonly nativeX = new Animated.Value(0);
  private readonly jsX = new Animated.Value(0);

  protected readonly nativeStyle = { transform: [{ translateX: this.nativeX }] };
  protected readonly jsStyle = { transform: [{ translateX: this.jsX }] };

  protected readonly blocked = signal(false);
  protected readonly lit = signal(false);
  protected readonly row = signal(true);

  protected readonly box = {
    width: 72,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#3b6ef5',
    alignItems: 'center',
    justifyContent: 'center',
  };
  protected readonly boxAlt = { ...this.box, backgroundColor: '#8a5cf6' };
  protected readonly label = { color: '#ffffff', fontSize: 12, fontWeight: '600' };

  protected run(): void {
    for (const [value, useNativeDriver] of [
      [this.nativeX, true],
      [this.jsX, false],
    ] as const) {
      value.setValue(0);
      Animated.timing(value, {
        toValue: 220,
        duration: 4000,
        easing: Easing.linear,
        useNativeDriver,
      }).start();
    }
  }

  /** A busy loop, not a timer: nothing else on the JavaScript thread can run while it spins. */
  protected block(): void {
    this.blocked.set(true);
    const until = Date.now() + 2000;
    while (Date.now() < until) {
      /* deliberately spinning */
    }
    this.blocked.set(false);
  }
}
