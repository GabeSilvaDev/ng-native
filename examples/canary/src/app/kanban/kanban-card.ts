import { Component, computed, input, output } from '@angular/core';
import { Gesture, type GestureType } from 'react-native-gesture-handler';
import { Text, View } from '@ng-native/components';
import { NativeGesture } from '@ng-native/components/gestures';
import { TAG_TONES, type Card } from './kanban-model.ts';

/** Where a finger is on screen, and where on the card it took hold. */
export interface Hold {
  readonly x: number;
  readonly y: number;
  readonly offsetX: number;
  readonly offsetY: number;
}

/**
 * One card: tap to choose it, or press and hold to lift it and drag it to another column. The
 * drag runs on the JS thread and reports where the finger is; the board draws the lifted copy.
 * Its tag's colour is a CSS variable the chip and the avatar derive their shades from.
 */
@Component({
  selector: 'x-kanban-card',
  imports: [NativeGesture, Text, View],
  template: `
    <view
      class="ticket"
      [class.chosen]="chosen()"
      [class.lifted]="lifted()"
      [style.--tag]="tone()"
      [gesture]="gesture()"
      accessibilityRole="button"
      [accessibilityLabel]="card().title + ', ' + card().points + ' points, ' + card().owner"
      [accessibilityState]="{ selected: chosen() }"
      [accessibilityActions]="actions"
      (accessibilityAction)="tapped.emit()"
    >
      <view class="top">
        <view class="tag"
          ><text class="tag-label">{{ card().tag }}</text></view
        >
        <text class="points">{{ card().points }} pt</text>
      </view>
      <text class="title">{{ card().title }}</text>
      <view class="foot">
        <view class="avatar"
          ><text class="avatar-initial">{{ card().owner[0] }}</text></view
        >
        <text class="owner">{{ card().owner }}</text>
      </view>
    </view>
  `,
  styles: `
    .ticket {
      padding: 14px;
      border-radius: 16px;
      border-width: 1.5px;
      border-color: transparent;
      background-color: light-dark(white, oklch(0.27 0.02 265));
      box-shadow:
        0 1px 0 light-dark(rgba(15, 23, 42, 0.04), rgba(255, 255, 255, 0.06)) inset,
        0 10px 18px -12px light-dark(rgba(15, 23, 42, 0.4), black);
      transition:
        opacity 160ms ease-out,
        border-color 160ms ease-out;
    }
    .chosen {
      border-color: var(--tone);
    }
    .lifted {
      opacity: 0.3;
    }
    .top {
      flex-direction: row;
      align-items: center;
      justify-content: space-between;
    }
    .tag {
      padding: 3px 9px;
      border-radius: 999px;
      background-color: oklch(from var(--tag) l c h / 0.14);
    }
    .tag-label {
      color: light-dark(
        oklch(from var(--tag) calc(l - 0.1) c h),
        oklch(from var(--tag) calc(l + 0.15) calc(c * 0.8) h)
      );
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.6px;
      text-transform: uppercase;
    }
    .points {
      color: light-dark(oklch(0.55 0.02 265), oklch(0.7 0.02 265));
      font-size: 12px;
      font-weight: 600;
      font-variant-numeric: tabular-nums;
    }
    .title {
      margin-top: 10px;
      color: light-dark(oklch(0.22 0.02 265), oklch(0.95 0.01 265));
      font-size: 16px;
      font-weight: 600;
      letter-spacing: -0.2px;
    }
    .foot {
      flex-direction: row;
      align-items: center;
      gap: 8px;
      margin-top: 12px;
    }
    .avatar {
      width: 24px;
      height: 24px;
      border-radius: 12px;
      align-items: center;
      justify-content: center;
      background-image: linear-gradient(
        135deg,
        oklch(from var(--tag) calc(l + 0.12) c calc(h - 30)),
        var(--tag)
      );
    }
    .avatar-initial {
      color: white;
      font-size: 11px;
      font-weight: 800;
    }
    .owner {
      color: light-dark(oklch(0.5 0.02 265), oklch(0.72 0.02 265));
      font-size: 13px;
    }
  `,
})
export class KanbanCard {
  readonly card = input.required<Card>();
  readonly chosen = input(false);
  readonly lifted = input(false);
  /**
   * The native gesture of the board's scroll view, which scrolls alongside a press that has not
   * yet become a lift: otherwise a swipe that starts on a card would not move the board.
   */
  readonly outer = input<GestureType>();
  readonly tapped = output<void>();
  readonly lift = output<Hold>();
  readonly drag = output<Hold>();
  readonly drop = output<Hold>();

  protected readonly tone = computed(() => TAG_TONES[this.card().tag]);
  /** A screen reader's double tap chooses the card, as a tap does: the tap is a gesture it misses. */
  protected readonly actions = [{ name: 'activate' }];
  protected readonly gesture;

  constructor() {
    // Read through locals: a gesture callback is rewritten into a worklet, which has no `this`,
    // even one that runs on the JS thread.
    const [lift, drag, drop, tapped] = [this.lift, this.drag, this.drop, this.tapped];
    const hold = (event: { absoluteX: number; absoluteY: number; x: number; y: number }): Hold => ({
      x: event.absoluteX,
      y: event.absoluteY,
      offsetX: event.x,
      offsetY: event.y,
    });
    let active = false;
    const pan = Gesture.Pan()
      .runOnJS(true)
      .activateAfterLongPress(250)
      .onStart((event) => {
        active = true;
        lift.emit(hold(event));
      })
      .onUpdate((event) => drag.emit(hold(event)))
      .onEnd((event) => drop.emit(hold(event)))
      .onFinalize(() => {
        active = false;
      });
    const tap = Gesture.Tap()
      .runOnJS(true)
      .onEnd(() => {
        if (!active) tapped.emit();
      });
    this.gesture = computed(() => {
      const outer = this.outer();
      if (!outer) return Gesture.Exclusive(pan, tap);
      return Gesture.Exclusive(
        pan.simultaneousWithExternalGesture(outer),
        tap.simultaneousWithExternalGesture(outer),
      );
    });
  }
}
