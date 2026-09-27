import { Component, computed, input } from '@angular/core';
import { provideIcons } from '@ng-icons/core';
import { lucideFootprints } from '@ng-icons/lucide';
import { NgIcon } from '@ng-native/icons';
import { Text, View } from '@ng-native/components';
import type { Run } from '../data/runs.ts';
import {
  convertDistance,
  convertPace,
  formatDistance,
  formatDuration,
  formatPace,
  type DistanceUnit,
} from '../tracking/geo.ts';

/** One past run: its date, distance and pace, in the person's chosen unit. */
@Component({
  selector: 'app-run-row',
  imports: [NgIcon, Text, View],
  providers: [provideIcons({ lucideFootprints })],
  template: `
    <view class="row">
      <view class="badge">
        <ng-icon name="lucideFootprints" size="20" color="#ff5a36" />
      </view>
      <view class="body">
        <text class="date">{{ dateLabel() }}</text>
        <text class="summary">{{ durationLabel() }} · {{ splitsLabel() }}</text>
      </view>
      <view class="stats">
        <text class="distance">{{ distanceLabel() }} {{ unit() }}</text>
        <text class="pace">{{ paceLabel() }} /{{ unit() }}</text>
      </view>
    </view>
  `,
  styleUrl: './run-row.css',
})
export class RunRow {
  readonly run = input.required<Run>();
  readonly unit = input.required<DistanceUnit>();

  protected readonly dateLabel = computed(() =>
    new Date(this.run().startedAt).toLocaleDateString(undefined, {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    }),
  );
  protected readonly durationLabel = computed(() => formatDuration(this.run().durationSeconds));
  protected readonly splitsLabel = computed(() => {
    const count = this.run().splits.length;
    return count === 1 ? '1 split' : `${count} splits`;
  });
  protected readonly distanceLabel = computed(() =>
    formatDistance(convertDistance(this.run().distanceMeters, this.unit())),
  );
  protected readonly paceLabel = computed(() => {
    const run = this.run();
    const pace = run.distanceMeters > 0 ? run.durationSeconds / (run.distanceMeters / 1_000) : 0;
    return formatPace(convertPace(pace, this.unit()));
  });
}
