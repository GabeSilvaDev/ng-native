import { Component, signal } from '@angular/core';
import { Gesture } from 'react-native-gesture-handler';
import { ScrollView, Text, View } from '@ng-native/components';
import { GestureRoot, NativeGesture } from '@ng-native/components/gestures';
import {
  WorkletStyle,
  sharedValue,
  workletStyle,
  type WorkletStyleSpec,
} from '@ng-native/components/reanimated';
import { NativeHeader } from '@ng-native/router';
import { page } from '../screen-styles.ts';

/**
 * Native gesture recognition, with the gesture and the style it drives both on the UI thread.
 *
 * The box is dragged by a `Gesture.Pan()` whose callbacks are worklets, so nothing about the drag
 * touches the JavaScript thread: the recogniser is a platform one, the callback runs on the UI
 * runtime, and the style it writes is applied there too. Blocking the JavaScript thread and
 * dragging is the whole demonstration.
 *
 * The tap below it is the other path. Its callback is a plain function, so the library attaches it
 * as a JavaScript-function gesture and calls it here, which is how a gesture reaches a signal.
 */
@Component({
  selector: 'x-native-gestures',
  imports: [GestureRoot, NativeGesture, NativeHeader, ScrollView, Text, View, WorkletStyle],
  template: `
    <native-header title="Native gestures" backTitle="Back" />
    <gesture-root>
      <scroll-view class="screen" [contentContainerStyle]="page.content">
        <text class="hint">
          Drag the box. The pan is recognised by the platform and its callback is a worklet, so the
          drag never reaches the JavaScript thread - press hold, then drag while it is blocked.
        </text>

        <view class="field-area">
          <view [style]="box" [gesture]="pan" [workletStyle]="drag">
            <text [style]="label">drag me</text>
          </view>
          <view [style]="smallBox" [gesture]="manual" [workletStyle]="nudge">
            <text [style]="label">touches</text>
          </view>
        </view>

        <view class="card" [gesture]="hold">
          <text class="button-label">block the JS thread for 2s</text>
          <text class="hint">{{ status() }}</text>
        </view>

        <view class="card" [gesture]="tap">
          <text class="button-label">tap me</text>
          <text class="hint"> a plain callback, on the JavaScript thread. Taps: {{ taps() }} </text>
        </view>
      </scroll-view>
    </gesture-root>
  `,
  styles: `
    .field-area {
      height: 220px;
      border-radius: 12px;
      background-color: var(--card-inset);
      align-items: center;
      justify-content: center;
    }
  `,
})
export class NativeGesturesPage {
  protected readonly page = page;
  protected readonly taps = signal(0);
  protected readonly status = signal('a busy loop, no timers');

  protected readonly box = {
    width: 96,
    height: 96,
    borderRadius: 16,
    backgroundColor: '#0a84ff',
    alignItems: 'center',
    justifyContent: 'center',
  };
  protected readonly label = { color: 'white', fontSize: 13 };
  protected readonly smallBox = {
    marginTop: 12,
    width: 140,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#30d158',
    alignItems: 'center',
    justifyContent: 'center',
  };

  private readonly x = sharedValue(0);
  private readonly y = sharedValue(0);
  private readonly held = sharedValue(0);
  private readonly origin = sharedValue(0);

  protected readonly drag: WorkletStyleSpec;
  protected readonly nudge: WorkletStyleSpec;
  protected readonly pan;
  protected readonly manual;
  protected readonly tap;
  protected readonly hold;

  constructor() {
    const [x, y] = [this.x, this.y];
    this.drag = workletStyle([x, y], (dx, dy) => {
      'worklet';
      return { transform: [{ translateX: dx.value }, { translateY: dy.value }] };
    });
    // `onChange` rather than `onUpdate`: the deltas accumulate, so a second drag carries on from
    // where the first left off instead of jumping back to the origin.
    // The signals are read through locals for the same reason the shared values are: the Babel
    // plugin rewrites a gesture callback into a worklet whether or not it will run on the UI
    // thread, and a rewritten callback has no `this`. `runOnJS(true)` decides where it runs, not
    // what it may close over.
    const [taps, status] = [this.taps, this.status];
    this.tap = Gesture.Tap()
      .runOnJS(true)
      .onEnd(() => taps.update((n) => n + 1));
    this.hold = Gesture.Tap()
      .runOnJS(true)
      .onEnd(() => {
        const until = Date.now() + 2000;
        while (Date.now() < until) {
          /* a busy loop, no timers */
        }
        status.set('the box kept up, because it was never here');
      });
    // A gesture with no recogniser of its own: the touch callbacks decide, and the state manager
    // they are handed is how a worklet accepts the gesture. Nothing else can express "activate on
    // the first touch, follow it, and end when it lifts".
    const [held, origin] = [this.held, this.origin];
    this.nudge = workletStyle([held], (offset) => {
      'worklet';
      return { transform: [{ translateX: offset.value }] };
    });
    this.manual = Gesture.Manual()
      .onTouchesDown((event, manager) => {
        'worklet';
        origin.value = event.allTouches[0]!.absoluteX - held.value;
        manager.activate();
      })
      .onTouchesMove((event) => {
        'worklet';
        held.value = event.allTouches[0]!.absoluteX - origin.value;
      })
      .onTouchesUp((_event, manager) => {
        'worklet';
        manager.end();
      });
    this.pan = Gesture.Pan().onChange((event) => {
      'worklet';
      x.value = x.value + event.changeX;
      y.value = y.value + event.changeY;
    });
  }
}
