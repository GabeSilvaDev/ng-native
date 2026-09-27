import { NgTemplateOutlet } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { provideIcons } from '@ng-icons/core';
import {
  lucideAccessibility,
  lucideBatteryFull,
  lucideBell,
  lucideBluetooth,
  lucideChevronRight,
  lucideHand,
  lucideLock,
  lucideMoon,
  lucidePlane,
  lucideSettings,
  lucideSun,
  lucideVolume2,
  lucideWifi,
} from '@ng-icons/lucide';
import { Pressable, ScrollView, Switch, Text, View } from '@ng-native/components';
import { NgIcon } from '@ng-native/icons';
import {
  NativeHeader,
  NativeHeaderItem,
  NativeNavigation,
  NativeSearchBar,
} from '@ng-native/router';
import { GROUPS, Settings, search, type SettingRow } from './settings-model.ts';

export const SETTINGS_ICONS = {
  lucideAccessibility,
  lucideBatteryFull,
  lucideBell,
  lucideBluetooth,
  lucideChevronRight,
  lucideHand,
  lucideLock,
  lucideMoon,
  lucidePlane,
  lucideSettings,
  lucideSun,
  lucideVolume2,
  lucideWifi,
};

/**
 * iOS Settings: an account card, grouped rows with coloured tiles, a switch in a row, values on
 * the right, and a search in the header that flattens the groups into what matches.
 */
@Component({
  selector: 'x-settings',
  imports: [
    NativeHeader,
    NativeHeaderItem,
    NativeSearchBar,
    NgIcon,
    NgTemplateOutlet,
    Pressable,
    ScrollView,
    Switch,
    Text,
    View,
  ],
  providers: [provideIcons(SETTINGS_ICONS)],
  template: `
    <native-header title="Settings" [largeTitle]="true">
      <native-header-item type="searchBar">
        <native-search-bar placeholder="Search" [hideWhenScrolling]="false" [(query)]="query" />
      </native-header-item>
    </native-header>
    <scroll-view
      class="page"
      contentInsetAdjustmentBehavior="automatic"
      keyboardDismissMode="on-drag"
    >
      @if (query().trim()) {
        @if (results().length) {
          <view class="group results">
            @for (row of results(); track row.id) {
              <ng-container *ngTemplateOutlet="rowTemplate; context: { $implicit: row }" />
            }
          </view>
        } @else {
          <text class="empty">No results for “{{ query().trim() }}”</text>
        }
      } @else {
        <pressable
          class="group account"
          accessibilityRole="button"
          accessibilityLabel="Alex Morgan, Account and iCloud"
        >
          <view class="avatar"><text class="avatar-initials">AM</text></view>
          <view class="account-text">
            <text class="account-name">Alex Morgan</text>
            <text class="account-hint">Account, iCloud, Media and Purchases</text>
          </view>
          <ng-icon name="lucideChevronRight" [size]="20" color="#b8b8bd" />
        </pressable>
        @for (group of groups; track $index) {
          <view class="group">
            @for (row of group; track row.id) {
              @if (row.toggle) {
                <!-- One element for the row, as VoiceOver reads a settings switch: the whole row
                     toggles, and the switch inside is only what it looks like. -->
                <pressable
                  class="row"
                  [style.--tint]="row.tint"
                  accessibilityRole="switch"
                  [accessibilityLabel]="row.title"
                  [accessibilityState]="{ checked: settings.airplane() }"
                  (press)="settings.airplane.set(!settings.airplane())"
                >
                  <view class="tile"><ng-icon [name]="row.icon" [size]="18" color="white" /></view>
                  <view class="body">
                    <text class="title">{{ row.title }}</text>
                    <switch [(checked)]="settings.airplane" [accessibilityElementsHidden]="true" />
                  </view>
                </pressable>
              } @else {
                <pressable
                  class="row"
                  [style.--tint]="row.tint"
                  accessibilityRole="button"
                  [accessibilityLabel]="label(row)"
                  (press)="open(row)"
                >
                  <view class="tile"><ng-icon [name]="row.icon" [size]="18" color="white" /></view>
                  <view class="body">
                    <text class="title">{{ row.title }}</text>
                    @if (settings.values()[row.id]; as value) {
                      <text class="value" [numberOfLines]="1">{{ value }}</text>
                    }
                    <ng-icon name="lucideChevronRight" [size]="18" color="#b8b8bd" />
                  </view>
                </pressable>
              }
            }
          </view>
        }
      }
    </scroll-view>

    <ng-template #rowTemplate let-row>
      <pressable
        class="row"
        [style.--tint]="row.tint"
        accessibilityRole="button"
        [accessibilityLabel]="label(row)"
        (press)="open(row)"
      >
        <view class="tile"><ng-icon [name]="row.icon" [size]="18" color="white" /></view>
        <view class="body">
          <text class="title">{{ row.title }}</text>
          <ng-icon name="lucideChevronRight" [size]="18" color="#b8b8bd" />
        </view>
      </pressable>
    </ng-template>
  `,
  styleUrl: './settings-list.css',
  styles: [
    `
      .account {
        flex-direction: row;
        align-items: center;
        gap: 14px;
        padding: 12px 16px;
        margin-top: 8px;
      }
      .avatar {
        width: 60px;
        height: 60px;
        border-radius: 30px;
        align-items: center;
        justify-content: center;
        background-image: linear-gradient(160deg, oklch(0.78 0.12 250), oklch(0.55 0.18 280));
      }
      .avatar-initials {
        color: white;
        font-size: 24px;
        font-weight: 600;
      }
      .account-text {
        flex: 1;
      }
      .account-name {
        color: var(--ink);
        font-size: 21px;
        font-weight: 500;
      }
      .account-hint {
        margin-top: 2px;
        color: var(--soft);
        font-size: 13px;
      }
      .results {
        margin-top: 12px;
      }
      .empty {
        margin-top: 60px;
        text-align: center;
        color: var(--soft);
        font-size: 17px;
      }
    `,
  ],
})
export class SettingsPage {
  protected readonly settings = inject(Settings);
  private readonly nav = inject(NativeNavigation);
  protected readonly groups = GROUPS;
  protected readonly query = signal('');
  protected readonly results = computed(() => search(this.query()));

  protected label(row: SettingRow): string {
    const value = this.settings.values()[row.id];
    return value ? `${row.title}, ${value}` : row.title;
  }

  protected open(row: SettingRow): void {
    if (row.to) void this.nav.push(`/settings/${row.to}`);
  }
}
