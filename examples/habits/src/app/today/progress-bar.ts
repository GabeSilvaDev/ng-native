import { Component, computed, input } from '@angular/core';
import { Text, View } from '@ng-native/components';

/** The day's progress: a rounded track with an animated fill, and how many of how many. */
@Component({
  selector: 'app-progress-bar',
  imports: [Text, View],
  template: `
    <view class="header">
      <text class="label">Today</text>
      <text class="count">{{ done() }} of {{ total() }}</text>
    </view>
    <view class="track">
      <view class="fill" [style.width.%]="percent()"></view>
    </view>
  `,
  styleUrl: './progress-bar.css',
})
export class ProgressBar {
  readonly done = input.required<number>();
  readonly total = input.required<number>();

  protected readonly percent = computed(() =>
    this.total() === 0 ? 0 : Math.round((this.done() / this.total()) * 100),
  );
}
