import { Component, computed, inject } from '@angular/core';
import { Pressable, ScrollView, Text, View } from '@ng-native/components';
import { NativeHeader, NativeNavigation, NativeStackOutlet } from '@ng-native/router';
import { Runs } from '../data/runs.ts';
import { Units } from '../settings/units.ts';
import { RunRow } from './run-row.ts';

/** The History tab is a stack of its own, for the native header its large title needs. */
@Component({
  selector: 'app-history-stack',
  imports: [NativeStackOutlet],
  template: `<native-stack-outlet />`,
})
export class HistoryStack {}

/** Every finished run, newest first. Tapping one opens its detail screen. */
@Component({
  selector: 'app-history',
  imports: [NativeHeader, Pressable, RunRow, ScrollView, Text, View],
  template: `
    <native-header title="History" [largeTitle]="true" />
    <scroll-view class="screen" contentInsetAdjustmentBehavior="automatic">
      @if (runs().length === 0) {
        <view class="empty">
          <text class="empty-title">No runs yet</text>
          <text class="empty-body">Finish a run and it will show up here.</text>
        </view>
      } @else {
        <view class="content">
          @for (run of runs(); track run.id) {
            <pressable accessibilityRole="button" (press)="open(run.id)">
              <app-run-row [run]="run" [unit]="unit()" />
            </pressable>
          }
        </view>
      }
    </scroll-view>
  `,
  styleUrl: './history.css',
})
export class History {
  private readonly runsService = inject(Runs);
  private readonly units = inject(Units);
  private readonly navigation = inject(NativeNavigation);

  protected readonly runs = this.runsService.runs;
  protected readonly unit = computed(() => this.units.unit());

  protected open(id: string): void {
    void this.navigation.push(['/runs', id]);
  }
}
