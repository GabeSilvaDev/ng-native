import { Component, computed, inject, input } from '@angular/core';
import { provideIcons } from '@ng-icons/core';
import { lucideShare } from '@ng-icons/lucide';
import { NgIcon } from '@ng-native/icons';
import { FileSystem } from '@ng-native/expo/file-system';
import { ColorScheme, Sharing } from '@ng-native/device';
import { Pressable, ScrollView, Text, View } from '@ng-native/components';
import { NativeHeader, NativeHeaderItem } from '@ng-native/router';
import { MapView, type MapMarker, type MapPolyline } from '@ng-native/expo/map-view';
import { Runs, type Run } from '../data/runs.ts';
import { Units } from '../settings/units.ts';
import {
  convertDistance,
  convertPace,
  formatDistance,
  formatDuration,
  formatPace,
} from '../tracking/geo.ts';
import { gpxFileName, toGpx } from '../export/gpx.ts';

const ROUTE_COLOUR = '#ff5a36';

/** One finished run: its route on a map, splits per kilometre (or mile), and a GPX export. */
@Component({
  selector: 'app-run-detail',
  imports: [MapView, NativeHeader, NativeHeaderItem, NgIcon, Pressable, ScrollView, Text, View],
  providers: [provideIcons({ lucideShare })],
  template: `
    <native-header [title]="dateLabel() ?? 'Run'" backTitle="History">
      @if (run(); as run) {
        <native-header-item type="right">
          <pressable
            class="export"
            accessibilityRole="button"
            accessibilityLabel="Export as GPX"
            (press)="exportGpx(run)"
          >
            <ng-icon name="lucideShare" size="19" [color]="onSurfaceColor()" />
          </pressable>
        </native-header-item>
      }
    </native-header>

    @if (run(); as run) {
      <scroll-view class="screen" contentInsetAdjustmentBehavior="automatic">
        <expo-map
          class="map"
          [markers]="markers()"
          [polylines]="polylines()"
          [cameraPosition]="cameraPosition()"
        />

        <view class="summary">
          <view class="stat">
            <text class="stat-value">{{ distanceLabel() }}</text>
            <text class="stat-label">{{ unit() }}</text>
          </view>
          <view class="stat">
            <text class="stat-value">{{ durationLabel() }}</text>
            <text class="stat-label">Time</text>
          </view>
          <view class="stat">
            <text class="stat-value">{{ paceLabel() }}</text>
            <text class="stat-label">Pace /{{ unit() }}</text>
          </view>
        </view>

        @if (run.splits.length > 0) {
          <text class="section-title">Splits</text>
          <view class="splits">
            @for (split of run.splits; track split.index) {
              <view class="split">
                <text class="split-index">{{ split.index }}</text>
                <view class="split-bar-track">
                  <view class="split-bar-fill" [style.width]="splitBarWidth(split) + '%'"></view>
                </view>
                <text class="split-pace">{{ splitPaceLabel(split) }}</text>
              </view>
            }
          </view>
        }
      </scroll-view>
    } @else {
      <view class="screen missing">
        <text>This run no longer exists.</text>
      </view>
    }
  `,
  styleUrl: './run-detail.css',
})
export class RunDetail {
  private readonly runsService = inject(Runs);
  private readonly units = inject(Units);
  private readonly files = inject(FileSystem);
  private readonly sharing = inject(Sharing);
  private readonly colorScheme = inject(ColorScheme);

  readonly id = input.required<string>();

  protected readonly run = computed(() => this.runsService.find(this.id()));
  protected readonly unit = computed(() => this.units.unit());
  // The header itself follows the scheme automatically (NativeHeader's own defaults); this
  // button is ordinary content inside it, so its icon has to follow the scheme too.
  protected readonly onSurfaceColor = computed(() =>
    this.colorScheme.current() === 'dark' ? '#fafafa' : '#18181b',
  );

  protected readonly dateLabel = computed(() => {
    const run = this.run();
    if (!run) return null;
    return new Date(run.startedAt).toLocaleDateString(undefined, {
      day: 'numeric',
      month: 'short',
    });
  });
  protected readonly distanceLabel = computed(() => {
    const run = this.run();
    return run ? formatDistance(convertDistance(run.distanceMeters, this.unit())) : '';
  });
  protected readonly durationLabel = computed(() => {
    const run = this.run();
    return run ? formatDuration(run.durationSeconds) : '';
  });
  protected readonly paceLabel = computed(() => {
    const run = this.run();
    if (!run) return '';
    const pace = run.distanceMeters > 0 ? run.durationSeconds / (run.distanceMeters / 1_000) : 0;
    return formatPace(convertPace(pace, this.unit()));
  });

  protected readonly polylines = computed<readonly MapPolyline[]>(() => {
    const route = this.run()?.route ?? [];
    return route.length < 2 ? [] : [{ coordinates: route, color: ROUTE_COLOUR, width: 5 }];
  });
  protected readonly markers = computed<readonly MapMarker[]>(() => {
    const route = this.run()?.route ?? [];
    if (route.length === 0) return [];
    const start = route[0]!;
    const finish = route.at(-1)!;
    return [
      { id: 'start', coordinates: start, title: 'Start', tintColor: '#22c55e' },
      { id: 'finish', coordinates: finish, title: 'Finish', tintColor: ROUTE_COLOUR },
    ];
  });
  protected readonly cameraPosition = computed(() => {
    const route = this.run()?.route ?? [];
    return {
      coordinates: route[Math.floor(route.length / 2)] ?? { latitude: 0, longitude: 0 },
      zoom: 14,
    };
  });

  private readonly slowestSplitPace = computed(() =>
    Math.max(1, ...(this.run()?.splits.map((split) => split.paceSecondsPerUnit) ?? [])),
  );

  protected splitPaceLabel(split: Run['splits'][number]): string {
    return formatPace(convertPace(split.paceSecondsPerUnit, this.unit()));
  }

  /** A faster split (lower pace) draws a shorter bar than a slower one, relative to the slowest. */
  protected splitBarWidth(split: Run['splits'][number]): number {
    const slowest = this.slowestSplitPace();
    return slowest > 0 ? Math.max(8, (split.paceSecondsPerUnit / slowest) * 100) : 8;
  }

  protected async exportGpx(run: Run): Promise<void> {
    const file = this.files.cache(gpxFileName(run));
    this.files.write(file, toGpx(run));
    await this.sharing.share({ url: file.uri, title: gpxFileName(run) });
  }
}
