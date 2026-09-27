import { Component, computed, input, output } from '@angular/core';
import { NgIcon } from '@ng-native/icons';
import { Pressable, Text, View } from '@ng-native/components';
import type { Habit } from '../data/habits.ts';

/**
 * One habit on the Today screen: a checkbox, its name and streak, done two ways - a tap on the
 * checkbox, or a long press anywhere on the row.
 */
@Component({
  selector: 'app-habit-row',
  imports: [NgIcon, Pressable, Text, View],
  template: `
    <view class="row">
      <pressable
        class="checkbox"
        accessibilityRole="checkbox"
        [accessibilityLabel]="habit().name"
        [accessibilityState]="{ checked: done() }"
        [attr.data-done]="done() ? '' : null"
        [style.border-color]="habit().colour"
        [style.background-color]="done() ? habit().colour : 'transparent'"
        (press)="toggle.emit()"
        (longPress)="toggle.emit()"
      >
        @if (done()) {
          <ng-icon class="mark" name="lucideCheck" size="18" color="#ffffff" />
        }
      </pressable>

      <pressable
        class="body"
        accessibilityRole="button"
        [accessibilityLabel]="habit().name"
        (press)="open.emit()"
        (longPress)="toggle.emit()"
      >
        <text class="name" [class]="done() ? 'done' : ''">{{ habit().name }}</text>
        @if (streak() > 0) {
          <view class="streak">
            <ng-icon name="lucideFlame" size="13" color="#f97316" />
            <text class="streak-label">{{ streakLabel() }}</text>
          </view>
        } @else {
          <text class="streak-label muted">Not started yet</text>
        }
      </pressable>
    </view>
  `,
  styleUrl: './habit-row.css',
})
export class HabitRow {
  readonly habit = input.required<Habit>();
  readonly done = input.required<boolean>();
  readonly streak = input.required<number>();

  readonly toggle = output<void>();
  readonly open = output<void>();

  protected readonly streakLabel = computed(() => {
    const days = this.streak();
    return `${days} day${days === 1 ? '' : 's'}`;
  });
}
