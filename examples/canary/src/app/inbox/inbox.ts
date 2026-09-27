import { Component, InjectionToken, computed, inject, signal, viewChild } from '@angular/core';
import {
  Pressable,
  ScrollView,
  Text,
  View,
  VirtualList,
  VirtualListRow,
} from '@ng-native/components';
import { Gesture } from 'react-native-gesture-handler';
import { GestureRoot, NativeGesture } from '@ng-native/components/gestures';
import { type NativeSyntheticEvent, nativePlatform } from '@ng-native/fabric';
import { NativeHeader, NativeNavigation } from '@ng-native/router';
import { Inbox, type Mail } from './inbox-model.ts';
import { InboxNativeList } from './inbox-native-list.ts';
import { InboxRow } from './inbox-row.ts';

/**
 * How the rows swipe: `native` is SwiftUI's list with the system's own swipe actions, which iOS
 * has; `drawn` is this screen's own rows, gestures and all, which run anywhere.
 */
export const INBOX_SWIPES = new InjectionToken<'native' | 'drawn'>('INBOX_SWIPES', {
  providedIn: 'root',
  factory: () => (nativePlatform() === 'ios' ? 'native' : 'drawn'),
});

/**
 * A mail client's list. On iOS each folder is a SwiftUI list whose rows take the system's own
 * swipe actions, and the chips change folder. Elsewhere the gestures compete: each row swipes
 * sideways to archive or delete inside a list that scrolls vertically, inside a pager that also
 * scrolls sideways between the two folders, under a navigation stack whose edge swipe goes back.
 * A row also takes a tap and a press-and-hold, which starts selecting.
 */
@Component({
  selector: 'x-inbox',
  imports: [
    GestureRoot,
    InboxNativeList,
    InboxRow,
    NativeGesture,
    NativeHeader,
    Pressable,
    ScrollView,
    Text,
    View,
    VirtualList,
    VirtualListRow,
  ],
  template: `
    <native-header title="Mail" />
    <gesture-root>
      <view class="screen">
        <view class="toolbar">
          @if (inbox.selecting()) {
            <text class="body grow">{{ inbox.selected().size }} selected</text>
            <pressable class="chip" accessibilityRole="button" (press)="inbox.archiveSelected()">
              <text class="chip-label">Archive</text>
            </pressable>
            <pressable class="chip" accessibilityRole="button" (press)="inbox.clearSelection()">
              <text class="chip-label">Cancel</text>
            </pressable>
          } @else {
            @for (folder of folders(); track folder.page) {
              <pressable
                class="chip"
                [class.current]="page() === folder.page"
                accessibilityRole="tab"
                [accessibilityState]="{ selected: page() === folder.page }"
                (press)="showPage(folder.page)"
              >
                <text class="chip-label">{{ folder.label }}</text>
              </pressable>
            }
          }
        </view>
        <scroll-view
          #pager
          class="pager"
          [horizontal]="true"
          [pagingEnabled]="true"
          [scrollEnabled]="!native"
          [showsHorizontalScrollIndicator]="false"
          [gesture]="pagerGesture"
          (layout)="onLayout($event)"
          (momentumScrollEnd)="onPaged($event)"
        >
          @for (folder of folders(); track folder.page) {
            <view [style]="pageStyle()">
              @if (native) {
                <x-inbox-native-list
                  [mails]="folder.mails"
                  [size]="pageSize()"
                  (opened)="open($event)"
                  (archived)="inbox.archiveMail($event.id)"
                  (removed)="inbox.remove($event.id)"
                />
              } @else {
                <virtual-list
                  #list
                  class="list"
                  [items]="folder.mails"
                  [itemHeight]="84"
                  [keyExtractor]="idOf"
                >
                  @for (row of list.window(); track row.slot) {
                    <view [virtualListRow]="row">
                      <x-inbox-row
                        [mail]="row.item"
                        [selected]="inbox.selected().has(row.item.id)"
                        [outer]="pagerGesture"
                        (opened)="open(row.item)"
                        (held)="inbox.toggleSelected(row.item.id)"
                        (archived)="inbox.archiveMail(row.item.id)"
                        (removed)="inbox.remove(row.item.id)"
                      />
                    </view>
                  }
                </virtual-list>
              }
            </view>
          }
        </scroll-view>
      </view>
    </gesture-root>
  `,
  styles: `
    .toolbar {
      flex-direction: row;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      min-height: 48px;
    }
    .grow {
      flex: 1;
    }
    .chip {
      padding: 6px 12px;
      border-radius: 14px;
      background-color: var(--card);
    }
    .current {
      background-color: var(--card-inset);
    }
    .chip-label {
      color: var(--accent);
      font-size: 13px;
      font-weight: 600;
    }
    .pager {
      flex: 1;
    }
    .list {
      flex: 1;
    }
  `,
})
export class InboxPage {
  private readonly nav = inject(NativeNavigation);
  private readonly pager = viewChild.required(ScrollView);

  protected readonly inbox = new Inbox();
  /**
   * SwiftUI's list swipes its rows with a recogniser of its own, which the pager's drag would win
   * every time; like Mail, the folders change from the chips instead.
   */
  protected readonly native = inject(INBOX_SWIPES) === 'native';
  /** The pager's own drag, which each row's swipe blocks until it fails. */
  protected readonly pagerGesture = Gesture.Native();
  protected readonly page = signal(0);
  private readonly width = signal(0);
  /** The pager's height, which a page takes: a SwiftUI list, unlike the drawn one, has none. */
  private readonly height = signal<number | undefined>(undefined);
  protected readonly pageSize = computed(() => ({ width: this.width(), height: this.height() }));
  protected readonly pageStyle = computed(() => ({
    width: this.width(),
    height: this.height(),
    flex: 1,
  }));
  protected readonly folders = computed(() => [
    { page: 0, label: `Inbox (${this.inbox.inbox().length})`, mails: this.inbox.inbox() },
    { page: 1, label: `Archive (${this.inbox.archive().length})`, mails: this.inbox.archive() },
  ]);
  protected readonly idOf = (mail: Mail) => mail.id;

  protected showPage(page: number): void {
    this.page.set(page);
    this.pager().scrollTo({ x: page * this.width(), animated: true });
  }

  protected onLayout(
    event: NativeSyntheticEvent<{ layout?: { width?: number; height?: number } }>,
  ): void {
    this.width.set(event.nativeEvent?.layout?.width ?? 0);
    this.height.set(event.nativeEvent?.layout?.height);
  }

  protected onPaged(event: NativeSyntheticEvent<{ contentOffset?: { x?: number } }>): void {
    const width = this.width();
    if (width) this.page.set(Math.round((event.nativeEvent?.contentOffset?.x ?? 0) / width));
  }

  /** In selection mode a tap adds to the selection; otherwise it opens the message. */
  protected open(mail: Mail): void {
    if (this.inbox.selecting()) {
      this.inbox.toggleSelected(mail.id);
      return;
    }
    this.inbox.markRead(mail.id);
    void this.nav.push(['/search-demo', mail.id], { state: { title: mail.subject } });
  }
}
