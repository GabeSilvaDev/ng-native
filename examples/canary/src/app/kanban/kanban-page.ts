import { Component, computed, inject, signal } from '@angular/core';
import type { NativeSyntheticEvent } from 'react-native';
import { Pressable, ScrollView, Text, View } from '@ng-native/components';
import { GestureRoot, NativeGesture } from '@ng-native/components/gestures';
import { Gesture } from 'react-native-gesture-handler';
import { FullWindowOverlay, NativeHeader } from '@ng-native/router';
import { KanbanCard, type Hold } from './kanban-card.ts';
import { Board, COLUMNS, TAG_TONES, columnAt, type Card, type ColumnId } from './kanban-model.ts';

/** How the columns sit across the board, which a drop is worked out from. */
const LAYOUT = { inset: 16, width: 290, gap: 14 };

/**
 * A sprint board: columns side by side in a horizontal scroll, cards lifted by a press and hold
 * and dropped on another column, or chosen with a tap and moved from the bar that appears.
 *
 * The theme is written once with `light-dark()`, and every column and tag colour is one bound
 * token the shades are derived from with relative colours, `oklch(from var(--tone) ...)`.
 */
@Component({
  selector: 'x-kanban',
  imports: [
    FullWindowOverlay,
    GestureRoot,
    KanbanCard,
    NativeGesture,
    NativeHeader,
    Pressable,
    ScrollView,
    Text,
    View,
  ],
  template: `
    <native-header title="Sprint 14" [largeTitle]="true" />
    <gesture-root>
      <scroll-view class="page" contentInsetAdjustmentBehavior="automatic">
        <view class="summary">
          <text class="summary-label">Done this sprint</text>
          <text class="summary-value">{{ board.done() }} of {{ board.total() }} points</text>
          <view class="meter">
            <view class="meter-fill" [style.width.%]="progress()"></view>
          </view>
        </view>

        <scroll-view
          class="board"
          [horizontal]="true"
          [showsHorizontalScrollIndicator]="false"
          [scrollEventThrottle]="16"
          [scrollEnabled]="!held()"
          [gesture]="boardGesture"
          [contentContainerStyle]="boardContent"
          (scroll)="scrolled($event)"
        >
          @for (column of board.columns(); track column.id) {
            <view
              class="column"
              [class.target]="over() === column.id && held()?.card?.column !== column.id"
              [style.--tone]="column.tone"
            >
              <view
                class="head"
                [accessible]="true"
                accessibilityRole="header"
                [accessibilityLabel]="column.name + ', ' + column.cards.length + ' cards'"
              >
                <view class="dot"></view>
                <text class="name">{{ column.name }}</text>
                <view class="count"
                  ><text class="count-label">{{ column.cards.length }}</text></view
                >
              </view>
              <view class="rail">
                <view class="rail-fill" [style.width.%]="share(column.points)"></view>
              </view>
              @for (card of column.cards; track card.id) {
                <x-kanban-card
                  class="slot"
                  [card]="card"
                  [chosen]="chosen()?.id === card.id"
                  [lifted]="held()?.card?.id === card.id"
                  [outer]="boardGesture"
                  (tapped)="choose(card)"
                  (lift)="lift(card, $event)"
                  (drag)="follow($event)"
                  (drop)="drop($event)"
                />
              } @empty {
                <view class="empty"><text class="empty-label">Nothing here yet</text></view>
              }
            </view>
          }
        </scroll-view>
      </scroll-view>

      @if (chosen(); as card) {
        <view class="bar" accessibilityRole="toolbar">
          <text class="bar-title" [numberOfLines]="1">Move {{ card.title }}</text>
          <view class="bar-row">
            @for (column of columns; track column.id) {
              @if (column.id !== card.column) {
                <pressable
                  class="move"
                  [style.--tone]="column.tone"
                  accessibilityRole="button"
                  [accessibilityLabel]="'Move to ' + column.name"
                  (press)="moveChosen(column.id)"
                >
                  <text class="move-label">{{ column.name }}</text>
                </pressable>
              }
            }
          </view>
        </view>
      }
    </gesture-root>

    <full-window-overlay>
      @if (held(); as hold) {
        <view
          class="ghost"
          pointerEvents="none"
          [style.left.px]="hold.x - hold.offsetX"
          [style.top.px]="hold.y - hold.offsetY"
          [style.--tag]="tagTone(hold.card)"
        >
          <text class="ghost-title">{{ hold.card.title }}</text>
          <text class="ghost-meta">{{ hold.card.points }} pt, {{ hold.card.owner }}</text>
        </view>
      }
    </full-window-overlay>
  `,
  styles: `
    .page {
      flex: 1;
      background-color: light-dark(oklch(0.97 0.008 265), oklch(0.17 0.02 265));
    }
    .summary {
      margin: 8px 16px 18px;
      padding: 18px;
      border-radius: 22px;
      background-image:
        radial-gradient(circle at 85% 0%, rgba(255, 255, 255, 0.35) 0%, transparent 55%),
        linear-gradient(135deg, oklch(0.55 0.2 265), oklch(0.6 0.2 320));
      box-shadow: 0 16px 28px -14px oklch(0.55 0.2 290 / 0.6);
    }
    .summary-label {
      color: rgba(255, 255, 255, 0.8);
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 1.2px;
      text-transform: uppercase;
    }
    .summary-value {
      margin-top: 4px;
      color: white;
      font-size: 24px;
      font-weight: 800;
      letter-spacing: -0.4px;
      font-variant-numeric: tabular-nums;
    }
    .meter {
      height: 8px;
      margin-top: 12px;
      border-radius: 4px;
      overflow: hidden;
      background-color: rgba(255, 255, 255, 0.25);
    }
    .meter-fill {
      height: 8px;
      border-radius: 4px;
      background-color: white;
      transition: width 300ms ease-out;
    }
    .board {
      flex-grow: 0;
    }
    .column {
      width: 290px;
      margin-right: 14px;
      padding: 12px;
      border-radius: 22px;
      border-width: 1.5px;
      border-color: transparent;
      background-color: light-dark(
        oklch(from var(--tone) 0.95 calc(c * 0.12) h),
        oklch(from var(--tone) 0.23 calc(c * 0.2) h)
      );
      transition:
        background-color 180ms ease-out,
        border-color 180ms ease-out;
    }
    .target {
      border-color: var(--tone);
      background-color: oklch(from var(--tone) l c h / 0.18);
    }
    .head {
      flex-direction: row;
      align-items: center;
      gap: 8px;
      padding: 2px 4px;
    }
    .dot {
      width: 8px;
      height: 8px;
      border-radius: 4px;
      background-color: var(--tone);
      box-shadow: 0 0 0 4px oklch(from var(--tone) l c h / 0.22);
    }
    .name {
      flex: 1;
      color: light-dark(
        oklch(from var(--tone) calc(l - 0.12) c h),
        oklch(from var(--tone) calc(l + 0.22) calc(c * 0.7) h)
      );
      font-size: 15px;
      font-weight: 800;
      letter-spacing: -0.2px;
    }
    .count {
      min-width: 24px;
      padding: 2px 8px;
      border-radius: 999px;
      align-items: center;
      background-color: oklch(from var(--tone) l c h / 0.16);
    }
    .count-label {
      color: light-dark(oklch(from var(--tone) calc(l - 0.1) c h), white);
      font-size: 12px;
      font-weight: 700;
      font-variant-numeric: tabular-nums;
    }
    .rail {
      height: 4px;
      margin: 10px 4px 12px;
      border-radius: 2px;
      overflow: hidden;
      background-color: oklch(from var(--tone) l c h / 0.14);
    }
    .rail-fill {
      height: 4px;
      background-image: linear-gradient(
        90deg,
        var(--tone),
        oklch(from var(--tone) l c calc(h + 50))
      );
      transition: width 240ms ease-out;
    }
    .slot + .slot {
      margin-top: 10px;
    }
    .empty {
      padding: 22px;
      border-radius: 16px;
      border-width: 1.5px;
      border-style: dashed;
      border-color: oklch(from var(--tone) l c h / 0.35);
      align-items: center;
    }
    .empty-label {
      color: oklch(from var(--tone) l c h / 0.8);
      font-size: 13px;
      font-weight: 600;
    }
    .bar {
      position: absolute;
      left: 12px;
      right: 12px;
      bottom: 28px;
      padding: 14px;
      gap: 10px;
      border-radius: 22px;
      background-color: light-dark(rgba(255, 255, 255, 0.96), oklch(0.26 0.02 265 / 0.96));
      box-shadow: 0 18px 36px -14px rgba(15, 23, 42, 0.45);
    }
    .bar-title {
      color: light-dark(oklch(0.25 0.02 265), white);
      font-size: 14px;
      font-weight: 700;
    }
    .bar-row {
      flex-direction: row;
      gap: 8px;
    }
    .move {
      flex: 1;
      padding: 10px 0;
      border-radius: 12px;
      align-items: center;
      background-image: linear-gradient(
        135deg,
        var(--tone),
        oklch(from var(--tone) calc(l - 0.08) c calc(h + 25))
      );
      transition: scale 120ms ease-out;
    }
    .move:active {
      scale: 0.95;
    }
    .move-label {
      color: white;
      font-size: 14px;
      font-weight: 700;
    }
    .ghost {
      position: absolute;
      width: 262px;
      padding: 14px;
      border-radius: 16px;
      border-width: 1.5px;
      border-color: var(--tag);
      background-color: light-dark(white, oklch(0.3 0.02 265));
      box-shadow: 0 28px 44px -16px oklch(from var(--tag) calc(l - 0.2) c h / 0.6);
      rotate: 2.5deg;
      scale: 1.04;
    }
    .ghost-title {
      color: light-dark(oklch(0.22 0.02 265), white);
      font-size: 16px;
      font-weight: 700;
    }
    .ghost-meta {
      margin-top: 6px;
      color: oklch(from var(--tag) l c h);
      font-size: 13px;
      font-weight: 600;
    }
  `,
})
export class KanbanPage {
  protected readonly board = inject(Board);
  protected readonly columns = COLUMNS;
  /** The board's own scrolling, which each card's hold runs beside until it lifts. */
  protected readonly boardGesture = Gesture.Native();
  protected readonly boardContent = { paddingHorizontal: LAYOUT.inset, paddingBottom: 140 };

  protected readonly chosen = signal<Card | null>(null);
  protected readonly held = signal<(Hold & { readonly card: Card }) | null>(null);
  private readonly scrolledBy = signal(0);
  /** The column under the lifted card's finger. */
  protected readonly over = computed(() => {
    const hold = this.held();
    return hold ? columnAt(hold.x, this.scrolledBy(), LAYOUT) : null;
  });
  protected readonly progress = computed(() =>
    this.board.total() ? (this.board.done() / this.board.total()) * 100 : 0,
  );

  protected share(points: number): number {
    return this.board.total() ? (points / this.board.total()) * 100 : 0;
  }

  protected tagTone(card: Card): string {
    return TAG_TONES[card.tag];
  }

  protected scrolled(event: NativeSyntheticEvent<{ contentOffset?: { x?: number } }>): void {
    this.scrolledBy.set(event.nativeEvent?.contentOffset?.x ?? 0);
  }

  protected choose(card: Card): void {
    this.chosen.set(this.chosen()?.id === card.id ? null : card);
  }

  protected moveChosen(to: ColumnId): void {
    const card = this.chosen();
    if (!card) return;
    this.board.move(card.id, to);
    this.chosen.set(null);
  }

  protected lift(card: Card, hold: Hold): void {
    this.chosen.set(null);
    this.held.set({ ...hold, card });
  }

  protected follow(hold: Hold): void {
    const held = this.held();
    if (held) this.held.set({ ...held, x: hold.x, y: hold.y });
  }

  protected drop(hold: Hold): void {
    const held = this.held();
    this.held.set(null);
    const to = held ? columnAt(hold.x, this.scrolledBy(), LAYOUT) : null;
    if (held && to && to !== held.card.column) this.board.move(held.card.id, to);
  }
}
