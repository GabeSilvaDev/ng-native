import { Component, DestroyRef, inject, signal } from '@angular/core';
import { KeyboardDock, Pressable, ScrollView, Text, TextInput, View } from '@ng-native/components';
import { DeviceOrientation } from '@ng-native/expo/orientation';
import { NativeHeader, NativeNavigation } from '@ng-native/router';
import { Palette } from '../palette.ts';
import { NoteDrafts } from './note-drafts.ts';

/**
 * The keyboard against everything a real app puts near it: a field at the very bottom of a long
 * page, fields inside a sideways carousel, keyboards of different heights one after another, a
 * bar docked on the keyboard, and a form in a sheet. None of it measures the keyboard itself.
 */
@Component({
  selector: 'x-keyboard-lab',
  imports: [KeyboardDock, NativeHeader, Pressable, ScrollView, Text, TextInput, View],
  template: `
    <native-header title="Keyboard" />
    <view class="screen">
      <scroll-view
        class="page"
        [contentContainerStyle]="content"
        [automaticallyAdjustKeyboardInsets]="true"
        keyboardDismissMode="interactive"
        keyboardShouldPersistTaps="handled"
      >
        <text class="hint"
          >Every field here should end up clear of the keyboard, with no code measuring it.</text
        >
        <pressable class="button" accessibilityRole="button" (press)="openSheet()">
          <text class="button-label">Edit a note in a sheet</text>
        </pressable>
        <pressable class="card" accessibilityRole="button" (press)="rotate()">
          <text class="button-label">{{
            landscape() ? 'Back to portrait' : 'Rotate to landscape'
          }}</text>
        </pressable>
        @if (drafts.saved(); as saved) {
          <text class="body" accessibilityRole="text">Saved: {{ saved }}</text>
        }

        <text class="section">Keyboards of different heights</text>
        <text-input
          class="field"
          accessibilityLabel="Email"
          keyboardType="email-address"
          placeholder="Email"
          returnKeyType="next"
          (submitEditing)="amount.focus()"
        />
        <text-input
          #amount
          class="field"
          accessibilityLabel="Amount"
          keyboardType="decimal-pad"
          placeholder="Amount"
        />
        <text-input
          class="field"
          accessibilityLabel="Phone"
          keyboardType="phone-pad"
          placeholder="Phone"
        />
        <text-input
          class="field"
          accessibilityLabel="Website"
          keyboardType="url"
          placeholder="Website"
        />

        <text class="section">Fields in a carousel</text>
        <scroll-view
          [horizontal]="true"
          [contentContainerStyle]="carousel"
          [showsHorizontalScrollIndicator]="false"
        >
          @for (card of cards; track card) {
            <view class="card carousel-card">
              <text class="body">{{ card }}</text>
              <text-input class="field" [accessibilityLabel]="card + ' note'" placeholder="Note" />
            </view>
          }
        </scroll-view>

        @for (filler of filler; track filler) {
          <view class="card"
            ><text class="hint">Row {{ filler }}</text></view
          >
        }

        <text class="section">The last field on the page</text>
        <text-input class="field" accessibilityLabel="Last field" placeholder="Last field" />
      </scroll-view>

      <keyboard-dock [backgroundColor]="palette.current().screen">
        <view class="dock">
          <text-input
            class="field dock-field"
            accessibilityLabel="Quick note"
            placeholder="Quick note"
            [(value)]="quick"
          />
          <text class="hint">{{ quick().length }}</text>
        </view>
      </keyboard-dock>
    </view>
  `,
  styles: `
    .page {
      flex: 1;
    }
    .section {
      color: var(--text-strong);
      font-size: 18px;
      font-weight: 700;
      margin-top: 12px;
    }
    .carousel-card {
      width: 260px;
      align-items: stretch;
      gap: 8px;
    }
    .dock {
      flex-direction: row;
      align-items: center;
      gap: 10px;
      padding: 8px 12px;
      border-top-width: 1px;
      border-top-color: var(--line);
    }
    .dock-field {
      flex: 1;
    }
  `,
})
export class KeyboardLab {
  protected readonly drafts = inject(NoteDrafts);
  protected readonly palette = inject(Palette);
  private readonly nav = inject(NativeNavigation);

  protected readonly content = { padding: 20, gap: 12, paddingBottom: 80 };
  protected readonly carousel = { gap: 12 };
  protected readonly cards = ['Monday', 'Tuesday', 'Wednesday', 'Thursday'];
  protected readonly filler = Array.from({ length: 8 }, (_, i) => i + 1);
  protected readonly quick = signal('');
  private readonly orientation = inject(DeviceOrientation);
  protected readonly landscape = signal(false);
  private unlock: (() => void) | null = null;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.unlock?.());
  }

  /**
   * Turn the interface, as turning the phone would, to see the keyboard come back sideways.
   * Portrait is locked on the way back too: a lock released leaves the interface where it is.
   */
  protected rotate(): void {
    this.unlock?.();
    const landscape = !this.landscape();
    this.unlock = this.orientation.lock(landscape ? 'landscape' : 'portrait');
    this.landscape.set(landscape);
  }

  protected openSheet(): void {
    void this.nav.present('/keyboard/sheet', {
      as: 'formSheet',
      presentation: { sheetAllowedDetents: [0.5, 1], sheetGrabberVisible: true },
    });
  }
}
