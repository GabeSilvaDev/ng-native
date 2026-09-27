import { Component, computed, inject, signal } from '@angular/core';
import { Accessibility } from '@ng-native/device';
import type { NativeSyntheticEvent } from 'react-native';
import { Pressable, ScrollView, Text, View } from '@ng-native/components';
import { NativeHeader } from '@ng-native/router';
import { LOCALES, SCRIPTS, message, samples, type Locale } from './world-model.ts';

/**
 * Everything that breaks when an app leaves English: plurals with six forms, numbers and dates
 * each locale's way, right-to-left cards laid out with logical properties, scripts with no spaces,
 * emoji built of several, and the accessibility a screen reader and the system text size lean on:
 * headings, hints, custom actions, a live region, and a pulse that stops for reduced motion.
 */
@Component({
  selector: 'x-world',
  imports: [NativeHeader, Pressable, ScrollView, Text, View],
  template: `
    <native-header title="Everywhere" [largeTitle]="true" />
    <scroll-view class="page" contentInsetAdjustmentBehavior="automatic">
      <text class="section" accessibilityRole="header">Plurals</text>
      <view class="stepper">
        <pressable
          class="step"
          accessibilityRole="button"
          accessibilityLabel="Fewer"
          (press)="count.set(max(0, count() - 1))"
        >
          <text class="step-label" [maxFontSizeMultiplier]="1.3">−</text>
        </pressable>
        <text
          class="count"
          accessibilityRole="adjustable"
          [accessibilityLabel]="count() + ' messages'"
          [accessibilityActions]="adjust"
          (accessibilityAction)="adjustBy($event)"
          >{{ count() }}</text
        >
        <pressable
          class="step"
          accessibilityRole="button"
          accessibilityLabel="More"
          (press)="count.set(count() + 1)"
        >
          <text class="step-label" [maxFontSizeMultiplier]="1.3">+</text>
        </pressable>
      </view>

      @for (locale of locales; track locale.tag) {
        <view
          class="locale"
          [class.rtl]="locale.direction === 'rtl'"
          [style.direction]="locale.direction"
          [accessibilityLanguage]="locale.tag"
        >
          <view class="card-head">
            <text class="language">{{ locale.name }}</text>
            <text class="tag">{{ locale.tag }}</text>
          </view>
          <text class="message" [accessibilityLabel]="message(locale)">{{ message(locale) }}</text>
          <view class="facts">
            <text class="fact">{{ sample(locale).money }}</text>
            <text class="fact">{{ sample(locale).number }}</text>
          </view>
          <text class="date">{{ sample(locale).date }}</text>
        </view>
      }

      <text class="section" accessibilityRole="header">Scripts</text>
      @for (script of scripts; track script.label) {
        <view class="script">
          <text class="script-label">{{ script.label }}</text>
          <text class="script-text">{{ script.text }}</text>
        </view>
      }

      <text class="section" accessibilityRole="header">For a screen reader</text>
      <view class="panel">
        <pressable
          class="action"
          accessibilityRole="button"
          accessibilityLabel="Save draft"
          accessibilityHint="Keeps the draft on this device"
          (press)="save()"
        >
          <text class="action-label">Save draft</text>
        </pressable>
        <text class="status" accessibilityLiveRegion="polite">{{ savedText() }}</text>

        <view
          class="item"
          [accessible]="true"
          [accessibilityLabel]="'Invoice from Kiln, ' + itemState()"
          [accessibilityActions]="itemActions"
          (accessibilityAction)="act($event)"
        >
          <view class="item-dot" [class.flagged]="flagged()"></view>
          <view class="item-text">
            <text class="item-title">Invoice from Kiln</text>
            <text class="item-hint"
              >{{ itemState() }}. Swipe up or down with VoiceOver for actions.</text
            >
          </view>
        </view>

        <view class="pulse-row" accessibilityElementsHidden="true">
          <view class="pulse"></view>
          <text class="pulse-label">Pulses, unless reduce motion is on</text>
        </view>
      </view>
    </scroll-view>
  `,
  styles: `
    :host {
      --ink: light-dark(oklch(0.2 0.02 250), oklch(0.96 0.01 250));
      --soft: light-dark(oklch(0.5 0.02 250), oklch(0.72 0.02 250));
      --accent: oklch(0.6 0.18 250);
      --surface: light-dark(white, oklch(0.22 0.02 250));
    }
    .page {
      flex: 1;
      background-color: light-dark(oklch(0.97 0.006 250), oklch(0.14 0.015 250));
    }
    .section {
      margin: 18px 20px 10px;
      color: var(--ink);
      font-size: 22px;
      font-weight: 800;
    }
    .stepper {
      flex-direction: row;
      align-items: center;
      align-self: flex-start;
      gap: 14px;
      margin: 0 20px 14px;
      padding: 6px;
      border-radius: 999px;
      background-color: var(--surface);
    }
    .step {
      width: 40px;
      height: 40px;
      border-radius: 20px;
      align-items: center;
      justify-content: center;
      background-color: oklch(from var(--accent) l c h / 0.14);
    }
    .step-label {
      color: var(--accent);
      font-size: 22px;
      font-weight: 700;
    }
    .count {
      min-width: 36px;
      text-align: center;
      color: var(--ink);
      font-size: 20px;
      font-weight: 800;
      font-variant-numeric: tabular-nums;
    }
    .locale {
      margin: 0 16px 10px;
      padding: 14px 16px;
      padding-inline-start: 18px;
      border-radius: 18px;
      border-inline-start: 4px solid var(--accent);
      background-color: var(--surface);
    }
    .rtl {
      border-inline-start-color: oklch(0.65 0.18 30);
    }
    .card-head {
      flex-direction: row;
      flex-wrap: wrap;
      justify-content: space-between;
      align-items: baseline;
      column-gap: 10px;
    }
    .language {
      color: var(--ink);
      font-size: 17px;
      font-weight: 800;
    }
    .tag {
      color: var(--soft);
      font-size: 12px;
      font-weight: 600;
      font-family: Menlo;
    }
    .message {
      margin-top: 6px;
      color: var(--ink);
      font-size: 16px;
      text-align: start;
    }
    .facts {
      flex-direction: row;
      flex-wrap: wrap;
      column-gap: 14px;
      margin-top: 6px;
    }
    .fact {
      color: var(--accent);
      font-size: 15px;
      font-weight: 700;
    }
    .date {
      margin-top: 4px;
      color: var(--soft);
      font-size: 13px;
      text-align: start;
    }
    .script {
      margin: 0 16px 10px;
      padding: 12px 16px;
      border-radius: 16px;
      background-color: var(--surface);
    }
    .script-label {
      color: var(--soft);
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.6px;
    }
    .script-text {
      margin-top: 6px;
      color: var(--ink);
      font-size: 20px;
      line-height: 30px;
    }
    .panel {
      margin: 0 16px 60px;
      padding: 16px;
      gap: 14px;
      border-radius: 20px;
      background-color: var(--surface);
    }
    .action {
      align-self: flex-start;
      padding: 12px 18px;
      border-radius: 14px;
      background-color: var(--accent);
    }
    .action-label {
      color: white;
      font-size: 16px;
      font-weight: 700;
    }
    .status {
      color: var(--soft);
      font-size: 14px;
    }
    .item {
      flex-direction: row;
      align-items: center;
      gap: 12px;
    }
    .item-dot {
      width: 12px;
      height: 12px;
      border-radius: 6px;
      background-color: light-dark(oklch(0.85 0.01 250), oklch(0.4 0.01 250));
    }
    .flagged {
      background-color: oklch(0.7 0.18 60);
    }
    .item-text {
      flex: 1;
    }
    .item-title {
      color: var(--ink);
      font-size: 16px;
      font-weight: 700;
    }
    .item-hint {
      color: var(--soft);
      font-size: 13px;
    }
    .pulse-row {
      flex-direction: row;
      align-items: center;
      gap: 12px;
    }
    .pulse {
      width: 14px;
      height: 14px;
      border-radius: 7px;
      background-color: oklch(0.65 0.2 150);
      animation: pulse 1.2s ease-in-out infinite alternate;
    }
    @keyframes pulse {
      to {
        scale: 1.8;
        opacity: 0.3;
      }
    }
    @media (prefers-reduced-motion: reduce) {
      .pulse {
        animation: none;
      }
    }
    .pulse-label {
      color: var(--soft);
      font-size: 13px;
    }
  `,
})
export class WorldPage {
  private readonly accessibility = inject(Accessibility);
  protected readonly locales = LOCALES;
  protected readonly scripts = SCRIPTS;
  protected readonly max = Math.max;
  protected readonly count = signal(3);
  protected readonly saves = signal(0);
  protected readonly flagged = signal(false);
  protected readonly archived = signal(false);
  private readonly today = new Date();
  protected readonly adjust = [{ name: 'increment' }, { name: 'decrement' }];
  protected readonly itemActions = [
    { name: 'flag', label: 'Flag' },
    { name: 'archive', label: 'Archive' },
  ];
  protected readonly savedText = computed(() =>
    this.saves() === 0
      ? 'Not saved yet'
      : this.saves() === 1
        ? 'Saved once'
        : `Saved ${this.saves()} times`,
  );
  protected readonly itemState = computed(() =>
    [
      this.flagged() ? 'Flagged' : 'Not flagged',
      this.archived() ? 'archived' : 'in the inbox',
    ].join(', '),
  );

  /** Said as well as shown: the live region is Android's, and VoiceOver needs telling. */
  protected save(): void {
    this.saves.update((n) => n + 1);
    this.accessibility.announce(this.savedText());
  }

  protected message(locale: Locale): string {
    return message(locale, this.count());
  }

  protected sample(locale: Locale) {
    return samples(locale, this.today);
  }

  protected adjustBy(event: NativeSyntheticEvent<{ actionName: string }>): void {
    const by = event.nativeEvent.actionName === 'increment' ? 1 : -1;
    this.count.set(Math.max(0, this.count() + by));
  }

  protected act(event: NativeSyntheticEvent<{ actionName: string }>): void {
    if (event.nativeEvent.actionName === 'flag') this.flagged.set(!this.flagged());
    if (event.nativeEvent.actionName === 'archive') this.archived.set(!this.archived());
  }
}
