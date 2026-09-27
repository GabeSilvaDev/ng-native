import { Component, signal, viewChild } from '@angular/core';
import {
  MapView,
  type MapCameraPosition,
  type MapCircle,
  type MapMarker,
  type MapPolygon,
  type MapPolyline,
  type MapProperties,
} from '@ng-native/expo/map-view';

@Component({
  selector: 'expo-map-fixture',
  imports: [MapView],
  template: `
    <expo-map
      [markers]="markers()"
      [polylines]="polylines()"
      [polygons]="polygons"
      [circles]="circles"
      [cameraPosition]="camera()"
      [properties]="properties"
      [uiSettings]="{ compassEnabled: false }"
      colorScheme="DARK"
      (mapClick)="mapClicks.push($event.nativeEvent.coordinates)"
      (markerClick)="markerClicks.push($event.nativeEvent.id)"
      (cameraMove)="zooms.push($event.nativeEvent.zoom)"
      (polylineClick)="shapeClicks.push($event.nativeEvent.id)"
      (polygonClick)="shapeClicks.push($event.nativeEvent.id)"
      (circleClick)="shapeClicks.push($event.nativeEvent.id)"
    />
  `,
})
export class ExpoMapFixture {
  readonly map = viewChild.required(MapView);
  readonly markers = signal<MapMarker[]>([
    {
      id: 'kings-cross',
      title: "King's Cross",
      coordinates: { latitude: 51.53, longitude: -0.12 },
    },
    { id: 'paddington', title: 'Paddington', coordinates: { latitude: 51.51, longitude: -0.17 } },
  ]);
  readonly polylines = signal<MapPolyline[]>([
    {
      id: 'route',
      coordinates: [
        { latitude: 51.53, longitude: -0.12 },
        { latitude: 51.51, longitude: -0.17 },
      ],
      color: '#ff5a36',
      width: 5,
      contourStyle: 'GEODESIC',
      geodesic: true,
    },
  ]);
  protected readonly polygons: MapPolygon[] = [
    {
      id: 'park',
      coordinates: [
        { latitude: 51.53, longitude: -0.16 },
        { latitude: 51.52, longitude: -0.15 },
        { latitude: 51.52, longitude: -0.16 },
      ],
      color: 'rgba(0, 128, 0, 0.5)',
      lineColor: 'green',
      lineWidth: 2,
    },
  ];
  protected readonly circles: MapCircle[] = [
    {
      id: 'zone-1',
      center: { latitude: 51.51, longitude: -0.13 },
      radius: 2000,
      color: 'blue',
    },
  ];
  readonly camera = signal<MapCameraPosition>({
    coordinates: { latitude: 51.52, longitude: -0.14 },
    zoom: 12,
  });
  protected readonly properties: MapProperties = { isTrafficEnabled: true, mapType: 'STANDARD' };
  readonly mapClicks: unknown[] = [];
  readonly markerClicks: unknown[] = [];
  readonly zooms: unknown[] = [];
  readonly shapeClicks: unknown[] = [];
}
