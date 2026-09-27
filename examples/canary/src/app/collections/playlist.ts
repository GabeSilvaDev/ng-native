import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import {
  Pressable,
  Text,
  TextInput,
  View,
  VirtualList,
  VirtualListRow,
} from '@ng-native/components';
import { LayoutAnimation } from '@ng-native/device';
import { NativeHeader } from '@ng-native/router';
import {
  type PlaylistRow,
  type Track,
  initialTracks,
  makeTrack,
  moveTrack,
  rowsOf,
  shuffled,
} from './playlist-model.ts';

/**
 * A queue being edited: tracks inserted, deleted, moved up and down and between "Up next" and
 * "Later", sorted, shuffled, filtered, changed in a batch and in a burst of random changes, each
 * animated by the layout change it causes. What must hold is identity: a track's row keeps its
 * native view through all of it, and no row ever shows another track.
 */
@Component({
  selector: 'x-playlist',
  imports: [NativeHeader, Pressable, Text, TextInput, View, VirtualList, VirtualListRow],
  template: `
    <native-header title="Queue" />
    <view class="screen">
      <view class="toolbar">
        @for (action of actions; track action.label) {
          <pressable class="chip" accessibilityRole="button" (press)="action.run()">
            <text class="chip-label">{{ action.label }}</text>
          </pressable>
        }
      </view>
      <text-input
        class="field filter"
        accessibilityLabel="Filter"
        placeholder="Filter"
        [(value)]="filter"
      />
      <virtual-list
        #list
        class="list"
        [items]="rows()"
        [itemHeight]="rowHeight"
        [keyExtractor]="idOf"
      >
        @for (row of list.window(); track row.slot) {
          <view [virtualListRow]="row" [nativeID]="'row-' + row.key">
            @switch (row.item.kind) {
              @case ('heading') {
                <text class="section"
                  >{{ row.item.section === 'next' ? 'Up next' : 'Later' }} ({{
                    row.item.count
                  }})</text
                >
              }
              @case ('track') {
                <view class="track">
                  <text class="body grow">{{ row.item.track.title }}</text>
                  <pressable
                    accessibilityRole="button"
                    [accessibilityLabel]="'Move up ' + row.item.track.title"
                    (press)="up(row.item.track)"
                  >
                    <text class="action">Up</text>
                  </pressable>
                  <pressable
                    accessibilityRole="button"
                    [accessibilityLabel]="'Move ' + row.item.track.title + ' to the other section'"
                    (press)="swapSection(row.item.track)"
                  >
                    <text class="action">⇄</text>
                  </pressable>
                  <pressable
                    accessibilityRole="button"
                    [accessibilityLabel]="'Remove ' + row.item.track.title"
                    (press)="remove(row.item.track)"
                  >
                    <text class="action danger">✕</text>
                  </pressable>
                </view>
              }
            }
          </view>
        }
      </virtual-list>
    </view>
  `,
  styles: `
    .toolbar {
      flex-direction: row;
      flex-wrap: wrap;
      gap: 6px;
      padding: 8px 12px;
    }
    .chip {
      padding: 6px 10px;
      border-radius: 14px;
      background-color: var(--card);
    }
    .chip-label {
      color: var(--accent);
      font-size: 13px;
      font-weight: 600;
    }
    .filter {
      margin: 0 12px 8px;
    }
    .list {
      flex: 1;
    }
    .section {
      height: 36px;
      padding: 10px 16px 0;
      color: var(--text-strong);
      font-weight: 700;
    }
    .track {
      height: 52px;
      flex-direction: row;
      align-items: center;
      gap: 14px;
      padding: 0 16px;
      background-color: var(--card);
      border-bottom-width: 1px;
      border-bottom-color: var(--line);
    }
    .grow {
      flex: 1;
    }
    .action {
      color: var(--accent);
      font-weight: 600;
      padding: 8px 2px;
    }
  `,
})
export class Playlist {
  private readonly layout = inject(LayoutAnimation);
  readonly tracks = signal<readonly Track[]>(initialTracks());
  readonly filter = signal('');
  readonly rows = computed(() => rowsOf(this.tracks(), this.filter()));
  protected readonly idOf = (row: PlaylistRow): string => row.id;
  protected readonly rowHeight = (row: PlaylistRow): number => (row.kind === 'heading' ? 36 : 52);
  private seed = 7;
  private burst: ReturnType<typeof setInterval> | null = null;

  protected readonly actions = [
    { label: 'Insert 3', run: () => this.change((tracks) => this.insert(tracks, 3)) },
    {
      label: 'Delete 10',
      run: () => this.change((tracks) => this.deleteSpread(tracks, 10)),
    },
    {
      label: 'Sort',
      run: () =>
        this.change((tracks) => [...tracks].sort((a, b) => a.title.localeCompare(b.title))),
    },
    { label: 'Shuffle', run: () => this.change((tracks) => shuffled(tracks, this.seed++)) },
    { label: 'Reverse', run: () => this.change((tracks) => [...tracks].reverse()) },
    { label: 'Burst', run: () => this.startBurst() },
  ];

  constructor() {
    inject(DestroyRef).onDestroy(() => this.stopBurst());
  }

  up(track: Track): void {
    this.change((tracks) => {
      const at = tracks.findIndex((t) => t.id === track.id);
      let prev = at - 1;
      while (prev >= 0 && tracks[prev]!.section !== track.section) prev--;
      return prev < 0 ? tracks : moveTrack(tracks, at, prev);
    });
  }

  swapSection(track: Track): void {
    this.change((tracks) =>
      tracks.map((t) =>
        t.id === track.id ? { ...t, section: t.section === 'next' ? 'later' : 'next' } : t,
      ),
    );
  }

  remove(track: Track): void {
    this.change((tracks) => tracks.filter((t) => t.id !== track.id));
  }

  /** Every change goes through here, so each one animates the layout it causes. */
  change(edit: (tracks: readonly Track[]) => readonly Track[]): void {
    void this.layout.animate(() => this.tracks.update(edit), { duration: 250 });
  }

  /** Take out `count` tracks spread through the list, as a multiple selection deleted would. */
  private deleteSpread(tracks: readonly Track[], count: number): Track[] {
    const step = Math.max(1, Math.floor(tracks.length / count));
    let removed = 0;
    return tracks.filter((_, i) => !(i % step === 0 && removed++ < count));
  }

  private insert(tracks: readonly Track[], count: number): Track[] {
    const next = tracks.slice();
    for (let i = 0; i < count; i++) {
      const at = (this.seed++ * 13) % (next.length + 1);
      next.splice(at, 0, makeTrack(i % 2 ? 'later' : 'next'));
    }
    return next;
  }

  /** Forty random changes, one every 50 ms, which is faster than any animation finishes. */
  startBurst(): void {
    this.stopBurst();
    let left = 40;
    this.burst = setInterval(() => {
      const kind = this.seed++ % 4;
      const tracks = this.tracks();
      if (kind === 0) this.change((t) => this.insert(t, 1));
      else if (kind === 1 && tracks.length > 5)
        this.remove(tracks[(this.seed * 7) % tracks.length]!);
      else if (kind === 2 && tracks.length)
        this.swapSection(tracks[(this.seed * 3) % tracks.length]!);
      else this.change((t) => shuffled(t, this.seed++));
      if (--left === 0) this.stopBurst();
    }, 50);
  }

  private stopBurst(): void {
    if (this.burst) clearInterval(this.burst);
    this.burst = null;
  }
}
