import { Component, computed, inject, signal } from '@angular/core';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from '@ng-native/components';
import { NativeNavigation } from '@ng-native/router';
import {
  OPTIONS,
  Trip,
  fare,
  formatFare,
  searchPlaces,
  type Place,
  type RideOption,
} from './ride-model.ts';

/**
 * The sheet over the ride map: a search field and the places it finds, then the kinds of ride
 * with their fares, then the wait for a driver and the driver on the way. The field raises the
 * keyboard inside a sheet with detents, and the places scroll inside the sheet's own drag.
 */
@Component({
  selector: 'x-ride-sheet',
  imports: [ActivityIndicator, Pressable, ScrollView, Text, TextInput, View],
  template: `
    <view class="sheet">
      @switch (trip.stage()) {
        @case ('idle') {
          <text class="heading">Where to?</text>
          <text-input
            class="field"
            placeholder="Search destinations"
            accessibilityLabel="Search destinations"
            [autoCorrect]="false"
            [(value)]="query"
          />
          <scroll-view class="places" keyboardShouldPersistTaps="handled">
            @for (place of places(); track place.id) {
              <pressable
                class="place"
                accessibilityRole="button"
                [accessibilityLabel]="place.name + ', ' + place.area"
                (press)="choose(place)"
              >
                <view class="pin"
                  ><text class="pin-glyph">{{ place.name[0] }}</text></view
                >
                <view class="place-text">
                  <text class="place-name">{{ place.name }}</text>
                  <text class="place-area">{{ place.area }}</text>
                </view>
              </pressable>
            } @empty {
              <text class="hint">No places match.</text>
            }
          </scroll-view>
        }
        @case ('choosing') {
          <!-- Scrolls at the smallest detent, where the request button is below the fold. -->
          <scroll-view class="places" [contentContainerStyle]="stack">
            <text class="heading">{{ trip.destination()?.name }}</text>
            <text class="hint">{{ distance() }}</text>
            @for (option of options; track option.id) {
              <pressable
                [class]="option.id === trip.option().id ? 'option chosen' : 'option'"
                accessibilityRole="radio"
                [accessibilityState]="{ checked: option.id === trip.option().id }"
                [accessibilityLabel]="option.name + ', ' + price(option)"
                (press)="trip.option.set(option)"
              >
                <view class="grow">
                  <text class="option-name">{{ option.name }}</text>
                  <text class="hint">{{ option.seats }} seats, {{ option.eta }} min away</text>
                </view>
                <text class="price">{{ price(option) }}</text>
              </pressable>
            }
            <pressable class="request" accessibilityRole="button" (press)="trip.request()">
              <text class="request-label">Request {{ trip.option().name }}</text>
            </pressable>
            <pressable class="quiet" accessibilityRole="button" (press)="trip.cancel()">
              <text class="quiet-label">Change destination</text>
            </pressable>
          </scroll-view>
        }
        @case ('finding') {
          <text class="heading">Finding a driver</text>
          <view class="pulse"></view>
          <activity-indicator size="large" />
          <pressable class="quiet" accessibilityRole="button" (press)="trip.cancel()">
            <text class="danger-label">Cancel</text>
          </pressable>
        }
        @case ('arriving') {
          @if (trip.driver(); as driver) {
            <text class="heading">{{ driver.name }} is on the way</text>
            <view class="driver">
              <view class="avatar"
                ><text class="avatar-initial">{{ driver.name[0] }}</text></view
              >
              <view class="grow">
                <text class="option-name">{{ driver.car }}</text>
                <text class="hint"
                  >{{ driver.plate }}, arriving in {{ trip.option().eta }} min</text
                >
              </view>
            </view>
          }
          <pressable class="quiet" accessibilityRole="button" (press)="finish()">
            <text class="danger-label">Cancel ride</text>
          </pressable>
        }
      }
    </view>
  `,
  styles: `
    :host {
      --accent: oklch(0.58 0.2 265);
      --ink: oklch(0.2 0.02 265);
      --soft: oklch(0.55 0.02 265);
    }
    .sheet {
      flex: 1;
      padding: 28px 16px 16px;
      gap: 12px;
      background-image: linear-gradient(180deg, oklch(0.985 0.005 265), oklch(0.95 0.015 265));
    }
    .heading {
      color: var(--ink);
      font-size: 26px;
      font-weight: 800;
      letter-spacing: -0.6px;
    }
    .field {
      padding: 14px 16px;
      border-radius: 14px;
      border-width: 1px;
      border-color: color-mix(in oklch, var(--accent) 25%, white);
      background-color: white;
      font-size: 17px;
      color: var(--ink);
    }
    .field:focus {
      border-color: var(--accent);
      box-shadow: 0 0 0 4px color-mix(in oklch, var(--accent) 22%, transparent);
    }
    .places {
      flex: 1;
    }
    .place {
      flex-direction: row;
      align-items: center;
      gap: 12px;
      padding: 12px 4px;
      border-bottom-width: 1px;
      border-bottom-color: color-mix(in oklch, var(--ink) 8%, transparent);
    }
    .place:active {
      background-color: color-mix(in oklch, var(--accent) 8%, transparent);
    }
    .pin {
      width: 34px;
      height: 34px;
      border-radius: 17px;
      align-items: center;
      justify-content: center;
      background-image: radial-gradient(
        circle at 30% 30%,
        color-mix(in oklch, var(--accent) 35%, white),
        var(--accent)
      );
    }
    .pin-glyph {
      color: white;
      font-size: 15px;
      font-weight: 800;
    }
    .place-text {
      flex: 1;
    }
    .place-name {
      color: var(--ink);
      font-size: 16px;
      font-weight: 600;
    }
    .place-area {
      color: var(--soft);
      font-size: 13px;
    }
    .hint {
      color: var(--soft);
      font-size: 14px;
    }
    .option {
      flex-direction: row;
      align-items: center;
      gap: 12px;
      padding: 14px;
      border-radius: 16px;
      background-color: white;
      box-shadow: 0 2px 8px rgba(15, 23, 42, 0.08);
      transition: scale 160ms ease-out;
    }
    .option:active {
      scale: 0.98;
    }
    .chosen {
      box-shadow:
        0 0 0 2px var(--accent),
        0 10px 24px -10px color-mix(in oklch, var(--accent) 60%, transparent);
    }
    .option-name {
      color: var(--ink);
      font-size: 17px;
      font-weight: 700;
    }
    .grow {
      flex: 1;
    }
    .price {
      color: var(--ink);
      font-size: 18px;
      font-weight: 800;
      font-variant-numeric: tabular-nums;
    }
    .request {
      margin-top: 4px;
      padding: 16px;
      border-radius: 16px;
      align-items: center;
      background-image: linear-gradient(
        120deg,
        var(--accent),
        color-mix(in oklch, var(--accent) 55%, oklch(0.7 0.2 330))
      );
      box-shadow: 0 14px 28px -12px color-mix(in oklch, var(--accent) 80%, transparent);
      transition: scale 160ms cubic-bezier(0.2, 0.9, 0.3, 1.3);
    }
    .request:active {
      scale: 0.97;
    }
    .request-label {
      color: white;
      font-size: 18px;
      font-weight: 800;
      letter-spacing: -0.2px;
    }
    .quiet {
      padding: 14px;
      align-items: center;
    }
    .quiet-label {
      color: var(--accent);
      font-size: 16px;
      font-weight: 600;
    }
    .danger-label {
      color: oklch(0.58 0.22 25);
      font-size: 16px;
      font-weight: 700;
    }
    .driver {
      flex-direction: row;
      align-items: center;
      gap: 14px;
      padding: 16px;
      border-radius: 18px;
      background-color: white;
      box-shadow: 0 10px 26px -12px rgba(15, 23, 42, 0.3);
    }
    .avatar {
      width: 56px;
      height: 56px;
      border-radius: 28px;
      align-items: center;
      justify-content: center;
      background-image: linear-gradient(135deg, oklch(0.75 0.15 60), oklch(0.6 0.2 20));
      box-shadow:
        0 0 0 3px white,
        0 0 0 5px color-mix(in oklch, var(--accent) 40%, transparent);
    }
    .avatar-initial {
      color: white;
      font-size: 24px;
      font-weight: 800;
    }
    .pulse {
      width: 72px;
      height: 72px;
      align-self: center;
      border-radius: 36px;
      background-color: color-mix(in oklch, var(--accent) 20%, transparent);
      animation: pulse 1200ms ease-in-out infinite alternate;
    }
    @keyframes pulse {
      from {
        scale: 0.7;
        opacity: 0.9;
      }
      to {
        scale: 1.25;
        opacity: 0.25;
      }
    }
  `,
})
export class RideSheet {
  protected readonly trip = inject(Trip);
  private readonly nav = inject(NativeNavigation);
  protected readonly options = OPTIONS;
  protected readonly stack = { gap: 10, paddingBottom: 24 };
  protected readonly query = signal('');
  protected readonly places = computed(() => searchPlaces(this.query()));
  protected readonly distance = computed(() => `${this.trip.km().toFixed(1)} km from King's Cross`);

  protected price(option: RideOption): string {
    return formatFare(fare(option, this.trip.km()));
  }

  protected choose(place: Place): void {
    this.query.set('');
    this.trip.choose(place);
  }

  protected finish(): void {
    this.trip.cancel();
    this.nav.back();
  }
}
