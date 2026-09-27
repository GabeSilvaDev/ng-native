import { Component, computed, inject, input } from '@angular/core';
import { provideIcons } from '@ng-icons/core';
import { lucideFlame, lucidePencil, lucideTrash2 } from '@ng-icons/lucide';
import { NgIcon } from '@ng-native/icons';
import { ColorScheme, Dialogs } from '@ng-native/device';
import { Pressable, ScrollView, Text, View } from '@ng-native/components';
import { NativeHeader, NativeHeaderItem, NativeNavigation } from '@ng-native/router';
import { calendarGrid, Habits } from '../data/habits.ts';

const WEEKS = 10;

/** One habit in full: its streak, ten weeks of history as a grid, and edit/delete. */
@Component({
  selector: 'app-habit-detail',
  imports: [NativeHeader, NativeHeaderItem, NgIcon, Pressable, ScrollView, Text, View],
  providers: [provideIcons({ lucideFlame, lucidePencil, lucideTrash2 })],
  template: `
    <native-header [title]="habit()?.name ?? 'Habit'" backTitle="Today">
      <native-header-item type="right">
        <pressable
          class="header-button"
          accessibilityRole="button"
          accessibilityLabel="Edit habit"
          (press)="edit()"
        >
          <ng-icon name="lucidePencil" size="19" [color]="headerIcon()" />
        </pressable>
      </native-header-item>
    </native-header>

    @if (habit(); as habit) {
      <scroll-view class="screen" contentInsetAdjustmentBehavior="automatic">
        <view class="content">
          <view class="streak-card" [style.background-color]="habit.colour">
            <ng-icon name="lucideFlame" size="28" color="#ffffff" />
            <text class="streak-count">{{ streak() }}</text>
            <text class="streak-label">day{{ streak() === 1 ? '' : 's' }} in a row</text>
          </view>

          <text class="section-title">Last {{ weeks }} weeks</text>
          <view class="grid">
            @for (day of grid(); track day.date) {
              <view
                class="cell"
                [class]="day.today ? 'today' : ''"
                [style.background-color]="day.done ? habit.colour : undefined"
              ></view>
            }
          </view>

          <pressable class="delete" accessibilityRole="button" (press)="remove()">
            <ng-icon name="lucideTrash2" size="16" color="#e11d48" />
            <text class="delete-label">Delete habit</text>
          </pressable>
        </view>
      </scroll-view>
    } @else {
      <view class="screen missing">
        <text class="empty-body">This habit no longer exists.</text>
      </view>
    }
  `,
  styleUrl: './habit-detail.css',
})
export class HabitDetail {
  private readonly habitsService = inject(Habits);
  private readonly dialogs = inject(Dialogs);
  private readonly navigation = inject(NativeNavigation);
  private readonly colorScheme = inject(ColorScheme);

  /** The header button's icon, dark on a light bar and light on a dark one. */
  protected readonly headerIcon = computed(() =>
    this.colorScheme.current() === 'dark' ? '#fafafa' : '#18181b',
  );

  readonly id = input.required<string>();

  protected readonly weeks = WEEKS;
  protected readonly habit = computed(() => this.habitsService.find(this.id()));
  protected readonly streak = computed(() => this.habitsService.streak(this.id()));
  protected readonly grid = computed(() =>
    calendarGrid(this.habitsService.completions(this.id()), this.weeks),
  );

  protected edit(): void {
    void this.navigation.present(['/habit', this.id(), 'edit']);
  }

  protected async remove(): Promise<void> {
    const sure = await this.dialogs.confirm(`Delete "${this.habit()?.name}"?`, {
      destructive: true,
    });
    if (!sure) return;
    this.habitsService.remove(this.id());
    this.navigation.back();
  }
}
