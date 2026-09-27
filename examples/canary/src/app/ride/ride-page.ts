import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { Pressable, Text, View } from '@ng-native/components';
import { MapView, type MapMarker, type MapPolyline } from '@ng-native/expo/map-view';
import { NativeHeader, NativeNavigation } from '@ng-native/router';
import { PICKUP, Trip, drivers, formatFare, fare } from './ride-model.ts';

/**
 * A ride-hailing map: drivers moving live around the pickup, a sheet over the map with detents
 * for choosing where to go, the map still usable under the sheet's smallest detent, and the
 * route drawn once a destination is chosen.
 */
@Component({
  selector: 'x-ride',
  imports: [MapView, NativeHeader, Pressable, Text, View],
  template: `
    <native-header title="Ride" />
    <view class="ride">
      <expo-map
        class="map"
        [markers]="markers()"
        [polylines]="route()"
        [cameraPosition]="camera"
        [uiSettings]="ui"
      />
      @if (trip.stage() === 'idle') {
        <pressable
          class="where"
          accessibilityRole="button"
          accessibilityLabel="Where to?"
          (press)="openSheet()"
        >
          <view class="where-dot"></view>
          <text class="where-label">Where to?</text>
        </pressable>
      } @else if (trip.destination(); as destination) {
        <view class="banner" accessibilityRole="summary">
          <text class="banner-title">{{ destination.name }}</text>
          <text class="banner-hint">{{ summary() }}</text>
        </view>
      }
    </view>
  `,
  styles: `
    :host {
      --accent: oklch(0.58 0.2 265);
      --ink: oklch(0.2 0.02 265);
    }
    .ride {
      flex: 1;
    }
    .map {
      flex: 1;
    }
    .where {
      position: absolute;
      left: 16px;
      right: 16px;
      bottom: 40px;
      flex-direction: row;
      align-items: center;
      gap: 12px;
      padding: 16px 18px;
      border-radius: 22px;
      background-image: linear-gradient(
        120deg,
        var(--accent),
        color-mix(in oklch, var(--accent) 55%, oklch(0.7 0.2 330))
      );
      box-shadow:
        0 16px 30px -10px color-mix(in oklch, var(--accent) 70%, transparent),
        0 0 0 1px rgba(255, 255, 255, 0.25) inset;
      transition: scale 180ms cubic-bezier(0.2, 0.9, 0.3, 1.3);
    }
    .where:active {
      scale: 0.97;
    }
    .where-dot {
      width: 10px;
      height: 10px;
      border-radius: 5px;
      background-color: white;
      box-shadow: 0 0 0 4px rgba(255, 255, 255, 0.35);
    }
    .where-label {
      color: white;
      font-size: 19px;
      font-weight: 700;
      letter-spacing: -0.3px;
    }
    .banner {
      position: absolute;
      top: 12px;
      left: 16px;
      right: 16px;
      padding: 12px 16px;
      border-radius: 16px;
      border-width: 1px;
      border-color: rgba(255, 255, 255, 0.7);
      background-color: rgba(255, 255, 255, 0.92);
      box-shadow: 0 8px 24px -8px rgba(15, 23, 42, 0.35);
    }
    .banner-title {
      color: var(--ink);
      font-size: 17px;
      font-weight: 700;
    }
    .banner-hint {
      margin-top: 2px;
      color: color-mix(in oklch, var(--ink) 60%, white);
      font-size: 14px;
      font-variant-numeric: tabular-nums;
    }
  `,
})
export class RidePage {
  protected readonly trip = inject(Trip);
  private readonly nav = inject(NativeNavigation);

  protected readonly camera = { coordinates: PICKUP, zoom: 13 };
  protected readonly ui = { compassEnabled: false, myLocationButtonEnabled: false };
  private readonly tick = signal(0);

  protected readonly markers = computed<MapMarker[]>(() => {
    const destination = this.trip.destination();
    return [
      { id: 'pickup', title: 'Pickup', coordinates: PICKUP, tintColor: '#16a34a' },
      ...drivers(this.tick()).map((driver) => ({
        id: driver.id,
        title: driver.name,
        coordinates: driver.coordinates,
        systemImage: 'car.fill',
      })),
      ...(destination
        ? [{ id: 'destination', title: destination.name, coordinates: destination.coordinates }]
        : []),
    ];
  });

  protected readonly route = computed<MapPolyline[]>(() => {
    const destination = this.trip.destination();
    if (!destination) return [];
    return [
      {
        id: 'route',
        coordinates: [PICKUP, destination.coordinates],
        color: '#2563eb',
        width: 5,
      },
    ];
  });

  protected readonly summary = computed(() => {
    const option = this.trip.option();
    const price = formatFare(fare(option, this.trip.km()));
    switch (this.trip.stage()) {
      case 'finding':
        return `Finding a ${option.name} driver`;
      case 'arriving':
        return `${this.trip.driver()?.name} is ${option.eta} min away, ${price}`;
      default:
        return `${option.name}, ${price}`;
    }
  });

  constructor() {
    const timer = setInterval(() => this.tick.update((tick) => tick + 1), 1000);
    inject(DestroyRef).onDestroy(() => {
      clearInterval(timer);
      this.trip.cancel();
    });
  }

  protected openSheet(): void {
    void this.nav.present('/ride/where', {
      as: 'formSheet',
      presentation: {
        sheetAllowedDetents: [0.35, 0.6, 1],
        sheetLargestUndimmedDetent: 0,
        sheetGrabberVisible: true,
      },
    });
  }
}
