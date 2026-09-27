import { Component, DestroyRef, computed, effect, inject, viewChild } from '@angular/core';
import { provideIcons } from '@ng-icons/core';
import { lucidePause, lucidePlay, lucideSquare } from '@ng-icons/lucide';
import { NgIcon } from '@ng-native/icons';
import { ColorScheme } from '@ng-native/device';
import { KeepAwake } from '@ng-native/expo/keep-awake';
import { Location } from '@ng-native/expo/location';
import { Pressable, Text, View } from '@ng-native/components';
import { NativeNavigation, TabSafeAreaView } from '@ng-native/router';
import { MapView, type MapMarker, type MapPolyline } from '@ng-native/expo/map-view';
import { LocationSourceSetting } from '../settings/location-source-setting.ts';
import { Units } from '../settings/units.ts';
import { Tracking } from '../tracking/tracking.ts';
import { SIMULATED_ROUTE } from '../tracking/simulated-route.ts';
import {
  convertDistance,
  convertPace,
  formatDistance,
  formatDuration,
  formatPace,
} from '../tracking/geo.ts';

const ROUTE_COLOUR = '#ff5a36';
/** Where the map opens before the first fix arrives: the simulated route's own start. */
const START = SIMULATED_ROUTE[0]!;

/**
 * The live run: a map that follows the route as it is recorded, big numbers for time, distance
 * and pace, and start/pause/finish controls. Keeps the screen awake while recording, and shows a
 * denied state instead of the map when location access has not been granted.
 */
@Component({
  selector: 'app-run',
  imports: [MapView, NgIcon, Pressable, TabSafeAreaView, Text, View],
  providers: [provideIcons({ lucidePause, lucidePlay, lucideSquare })],
  template: `
    <view class="screen">
      <expo-map
        class="map"
        [markers]="markers()"
        [polylines]="polylines()"
        [cameraPosition]="cameraPosition()"
        [uiSettings]="mapUiSettings"
      />

      @if (needsLocationPermission()) {
        <view class="permission-overlay">
          <view class="permission-card">
            <text class="permission-title">Location access needed</text>
            <text class="permission-body"
              >Runs uses your location to track your route, distance and pace while you run.</text
            >
            <pressable
              class="permission-button"
              accessibilityRole="button"
              (press)="requestLocation()"
            >
              <text class="permission-button-label">Allow location</text>
            </pressable>
          </view>
        </view>
      }

      <!--
        The panel paints to the very bottom of the screen, behind the tab bar, and its content
        stops where the bar begins. tab-safe-area-view takes the bar's height from the tab screen
        itself, as a margin, which the panel grows around. A safe-area-view cannot: its insets come
        from the app's root provider, which sits above the tab bar and knows only the home
        indicator, and its padding leaves the map showing through the inset.
      -->
      <view class="panel absolute bottom-0 inset-x-0">
        <tab-safe-area-view class="panel-content" [edges]="['bottom']">
          <view class="stats">
            <view class="stat">
              <text class="stat-value" testID="elapsed">{{ elapsedLabel() }}</text>
              <text class="stat-label">Time</text>
            </view>
            <view class="stat">
              <text class="stat-value" testID="distance">{{ distanceLabel() }}</text>
              <text class="stat-label" testID="unit">{{ unitLabel() }}</text>
            </view>
            <view class="stat">
              <text class="stat-value" testID="pace">{{ paceLabel() }}</text>
              <text class="stat-label">Pace /{{ unit() }}</text>
            </view>
          </view>

          <view class="controls">
            @switch (status()) {
              @case ('idle') {
                <pressable
                  class="control"
                  accessibilityRole="button"
                  accessibilityLabel="Start run"
                  (press)="startRun()"
                >
                  <ng-icon name="lucidePlay" size="28" color="#ffffff" />
                </pressable>
              }
              @case ('recording') {
                <pressable
                  class="control secondary"
                  accessibilityRole="button"
                  accessibilityLabel="Pause run"
                  (press)="pauseRun()"
                >
                  <ng-icon name="lucidePause" size="22" [color]="onSurfaceColor()" />
                </pressable>
                <pressable
                  class="control stop"
                  accessibilityRole="button"
                  accessibilityLabel="Finish run"
                  (press)="finishRun()"
                >
                  <ng-icon name="lucideSquare" size="20" color="#ffffff" />
                </pressable>
              }
              @case ('paused') {
                <pressable
                  class="control secondary"
                  accessibilityRole="button"
                  accessibilityLabel="Resume run"
                  (press)="resumeRun()"
                >
                  <ng-icon name="lucidePlay" size="22" [color]="onSurfaceColor()" />
                </pressable>
                <pressable
                  class="control stop"
                  accessibilityRole="button"
                  accessibilityLabel="Finish run"
                  (press)="finishRun()"
                >
                  <ng-icon name="lucideSquare" size="20" color="#ffffff" />
                </pressable>
              }
            }
          </view>
        </tab-safe-area-view>
      </view>
    </view>
  `,
  styleUrl: './run.css',
})
export class Run {
  private readonly tracking = inject(Tracking);
  private readonly location = inject(Location);
  private readonly locationSetting = inject(LocationSourceSetting);
  private readonly units = inject(Units);
  private readonly keepAwake = inject(KeepAwake);
  private readonly navigation = inject(NativeNavigation);
  private readonly colorScheme = inject(ColorScheme);

  private readonly map = viewChild(MapView);

  protected readonly mapUiSettings = { myLocationButtonEnabled: false, compassEnabled: false };

  protected readonly status = this.tracking.status;
  // The secondary control's background flips light/dark with the theme (`run.css`), so its icon
  // has to as well - `NgIcon`'s colour is drawn straight into the SVG, not something CSS reaches.
  protected readonly onSurfaceColor = computed(() =>
    this.colorScheme.current() === 'dark' ? '#fafafa' : '#18181b',
  );
  protected readonly unit = computed(() => this.units.unit());
  protected readonly unitLabel = computed(() => (this.unit() === 'km' ? 'km' : 'mi'));

  protected readonly elapsedLabel = computed(() => formatDuration(this.tracking.elapsedSeconds()));
  protected readonly distanceLabel = computed(() =>
    formatDistance(convertDistance(this.tracking.distanceMeters(), this.unit())),
  );
  protected readonly paceLabel = computed(() =>
    formatPace(convertPace(this.tracking.paceSecondsPerKm(), this.unit())),
  );

  protected readonly needsLocationPermission = computed(
    () => !this.locationSetting.simulate() && !this.location.permission.granted(),
  );

  protected readonly route = computed(() =>
    this.tracking
      .route()
      .map((point) => ({ latitude: point.latitude, longitude: point.longitude })),
  );
  protected readonly polylines = computed<readonly MapPolyline[]>(() => {
    const coordinates = this.route();
    return coordinates.length < 2 ? [] : [{ coordinates, color: ROUTE_COLOUR, width: 5 }];
  });
  protected readonly markers = computed<readonly MapMarker[]>(() => {
    const route = this.route();
    const current = route.at(-1);
    return current ? [{ id: 'current', coordinates: current, tintColor: ROUTE_COLOUR }] : [];
  });
  protected readonly cameraPosition = computed(() => {
    const current = this.route().at(-1) ?? START;
    return { coordinates: current, zoom: 16 };
  });

  constructor() {
    // Follows the runner as new fixes arrive, while there is a map to move.
    effect(() => {
      const position = this.cameraPosition();
      void this.map()?.setCameraPosition(position);
    });

    // Held only while actually recording: paused or idle, the screen may sleep like any other.
    effect((onCleanup) => {
      if (this.status() !== 'recording') return;
      const release = this.keepAwake.hold('run-recording');
      onCleanup(release);
    });

    inject(DestroyRef).onDestroy(() => {
      if (this.status() !== 'idle') this.tracking.discard();
    });
  }

  protected startRun(): void {
    this.tracking.start();
  }

  protected pauseRun(): void {
    this.tracking.pause();
  }

  protected resumeRun(): void {
    this.tracking.resume();
  }

  protected finishRun(): void {
    const run = this.tracking.finish();
    if (run) void this.navigation.push(['/runs', run.id]);
  }

  protected async requestLocation(): Promise<void> {
    await this.location.permission.ensure();
  }
}
