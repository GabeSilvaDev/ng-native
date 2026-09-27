/**
 * Pressables configured the less usual ways: a numeric retention offset, one-sided hit slop, an
 * Android ripple in front and behind, and a press-in delay. Read by `press-tolerance.test.ts`.
 */
import { Component } from '@angular/core';
import { Pressable } from '../../components/src/pressable.ts';
import { Text } from '../../components/src/text.ts';

@Component({
  selector: 'x-press-options',
  imports: [Pressable, Text],
  template: `
    <pressable nativeID="wide" [pressRetentionOffset]="100" (press)="count('wide')"
      ><text>wide</text></pressable
    >
    <pressable nativeID="left" [hitSlop]="{ left: 50 }" (press)="count('left')"
      ><text>left</text></pressable
    >
    <pressable nativeID="below" [hitSlop]="{ bottom: 50 }" (press)="count('below')"
      ><text>below</text></pressable
    >
    <pressable nativeID="front" [android_ripple]="{ color: 'red', foreground: true }"
      ><text>front</text></pressable
    >
    <pressable nativeID="behind" [android_ripple]="{ color: 'red' }"><text>behind</text></pressable>
    <pressable
      nativeID="slow"
      [delayPressIn]="100"
      (pressIn)="count('slowIn')"
      (longPress)="count('slowLong')"
      ><text>slow</text></pressable
    >
  `,
})
export class PressOptions {
  readonly counts: Record<string, number> = {};
  protected count(name: string): void {
    this.counts[name] = (this.counts[name] ?? 0) + 1;
  }
}
