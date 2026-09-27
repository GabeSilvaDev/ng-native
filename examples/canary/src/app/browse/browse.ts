import { Component, computed, inject, signal, viewChild } from '@angular/core';
import {
  Pressable,
  RefreshControl,
  Text,
  View,
  VirtualList,
  VirtualListRow,
} from '@ng-native/components';
import type { NativeSyntheticEvent } from '@ng-native/fabric';
import { NativeHeader, NativeNavigation } from '@ng-native/router';
import { BrowseShelf } from './browse-shelf.ts';
import { ShelfPositions, rowsOf, shelves, type Album, type BrowseRow } from './browse-shelves.ts';

/** How far down, in points, before the "Top" button shows. */
const FAR = 900;

/**
 * A browse screen, as a music or streaming app's is: a vertical list of shelves, each a
 * horizontal list of its own, with each genre's heading pinned while its shelf scrolls past.
 * Chips jump to a genre, "Top" comes back, pull to refresh reloads, and every shelf keeps its
 * sideways position through recycling, a refresh and a visit to an album.
 */
@Component({
  selector: 'x-browse',
  imports: [
    BrowseShelf,
    NativeHeader,
    Pressable,
    RefreshControl,
    Text,
    View,
    VirtualList,
    VirtualListRow,
  ],
  providers: [ShelfPositions],
  template: `
    <native-header title="Browse" />
    <view class="screen">
      <view class="toolbar">
        @for (genre of jumps; track genre.index) {
          <pressable
            class="chip"
            accessibilityRole="button"
            [accessibilityLabel]="'Jump to ' + genre.name"
            (press)="jumpTo(genre.index)"
          >
            <text class="chip-label">{{ genre.name }}</text>
          </pressable>
        }
      </view>
      <virtual-list
        #page
        class="list"
        [items]="rows()"
        [estimatedItemHeight]="estimate"
        [keyExtractor]="keyOf"
        [itemType]="kindOf"
        [stickyIndices]="headings()"
        [scrollEventThrottle]="16"
        (scroll)="watch($event)"
      >
        <refresh-control [refreshing]="refreshing()" (refresh)="refresh()" />
        @for (row of page.window(); track row.slot) {
          <view [virtualListRow]="row" [nativeID]="'row-' + row.key">
            @switch (row.item.kind) {
              @case ('heading') {
                <view class="heading-row">
                  <text class="section" accessibilityRole="header">{{ row.item.shelf.genre }}</text>
                </view>
              }
              @case ('shelf') {
                <x-browse-shelf [shelf]="row.item.shelf" (opened)="open($event)" />
              }
            }
          </view>
        }
      </virtual-list>
      @if (far()) {
        <pressable class="pill" accessibilityRole="button" (press)="top()">
          <text class="pill-label">Top</text>
        </pressable>
      }
    </view>
  `,
  styles: `
    .toolbar {
      flex-direction: row;
      gap: 8px;
      padding: 8px 12px 4px;
    }
    .chip {
      padding: 6px 12px;
      border-radius: 14px;
      background-color: var(--card);
    }
    .chip-label {
      color: var(--accent);
      font-size: 13px;
      font-weight: 600;
    }
    .list {
      flex: 1;
    }
    .heading-row {
      padding: 10px 16px 6px;
      background-color: var(--screen);
    }
    .section {
      color: var(--text-strong);
      font-size: 20px;
      font-weight: 700;
    }
    .pill {
      position: absolute;
      bottom: 32px;
      align-self: center;
      padding: 8px 18px;
      border-radius: 18px;
      background-color: var(--accent);
    }
    .pill-label {
      color: rgb(255, 255, 255);
      font-weight: 700;
    }
  `,
})
export class Browse {
  private readonly nav = inject(NativeNavigation);
  private readonly list = viewChild.required(VirtualList<BrowseRow>);

  protected readonly shelves = signal(shelves());
  protected readonly rows = computed(() => rowsOf(this.shelves()));
  protected readonly headings = computed(() =>
    this.rows().flatMap((row, index) => (row.kind === 'heading' ? [index] : [])),
  );
  protected readonly refreshing = signal(false);
  protected readonly far = signal(false);
  private round = 0;

  protected readonly jumps = [
    { name: 'Jazz', index: 0 },
    { name: 'Gospel', index: 8 },
    { name: 'Vocal', index: 30 },
    { name: 'Electronic', index: 46 },
  ];

  protected readonly estimate = (row: BrowseRow) => (row.kind === 'heading' ? 44 : 170);
  protected readonly keyOf = (row: BrowseRow) => `${row.kind}-${row.shelf.id}`;
  protected readonly kindOf = (row: BrowseRow) => row.kind;

  protected jumpTo(index: number): void {
    this.list().scrollToIndex({ index, animated: true });
  }

  protected top(): void {
    this.list().scrollToOffset({ offset: 0, animated: true });
  }

  /** Only a crossing of the threshold changes anything, so a fling costs no change detection. */
  protected watch(event: NativeSyntheticEvent<{ contentOffset?: { y?: number } }>): void {
    const far = (event.nativeEvent?.contentOffset?.y ?? 0) > FAR;
    if (far !== this.far()) this.far.set(far);
  }

  protected refresh(): void {
    this.refreshing.set(true);
    setTimeout(() => {
      this.shelves.set(shelves(++this.round));
      this.refreshing.set(false);
    }, 600);
  }

  protected open(album: Album): void {
    void this.nav.push(`/search-demo/${album.id}`, { state: { title: album.title } });
  }
}
