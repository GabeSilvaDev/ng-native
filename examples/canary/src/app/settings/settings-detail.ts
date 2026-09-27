import { Component, computed, inject, input } from '@angular/core';
import { provideIcons } from '@ng-icons/core';
import { lucideCheck, lucideLock } from '@ng-icons/lucide';
import { Pressable, ScrollView, Switch, Text, View } from '@ng-native/components';
import { UiHost, UiSlider } from '@ng-native/expo';
import { Brightness } from '@ng-native/expo/brightness';
import { NgIcon } from '@ng-native/icons';
import { NativeHeader } from '@ng-native/router';
import { NETWORKS, ROWS, Settings, type Appearance } from './settings-model.ts';

const ABOUT: readonly [string, string][] = [
  ['Name', 'Ashley’s iPhone'],
  ['iOS Version', '26.5'],
  ['Model Name', 'iPhone 17 Pro'],
  ['Model Number', 'MG8K4B/A'],
  ['Serial Number', 'F4K9QX7LMN'],
  ['Capacity', '256 GB'],
  ['Available', '131.4 GB'],
];

const APPEARANCES: readonly { id: Appearance; name: string }[] = [
  { id: 'light', name: 'Light' },
  { id: 'dark', name: 'Dark' },
];

/**
 * One settings page, by the section in its path: Wi-Fi's networks with signal bars drawn in CSS,
 * Display's appearance picker (which sets the whole app's scheme) and native sliders, General's
 * key-value list, and a placeholder for the rest.
 */
@Component({
  selector: 'x-settings-detail',
  imports: [NativeHeader, NgIcon, Pressable, ScrollView, Switch, Text, UiHost, UiSlider, View],
  providers: [provideIcons({ lucideCheck, lucideLock })],
  template: `
    <native-header [title]="title()" />
    <scroll-view class="page" contentInsetAdjustmentBehavior="automatic">
      @switch (section()) {
        @case ('wifi') {
          <view class="group top">
            <view class="row">
              <view class="body">
                <text class="title" [accessible]="false">Wi-Fi</text>
                <switch [(checked)]="settings.wifi" accessibilityLabel="Wi-Fi" />
              </view>
            </view>
            @if (settings.wifi() && settings.network(); as joined) {
              <view class="row" [accessible]="true" [accessibilityLabel]="joined + ', connected'">
                <view class="body">
                  <ng-icon class="check" name="lucideCheck" [size]="18" color="#007aff" />
                  <text class="title">{{ joined }}</text>
                  <ng-icon name="lucideLock" [size]="14" color="#8e8e93" />
                  <view class="bars strength-3"
                    ><view class="bar"></view><view class="bar"></view><view class="bar"></view
                  ></view>
                </view>
              </view>
            }
          </view>
          @if (settings.wifi()) {
            <text class="caption">Networks</text>
            <view class="group">
              @for (network of others(); track network.name) {
                <pressable
                  class="row"
                  accessibilityRole="button"
                  [accessibilityLabel]="
                    network.name +
                    (network.secured ? ', secured' : '') +
                    ', ' +
                    network.strength +
                    ' bars'
                  "
                  (press)="settings.network.set(network.name)"
                >
                  <view class="body">
                    <text class="title">{{ network.name }}</text>
                    @if (network.secured) {
                      <ng-icon name="lucideLock" [size]="14" color="#8e8e93" />
                    }
                    <view [class]="'bars strength-' + network.strength">
                      <view class="bar"></view><view class="bar"></view><view class="bar"></view>
                    </view>
                  </view>
                </pressable>
              }
            </view>
          }
        }
        @case ('display') {
          <text class="caption top-caption">Appearance</text>
          <view class="group appearance">
            <view class="modes">
              @for (mode of appearances; track mode.id) {
                <pressable
                  class="mode"
                  [class.chosen]="settings.appearance() === mode.id"
                  accessibilityRole="radio"
                  [accessibilityLabel]="mode.name"
                  [accessibilityState]="{ checked: settings.appearance() === mode.id }"
                  (press)="settings.setAppearance(mode.id)"
                >
                  <view [class]="'phone ' + mode.id">
                    <view class="phone-bar"></view>
                    <view class="phone-line"></view>
                    <view class="phone-line short"></view>
                  </view>
                  <text class="mode-name">{{ mode.name }}</text>
                  <view class="radio"><view class="radio-dot"></view></view>
                </pressable>
              }
            </view>
            <view class="row">
              <view class="body">
                <text class="title" [accessible]="false">Automatic</text>
                <switch
                  [checked]="settings.appearance() === 'automatic'"
                  (checkedChange)="settings.setAppearance($event ? 'automatic' : 'light')"
                  accessibilityLabel="Automatic"
                />
              </view>
            </view>
          </view>
          <text class="caption">Brightness</text>
          <view class="group">
            <view class="row slider-row">
              <ui-host class="slider" [matchContents]="{ vertical: true }">
                <ui-slider
                  [value]="brightness.level()"
                  [min]="0"
                  [max]="1"
                  (valueChanged)="brightness.set($event.nativeEvent.value)"
                />
              </ui-host>
            </view>
          </view>
          <text class="caption">Text</text>
          <view class="group">
            <view class="row slider-row">
              <text class="small-a">A</text>
              <ui-host class="slider" [matchContents]="{ vertical: true }">
                <ui-slider
                  [value]="settings.textSize()"
                  [min]="1"
                  [max]="7"
                  [steps]="5"
                  (valueChanged)="settings.textSize.set($event.nativeEvent.value)"
                />
              </ui-host>
              <text class="big-a">A</text>
            </view>
            <view class="row">
              <view class="body">
                <text class="title" [class.bold]="settings.bold()" [accessible]="false">
                  Bold Text
                </text>
                <switch [(checked)]="settings.bold" accessibilityLabel="Bold Text" />
              </view>
            </view>
          </view>
          <text
            class="preview"
            [style.fontSize.px]="12 + settings.textSize() * 2"
            [class.bold]="settings.bold()"
          >
            Apps that support Dynamic Type will adjust to your preferred reading size.
          </text>
        }
        @case ('general') {
          <view class="group top">
            @for (entry of about; track entry[0]) {
              <view
                class="row"
                [accessible]="true"
                [accessibilityLabel]="entry[0] + ', ' + entry[1]"
              >
                <view class="body">
                  <text class="title">{{ entry[0] }}</text>
                  <text class="value">{{ entry[1] }}</text>
                </view>
              </view>
            }
          </view>
        }
        @default {
          <view class="placeholder">
            <text class="placeholder-title">{{ title() }}</text>
            <text class="placeholder-hint">Nothing to set here in the canary.</text>
          </view>
        }
      }
    </scroll-view>
  `,
  styleUrl: './settings-list.css',
  styles: [
    `
      .top {
        margin-top: 16px;
      }
      .top-caption {
        margin-top: 24px;
      }
      .check {
        margin-left: -4px;
      }
      .bars {
        flex-direction: row;
        align-items: flex-end;
        gap: 2px;
        height: 14px;
      }
      .bar {
        width: 4px;
        border-radius: 1px;
        background-color: var(--ink);
      }
      .bar:nth-child(1) {
        height: 5px;
      }
      .bar:nth-child(2) {
        height: 9px;
      }
      .bar:nth-child(3) {
        height: 14px;
      }
      .strength-1 .bar:nth-child(n + 2),
      .strength-2 .bar:nth-child(3) {
        opacity: 0.2;
      }
      .appearance {
        padding-top: 18px;
      }
      .modes {
        flex-direction: row;
        justify-content: space-evenly;
        padding-bottom: 14px;
        border-bottom-width: var(--hairline, 0.5px);
        border-bottom-color: var(--rule);
        margin-left: 16px;
      }
      .mode {
        align-items: center;
        gap: 8px;
      }
      .phone {
        width: 76px;
        height: 150px;
        padding: 12px 8px;
        gap: 8px;
        border-radius: 16px;
        border-width: 3px;
        border-color: transparent;
      }
      .chosen .phone {
        border-color: #007aff;
      }
      .light {
        background-image: linear-gradient(180deg, oklch(0.98 0.005 250), oklch(0.9 0.02 250));
      }
      .dark {
        background-image: linear-gradient(180deg, oklch(0.3 0.03 270), oklch(0.12 0.02 270));
      }
      .phone-bar {
        height: 16px;
        border-radius: 5px;
        background-color: oklch(0.6 0.15 250 / 0.6);
      }
      .phone-line {
        height: 6px;
        border-radius: 3px;
        background-color: light-dark(oklch(0.7 0.01 270 / 0.5), oklch(0.8 0.01 270 / 0.4));
      }
      .dark .phone-line {
        background-color: oklch(0.8 0.01 270 / 0.35);
      }
      .short {
        width: 60%;
      }
      .mode-name {
        color: var(--ink);
        font-size: 15px;
      }
      .radio {
        width: 22px;
        height: 22px;
        border-radius: 11px;
        border-width: 1.5px;
        border-color: var(--rule);
        align-items: center;
        justify-content: center;
      }
      .chosen .radio {
        border-color: #007aff;
        background-color: #007aff;
      }
      .radio-dot {
        width: 8px;
        height: 8px;
        border-radius: 4px;
        background-color: transparent;
      }
      .chosen .radio-dot {
        background-color: white;
      }
      .slider-row {
        padding-right: 16px;
        gap: 12px;
      }
      .slider {
        flex: 1;
      }
      .small-a {
        color: var(--ink);
        font-size: 13px;
      }
      .big-a {
        color: var(--ink);
        font-size: 22px;
      }
      .bold {
        font-weight: 700;
      }
      .preview {
        margin: -12px 32px 28px;
        color: var(--soft);
      }
      .placeholder {
        align-items: center;
        margin-top: 120px;
        gap: 6px;
      }
      .placeholder-title {
        color: var(--ink);
        font-size: 22px;
        font-weight: 700;
      }
      .placeholder-hint {
        color: var(--soft);
        font-size: 15px;
      }
    `,
  ],
})
export class SettingsDetail {
  readonly section = input.required<string>();
  protected readonly settings = inject(Settings);
  protected readonly brightness = inject(Brightness);
  protected readonly about = ABOUT;
  protected readonly appearances = APPEARANCES;
  protected readonly title = computed(
    () => ROWS.find((row) => row.to === this.section())?.title ?? 'Settings',
  );
  protected readonly others = computed(() =>
    NETWORKS.filter((network) => network.name !== this.settings.network()),
  );
}
