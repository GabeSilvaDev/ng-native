import { DatePipe } from '@angular/common';
import { Component, DestroyRef, inject, input, signal } from '@angular/core';
import { Modal, Pressable, ScrollView, Text, View } from '@ng-native/components';
import { NativeHeader, NativeHeaderItem, NativeNavigation } from '@ng-native/router';
import { page } from '../screen-styles.ts';

/**
 * Navigation and layout cases that once went wrong, each one tap away: a header an if removes, a
 * detail pushed from a detail, a push from inside a modal, a page that throws as it renders,
 * text that has to follow the system text size, a modal hidden by its visible input, the defer
 * triggers Angular registers on an element, dates formatted in a timezone, and text in a
 * right-to-left box.
 */
@Component({
  selector: 'x-regressions',
  imports: [NativeHeader, Pressable, ScrollView, Text],
  template: `
    <native-header title="Regressions" />
    <scroll-view class="screen" [contentContainerStyle]="page.content">
      <pressable class="card" testID="open-header" (press)="nav.push('/regressions/header')">
        <text class="button-label">Header behind an if</text>
        <text class="hint">Hide takes the whole bar away, Show brings it back.</text>
      </pressable>
      <pressable class="card" testID="open-item" (press)="nav.push('/regressions/item/1')">
        <text class="button-label">Detail to detail</text>
        <text class="hint">Each Next is a new screen, and back walks down them.</text>
      </pressable>
      <pressable class="card" testID="open-modal" (press)="present()">
        <text class="button-label">Push from a modal</text>
        <text class="hint">The pushed screen shows over the modal.</text>
      </pressable>
      <pressable class="card" testID="open-broken" (press)="openBroken()">
        <text class="button-label">A page that throws</text>
        <text class="hint">Nothing is pushed. Failures: {{ failures() }}</text>
      </pressable>
      <pressable class="card" testID="open-text" (press)="nav.push('/regressions/text')">
        <text class="button-label">Static text</text>
        <text class="hint">Change the text size with this open.</text>
      </pressable>
      <pressable class="card" testID="open-rtl" (press)="nav.push('/regressions/rtl')">
        <text class="button-label">Right to left text</text>
        <text class="hint">Text in a direction rtl box starts at the right.</text>
      </pressable>
      <pressable class="card" testID="open-dates" (press)="nav.push('/regressions/dates')">
        <text class="button-label">Dates in a timezone</text>
        <text class="hint">14:30 UTC in each zone the date pipe reads.</text>
      </pressable>
      <pressable class="card" testID="open-defer" (press)="nav.push('/regressions/defer')">
        <text class="button-label">Defer triggers</text>
        <text class="hint">Interaction, hover and viewport each load their block.</text>
      </pressable>
      <pressable
        class="card"
        testID="open-hidden-modal"
        (press)="nav.push('/regressions/hidden-modal')"
      >
        <text class="button-label">Hidden modal</text>
        <text class="hint">A modal with visible false leaves the screen usable.</text>
      </pressable>
    </scroll-view>
  `,
})
export class Regressions {
  protected readonly page = page;
  protected readonly nav = inject(NativeNavigation);
  protected readonly failures = signal(0);

  protected present(): void {
    void this.nav.present('/regressions/modal');
  }

  protected openBroken(): void {
    this.nav.push('/regressions/broken').catch(() => this.failures.update((count) => count + 1));
  }
}

@Component({
  selector: 'x-regression-header',
  imports: [NativeHeader, NativeHeaderItem, Pressable, ScrollView, Text],
  template: `
    @if (shown()) {
      <native-header title="Header shown">
        <native-header-item type="right">
          <text class="hint">Item</text>
        </native-header-item>
      </native-header>
    }
    <!-- Clear of the status bar with the header gone, as UIKit keeps a scroll view. -->
    <scroll-view
      class="screen"
      contentInsetAdjustmentBehavior="automatic"
      [contentContainerStyle]="page.content"
    >
      <pressable class="button" testID="toggle-header" (press)="shown.set(!shown())">
        <text class="button-label">{{ shown() ? 'Hide' : 'Show' }} the header</text>
      </pressable>
      <pressable class="button" testID="header-back" (press)="nav.back()">
        <text class="button-label">Back</text>
      </pressable>
    </scroll-view>
  `,
})
export class RegressionHeader {
  protected readonly page = page;
  protected readonly nav = inject(NativeNavigation);
  protected readonly shown = signal(true);
}

@Component({
  selector: 'x-regression-item',
  imports: [NativeHeader, Pressable, ScrollView, Text],
  template: `
    <native-header [title]="'Item ' + id()" />
    <scroll-view class="screen" [contentContainerStyle]="page.content">
      <text class="body">Item {{ id() }}</text>
      <pressable class="button" testID="next-item" (press)="next()">
        <text class="button-label">Next</text>
      </pressable>
    </scroll-view>
  `,
})
export class RegressionItem {
  readonly id = input.required<string>();
  protected readonly page = page;
  private readonly nav = inject(NativeNavigation);

  protected next(): void {
    void this.nav.push(['/regressions/item', Number(this.id()) + 1]);
  }
}

@Component({
  selector: 'x-regression-modal',
  imports: [Pressable, ScrollView, Text, View],
  template: `
    <scroll-view class="screen" [contentContainerStyle]="page.content">
      <view [style]="gap"></view>
      <text class="heading">A modal with no stack</text>
      <pressable class="button" testID="modal-push" (press)="push()">
        <text class="button-label">Push Item 1</text>
      </pressable>
      <pressable class="button" testID="modal-close" (press)="nav.back()">
        <text class="button-label">Close</text>
      </pressable>
    </scroll-view>
  `,
})
export class RegressionModal {
  protected readonly page = page;
  protected readonly nav = inject(NativeNavigation);
  protected readonly gap = { height: 40 };

  protected push(): void {
    void this.nav.push('/regressions/item/1');
  }
}

/** Throws on its first render, as a page with a typo in its template does. */
@Component({
  selector: 'x-regression-broken',
  imports: [Text],
  template: '<text>{{ missing() }}</text>',
})
export class RegressionBroken {
  protected readonly missing = undefined as unknown as () => string;

  constructor() {
    // Were this page to stay alive after failing, the interval would keep going.
    const timer = setInterval(() => console.log('[regressions] broken page still running'), 1000);
    inject(DestroyRef).onDestroy(() => clearInterval(timer));
  }
}

@Component({
  selector: 'x-regression-text',
  imports: [NativeHeader, ScrollView, Text],
  template: `
    <native-header title="Static text" />
    <scroll-view class="screen" [contentContainerStyle]="page.content">
      <text class="heading">Services</text>
      <text class="body">
        This text never changes. At a larger text size it has to grow with its glyphs rather than
        keep the box it was first measured in.
      </text>
      <text class="hint">A hint that never changes either.</text>
    </scroll-view>
  `,
})
export class RegressionText {
  protected readonly page = page;
}

/** A modal that stays in the template, hidden by its visible input rather than by an if. */
@Component({
  selector: 'x-regression-hidden-modal',
  imports: [Modal, NativeHeader, Pressable, ScrollView, Text, View],
  template: `
    <native-header title="Hidden modal" />
    <scroll-view class="screen" [contentContainerStyle]="page.content">
      <pressable class="button" testID="hidden-modal-tap" (press)="taps.set(taps() + 1)">
        <text class="button-label">Taps: {{ taps() }}</text>
      </pressable>
      <pressable class="button" testID="hidden-modal-show" (press)="open.set(true)">
        <text class="button-label">Show the modal</text>
      </pressable>
      <text class="hint">Dismissals: {{ dismissals() }}</text>
    </scroll-view>
    <modal
      [visible]="open()"
      [transparent]="true"
      animationType="slide"
      (dismiss)="dismissals.set(dismissals() + 1)"
    >
      <view [style]="sheet">
        <pressable class="button" testID="hidden-modal-close" (press)="open.set(false)">
          <text class="button-label">Close</text>
        </pressable>
      </view>
    </modal>
  `,
})
export class RegressionHiddenModal {
  protected readonly page = page;
  protected readonly taps = signal(0);
  protected readonly open = signal(false);
  protected readonly dismissals = signal(0);
  protected readonly sheet = { marginTop: 300, padding: 24, backgroundColor: '#ddeeff' };
}

/** The three defer triggers Angular registers on an element rather than through the renderer. */
@Component({
  selector: 'x-regression-defer',
  imports: [NativeHeader, Pressable, ScrollView, Text, View],
  template: `
    <native-header title="Defer triggers" />
    <scroll-view class="screen" testID="defer-scroll" [contentContainerStyle]="page.content">
      <pressable class="button" #load testID="defer-press">
        <text class="button-label">Press to load</text>
      </pressable>
      @defer (on interaction(load)) {
        <text class="body" testID="defer-interaction">Loaded on interaction</text>
      } @placeholder {
        <text class="hint">Waiting for a press</text>
      }
      @defer (on hover; on interaction) {
        <text class="body" testID="defer-hover">Loaded on hover or a press</text>
      } @placeholder {
        <text class="hint">Hover or press here</text>
      }
      <view [style]="spacer"></view>
      @defer (on viewport) {
        <text class="body" testID="defer-viewport">Loaded on viewport</text>
      } @placeholder {
        <text class="hint">Scrolled into view loads this</text>
      }
    </scroll-view>
  `,
})
export class RegressionDefer {
  protected readonly page = page;
  protected readonly spacer = { height: 1600 };
}

/** 14:30 UTC through the date pipe's timezone argument, and a named zone through Intl. */
@Component({
  selector: 'x-regression-dates',
  imports: [DatePipe, NativeHeader, ScrollView, Text],
  template: `
    <native-header title="Dates in a timezone" />
    <scroll-view class="screen" [contentContainerStyle]="page.content">
      <text class="body" testID="date-utc">UTC {{ when | date: 'HH:mm' : 'UTC' }}</text>
      <text class="body" testID="date-zero">+0000 {{ when | date: 'HH:mm' : '+0000' }}</text>
      <text class="body" testID="date-five">+0500 {{ when | date: 'HH:mm' : '+0500' }}</text>
      <text class="body" testID="date-est">EST {{ when | date: 'HH:mm' : 'EST' }}</text>
      <text class="body" testID="date-named"
        >Europe/Paris {{ when | date: 'HH:mm' : 'Europe/Paris' }}</text
      >
      <text class="body" testID="date-intl">Intl Asia/Tokyo {{ tokyo }}</text>
    </scroll-view>
  `,
})
export class RegressionDates {
  protected readonly page = page;
  protected readonly when = new Date(Date.UTC(2026, 8, 25, 14, 30));
  protected readonly tokyo = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Tokyo',
    timeStyle: 'short',
  }).format(this.when);
}

/** Paragraphs in a direction rtl subtree, with no alignment, start, end and a physical side. */
@Component({
  selector: 'x-regression-rtl',
  imports: [NativeHeader, ScrollView, Text, View],
  template: `
    <native-header title="Right to left text" />
    <scroll-view class="screen" [contentContainerStyle]="page.content">
      <view class="rtl">
        <view class="row">
          <text class="box">1</text>
          <text class="box">2</text>
          <text class="box">3</text>
        </view>
        <text class="line" testID="rtl-latin">latin, no alignment</text>
        <text class="line" testID="rtl-arabic">نص عربي قصير</text>
        <text class="line start" testID="rtl-start">start</text>
        <text class="line end" testID="rtl-end">end</text>
        <text class="line left" testID="rtl-left">left stays left</text>
      </view>
      <view [style]="inline">
        <text class="line" testID="rtl-inline">inline direction rtl</text>
      </view>
      <text class="line end" testID="ltr-end">end, in left to right</text>
    </scroll-view>
  `,
  styles: `
    .rtl {
      direction: rtl;
    }
    .row {
      flex-direction: row;
      gap: 8px;
    }
    .box {
      padding: 8px;
      background-color: #ddeeff;
    }
    .line {
      margin-top: 8px;
      background-color: #eeeeee;
    }
    .start {
      text-align: start;
    }
    .end {
      text-align: end;
    }
    .left {
      text-align: left;
    }
  `,
})
export class RegressionRtl {
  protected readonly page = page;
  protected readonly inline = { direction: 'rtl' as const };
}
