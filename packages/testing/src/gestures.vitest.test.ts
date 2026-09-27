/**
 * A root component wrapped in `<gesture-root>`, as the gestures page sets an app up, tested the
 * way the template's own test is. The gesture entry points reach React Native source Node cannot
 * load; `ngNative()` resolves them to stand-ins, so this imports exactly what an app does.
 */
import { describe, expect, it } from 'vitest';
import { Component, signal } from '@angular/core';
import { Gesture } from 'react-native-gesture-handler';
import { Pressable, Text, View } from '@ng-native/components';
import { GestureRoot, NativeGesture } from '@ng-native/components/gestures';
import { gestureOf, render, screen, userEvent } from '@ng-native/testing';

@Component({
  selector: 'app-root',
  imports: [GestureRoot, NativeGesture, Pressable, Text, View],
  template: `
    <gesture-root>
      <view testID="card" [gesture]="pan">
        <text>{{ count() }}</text>
        <pressable accessibilityRole="button" (press)="count.set(count() + 1)">
          <text>Tap</text>
        </pressable>
      </view>
    </gesture-root>
  `,
})
class App {
  protected readonly count = signal(0);
  readonly moved = signal(0);
  protected readonly pan = Gesture.Pan()
    .minDistance(4)
    .onUpdate(() => this.moved.set(this.moved() + 1));
}

describe('an app wrapped in a gesture root', () => {
  it('renders and takes presses under Vitest', async () => {
    await render(App);
    await userEvent.press(screen.getByRole('button'));
    expect(screen.getByText('1')).toBeTruthy();
  });

  it('keeps the gesture view from being collapsed, and the callbacks callable', async () => {
    const { instance } = await render(App);
    expect(screen.getByTestId('card').props['collapsable']).toBe(false);
    const pan = (instance as unknown as { pan: { callbacks: Record<string, () => void> } }).pan;
    pan.callbacks['onUpdate']!();
    expect(instance.moved()).toBe(1);
  });
});

@Component({
  selector: 'app-swipe',
  imports: [NativeGesture, Text, View],
  template: '<view testID="row" [gesture]="both"><text>{{ log().join(" ") }}</text></view>',
})
class Swipe {
  readonly log = signal<string[]>([]);
  protected readonly both;

  constructor() {
    const log = this.log;
    const pan = Gesture.Pan().onEnd(() => log.update((l) => [...l, 'swiped']));
    const tap = Gesture.Tap().onEnd(() => log.update((l) => [...l, 'tapped']));
    this.both = Gesture.Race(pan, Gesture.Exclusive(Gesture.LongPress(), tap));
  }
}

describe('the gesture on a view', () => {
  it('is found from the view, and the one of a kind inside a composed gesture', async () => {
    const { instance } = await render(Swipe);
    const row = screen.getByTestId('row');
    gestureOf(row, 'Pan').callbacks['onEnd']!();
    gestureOf(row, 'Tap').callbacks['onEnd']!();
    expect(instance.log()).toEqual(['swiped', 'tapped']);
    expect(gestureOf(row).kind).toBe('Race');
  });

  it('says so when the view has none, or none of that kind', async () => {
    await render(Swipe);
    expect(() => gestureOf(screen.getByTestId('row'), 'Pinch')).toThrow(/no Pinch gesture/);
    expect(() => gestureOf(screen.getByText(''))).toThrow(/no gesture attached/);
  });
});
