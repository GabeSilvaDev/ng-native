/*
 * The navigation showcase: Angular's Router, a native stack, and a native header with a large
 * title. Each trip is a postcard drawn with gradients; pressing one pushes its itinerary with the
 * platform's own transition and back button. Photographed on the iOS simulator for the landing
 * page; it is not mounted on the page, because the router is native-only - see
 * `packages/web/limits`.
 */
import { Component, computed, input } from '@angular/core';
import { withComponentInputBinding, type Routes } from '@angular/router';
import { Pressable, SafeAreaProvider, ScrollView, Text, View } from '@ng-native/components';
import {
  NativeHeader,
  NativeRouterLink,
  NativeStackOutlet,
  provideNativeRouter,
} from '@ng-native/router';

const TRIPS = [
  {
    id: 'lisbon',
    city: 'Lisbon',
    country: 'Portugal',
    dates: '4 - 9 Oct',
    weather: '24°',
    card: 'from-orange-400 via-rose-500 to-fuchsia-700',
    plan: ['Tram 28 at dawn', 'Pastéis in Belém', 'Sunset at Miradouro'],
    flight: 'TP 1363 · 07:40',
    stay: 'Memmo Alfama · 5 nights',
  },
  {
    id: 'kyoto',
    city: 'Kyoto',
    country: 'Japan',
    dates: '12 - 26 Nov',
    weather: '16°',
    card: 'from-red-500 via-orange-500 to-amber-300',
    plan: ['Fushimi Inari, before six', 'Maples in Tofuku-ji', 'Kaiseki in Gion'],
    flight: 'JL 44 · 11:25',
    stay: 'Hoshinoya · 14 nights',
  },
  {
    id: 'oslo',
    city: 'Oslo',
    country: 'Norway',
    dates: '3 - 7 Jan',
    weather: '-4°',
    card: 'from-indigo-600 via-sky-500 to-cyan-300',
    plan: ['The opera house roof', 'Sauna on the fjord', 'Northern lights, maybe'],
    flight: 'SK 806 · 09:10',
    stay: 'The Thief · 4 nights',
  },
  {
    id: 'reykjavik',
    city: 'Reykjavík',
    country: 'Iceland',
    dates: '18 - 22 Feb',
    weather: '1°',
    card: 'from-emerald-400 via-teal-600 to-indigo-800',
    plan: ['The Blue Lagoon', 'Golden Circle by car', 'Aurora from Grótta'],
    flight: 'FI 451 · 13:05',
    stay: 'Reykjavík Edition · 4 nights',
  },
];

@Component({
  selector: 'app-trips',
  imports: [NativeHeader, NativeRouterLink, Pressable, ScrollView, Text, View],
  template: `
    <scroll-view class="flex-1 bg-zinc-100 dark:bg-black" [contentContainerStyle]="list">
      @for (trip of trips; track trip.id) {
        <pressable
          class="h-44 justify-between overflow-hidden rounded-[28px] bg-linear-to-br p-5"
          [class]="trip.card"
          [nativeRouterLink]="['/trip', trip.id]"
        >
          <view class="flex-row justify-between">
            <text class="text-sm font-semibold tracking-[2px] text-white/80 uppercase">
              {{ trip.country }}
            </text>
            <view class="rounded-full bg-white/25 px-3 py-1">
              <text class="text-xs font-bold text-white">{{ trip.weather }}</text>
            </view>
          </view>
          <view>
            <text class="text-4xl font-extrabold tracking-tight text-white">{{ trip.city }}</text>
            <text class="mt-1 font-medium text-white/85">{{ trip.dates }}</text>
          </view>
        </pressable>
      }
    </scroll-view>
    <native-header title="Trips" [largeTitle]="true" />
  `,
})
export class Trips {
  protected readonly trips = TRIPS;
  protected readonly list = { gap: 16, padding: 16 };
}

@Component({
  selector: 'app-trip',
  imports: [NativeHeader, Text, View],
  template: `
    <native-header [title]="trip().city" />
    <view class="flex-1 bg-zinc-100 p-4 dark:bg-black">
      <view class="h-40 justify-end rounded-[28px] bg-linear-to-br p-5" [class]="trip().card">
        <text class="text-3xl font-extrabold text-white">{{ trip().country }}</text>
        <text class="mt-1 text-sm font-semibold text-white/85">
          {{ trip().dates }} · {{ trip().weather }}
        </text>
      </view>
      <text class="mt-6 px-1 text-xs font-semibold tracking-[2px] text-zinc-500">ITINERARY</text>
      <view class="mt-3 rounded-[24px] bg-white p-5 dark:bg-zinc-900">
        @for (stop of trip().plan; track stop; let first = $first; let last = $last) {
          <view class="flex-row gap-4">
            <view class="items-center">
              <view
                class="size-3 rounded-full"
                [class]="first ? 'bg-rose-500' : 'bg-zinc-300 dark:bg-zinc-700'"
              ></view>
              @if (!last) {
                <view class="w-0.5 flex-1 bg-zinc-200 dark:bg-zinc-800"></view>
              }
            </view>
            <view class="-mt-1 pb-5">
              <text class="text-xs text-zinc-500">Day {{ $index + 1 }}</text>
              <text class="text-base font-semibold text-zinc-950 dark:text-white">{{ stop }}</text>
            </view>
          </view>
        }
      </view>
      <view class="mt-3 flex-row gap-3">
        @for (booking of bookings(); track booking.label) {
          <view class="flex-1 rounded-[24px] bg-white p-4 dark:bg-zinc-900">
            <text class="text-xs font-semibold tracking-[1.5px] text-rose-500">{{
              booking.label
            }}</text>
            <text class="mt-1 text-sm font-semibold text-zinc-950 dark:text-white">
              {{ booking.value }}
            </text>
          </view>
        }
      </view>
    </view>
  `,
})
export class Trip {
  /** The `:id` route parameter, bound by `withComponentInputBinding()`. */
  readonly id = input.required<string>();
  protected readonly trip = computed(() => TRIPS.find((trip) => trip.id === this.id())!);
  protected readonly bookings = computed(() => [
    { label: 'FLIGHT', value: this.trip().flight },
    { label: 'STAY', value: this.trip().stay },
  ]);
}

// excerpt: ts
export const routes: Routes = [
  { path: '', component: Trips },
  { path: 'trip/:id', component: Trip },
];

/** What the app starts with: Angular's Router, on native navigation. */
export const providers = [provideNativeRouter(routes, withComponentInputBinding())];
// excerpt end

@Component({
  selector: 'app-root',
  imports: [NativeStackOutlet, SafeAreaProvider],
  template: `
    <safe-area-provider>
      <native-stack-outlet />
    </safe-area-provider>
  `,
  host: { class: 'flex-1' },
})
export class App {}
