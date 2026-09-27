import { Component, signal, viewChild } from '@angular/core';
import { Pressable, Text, View } from '@ng-native/components';
import {
  MapView,
  type MapClickEvent,
  type MapMarker,
  type MapMarkerClickEvent,
} from '@ng-native/expo/map-view';
import { NativeHeader } from '@ng-native/router';
import { page } from '../screen-styles.ts';

const KINGS_CROSS = { latitude: 51.5308, longitude: -0.1238 };

/**
 * `<expo-map>`: Apple Maps here, Google Maps on Android, registered in `main.ts`. Two markers,
 * the last tap under the map, and a button that moves the camera through the view's own function.
 */
@Component({
  selector: 'x-maps',
  imports: [MapView, NativeHeader, Pressable, Text, View],
  template: `
    <native-header title="Maps" />
    <view class="screen">
      <expo-map
        [style]="map"
        [markers]="stations"
        [cameraPosition]="camera"
        (markerClick)="showMarker($event)"
        (mapClick)="showMapTap($event)"
      />
      <view [style]="page.content">
        <text class="body">{{ tapped() }}</text>
        <pressable class="button" (press)="zoomToKingsCross()">
          <text class="button-label">Zoom to King's Cross</text>
        </pressable>
        <text class="hint">{{ moved() }}</text>
      </view>
    </view>
  `,
})
export class MapsPage {
  private readonly view = viewChild.required(MapView);
  protected readonly page = page;
  protected readonly map = { height: 420 };
  protected readonly camera = { coordinates: { latitude: 51.523, longitude: -0.15 }, zoom: 12 };
  protected readonly tapped = signal('Tap a marker');
  protected readonly moved = signal('');
  protected readonly stations: MapMarker[] = [
    { id: 'kings-cross', title: "King's Cross", coordinates: KINGS_CROSS },
    {
      id: 'paddington',
      title: 'Paddington',
      coordinates: { latitude: 51.5154, longitude: -0.1755 },
    },
  ];

  protected showMarker(event: MapMarkerClickEvent): void {
    this.tapped.set(`Marker: ${event.nativeEvent.id}`);
  }

  protected showMapTap(event: MapClickEvent): void {
    this.tapped.set(`Map at ${event.nativeEvent.coordinates.latitude?.toFixed(4)}`);
  }

  protected async zoomToKingsCross(): Promise<void> {
    const reached = await this.view().setCameraPosition({ coordinates: KINGS_CROSS, zoom: 16 });
    this.moved.set(reached ? 'Camera moved' : 'No map to move');
  }
}
