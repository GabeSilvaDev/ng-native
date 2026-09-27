import { Component, signal } from '@angular/core';
import { interpolate, withRepeat, withTiming } from 'react-native-reanimated';
import { Pressable, ScrollView, Text, View } from '@ng-native/components';
import {
  WorkletScroll,
  WorkletStyle,
  sharedValue,
  workletScroll,
  workletStyle,
  type WorkletScrollSpec,
  type WorkletStyleSpec,
} from '@ng-native/components/reanimated';
import { NativeHeader } from '@ng-native/router';
import { page } from '../screen-styles.ts';

/**
 * A style computed on the UI thread, on a second JavaScript runtime.
 *
 * The check is the same one the animation page uses for the native driver, and harder: this is not
 * an animation React Native can describe, it is our own function running per frame. The counter is
 * what proves where it runs - it is incremented inside the worklet, so 120 of them across two
 * seconds of a blocked JavaScript thread is 60fps on the other side.
 *
 * The block is deliberately its own task. A press commits, and Reanimated stops committing its own
 * values from the moment a commit starts until that tree has mounted
 * (`UpdatesRegistryManager::pauseReanimatedCommits`) - mounting is delivered at the end of the
 * JavaScript task, so blocking inside the same task holds up the frame that would have shown the
 * animation moving. The worklet keeps running at 60fps and nothing on screen moves, which reads
 * as a bug and is not one.
 */
@Component({
  selector: 'x-worklets',
  imports: [NativeHeader, Pressable, ScrollView, Text, View, WorkletScroll, WorkletStyle],
  template: `
    <native-header title="Worklets" backTitle="Back" />
    <view [style]="banner" [workletStyle]="collapse">
      <text class="button-label">scroll me</text>
    </view>
    <scroll-view
      class="screen"
      [contentContainerStyle]="page.content"
      [workletScroll]="onScroll"
      [scrollEventThrottle]="16"
    >
      <text class="hint">
        The box below is moved by a worklet: a function of ours running on the UI thread's own
        runtime, not an animation React Native was told to run.
      </text>

      <view [style]="track">
        <view [style]="box" [workletStyle]="slide"><text [style]="label">worklet</text></view>
      </view>

      <pressable class="button" (press)="run()">
        <text class="button-label">run</text>
      </pressable>

      <pressable class="card" (press)="block()">
        <text class="button-label">block the JS thread for 2s</text>
        <text class="hint">{{ status() }}</text>
      </pressable>

      <text class="hint">
        Scroll: the banner above collapses from a worklet reading the scroll offset. Block the
        thread and scroll - it keeps up, because none of it is here.
      </text>
      @for (row of filler; track row) {
        <view [style]="fillerRow"
          ><text class="hint">row {{ row }}</text></view
        >
      }
    </scroll-view>
  `,
})
export class WorkletsPage {
  protected readonly page = page;
  protected readonly status = signal('a busy loop, no timers');

  protected readonly track = { height: 64, justifyContent: 'center' };
  protected readonly box = {
    width: 72,
    height: 48,
    borderRadius: 10,
    backgroundColor: '#0a84ff',
    alignItems: 'center',
    justifyContent: 'center',
  };
  protected readonly label = { color: 'white', fontSize: 12 };

  protected readonly filler = Array.from({ length: 24 }, (_, i) => i);
  protected readonly fillerRow = { paddingVertical: 10 };

  protected readonly banner = {
    height: 90,
    // Deliberately not the header's blue: on Android the navigation bar is that colour, and a
    // screenshot cannot tell the two apart.
    backgroundColor: '#30d158',
    alignItems: 'center',
    justifyContent: 'center',
  };

  /** Where the scroll view is, written by a worklet and read by another. */
  private readonly scrolled = sharedValue(0);
  protected readonly onScroll: WorkletScrollSpec;
  protected readonly collapse: WorkletStyleSpec;

  private readonly offset = sharedValue(0);
  /** Incremented inside the worklet, so it counts frames on the UI runtime rather than here. */
  private readonly frames = sharedValue(0);

  protected readonly slide: WorkletStyleSpec;

  constructor() {
    // `frames` is captured rather than passed, which is the difference between a value the style
    // is computed *from* and one it writes: the worklet re-runs when a value it was given
    // changes, so counting into an input of its own would be a loop. The local is what keeps
    // `this` - and with it the whole component - out of the worklet's closure.
    // Scroll on the UI thread: native reports the offset there, this worklet stores it there, and
    // the banner's style worklet reads it there. Nothing about it reaches the JavaScript thread,
    // which is what the block button below makes visible.
    const scrolled = this.scrolled;
    this.onScroll = workletScroll([scrolled], (event, into) => {
      'worklet';
      into.value = event.contentOffset.y;
    });
    this.collapse = workletStyle([scrolled], (at) => {
      'worklet';
      const shrink = interpolate(at.value, [0, 120], [1, 0.35], 'clamp');
      return { opacity: shrink, transform: [{ scaleY: shrink }] };
    });

    const frames = this.frames;
    this.slide = workletStyle([this.offset], (offset) => {
      'worklet';
      frames.value = frames.value + 1;
      return { transform: [{ translateX: offset.value }] };
    });
  }

  protected run(): void {
    this.offset.value = withRepeat(withTiming(200, { duration: 800 }), -1, true);
  }

  protected block(): void {
    setTimeout(() => {
      const before = this.frames.value;
      const until = Date.now() + 2000;
      while (Date.now() < until) {
        /* a busy loop, no timers */
      }
      this.status.set(`${this.frames.value - before} worklet frames while it was blocked`);
    }, 400);
  }
}
