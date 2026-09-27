import { Component, DestroyRef, computed, effect, inject, resource, signal } from '@angular/core';
import {
  ActivityIndicator,
  Pressable,
  Text,
  View,
  VirtualList,
  VirtualListRow,
} from '@ng-native/components';
import {
  NativeHeader,
  NativeHeaderItem,
  NativeNavigation,
  NativeSearchBar,
} from '@ng-native/router';
import {
  CATALOGUE,
  type CatalogueItem,
  RecentSearches,
  type Scope,
  StoreSearch,
  matches,
} from './catalogue.ts';

/** Typing settles for this long before the store is asked. */
const DEBOUNCE_MS = 300;

/** A row of the results: a heading, an item, or the state of the store's search. */
type Row =
  | { readonly kind: 'heading'; readonly id: string; readonly text: string }
  | { readonly kind: 'item'; readonly id: string; readonly item: CatalogueItem }
  | {
      readonly kind: 'status';
      readonly id: string;
      readonly status: 'loading' | 'failed' | 'none';
    };

/**
 * Searching a music library, as the Music app does: what is on the device filters as the user
 * types, the store is asked once they pause, recent searches and suggestions show while the field
 * is focused, scopes narrow either, and a result opens and comes back with everything as it was.
 */
@Component({
  selector: 'x-music-search',
  imports: [
    ActivityIndicator,
    NativeHeader,
    NativeHeaderItem,
    NativeSearchBar,
    Pressable,
    Text,
    View,
    VirtualList,
    VirtualListRow,
  ],
  template: `
    <native-header title="Search" [largeTitle]="true">
      <native-header-item type="searchBar">
        <native-search-bar
          #bar
          placeholder="Artists, albums, songs"
          placement="stacked"
          [hideWhenScrolling]="false"
          autoCapitalize="none"
          [(query)]="query"
          (search)="submit($event)"
          (searchFocus)="focused.set(true)"
          (searchBlur)="focused.set(false)"
          (cancel)="focused.set(false)"
        />
      </native-header-item>
    </native-header>
    <virtual-list
      #list
      class="screen list"
      contentInsetAdjustmentBehavior="automatic"
      [items]="rows()"
      [itemHeight]="rowHeight"
      [keyExtractor]="idOf"
      keyboardDismissMode="on-drag"
    >
      <view listHeader>
        <view class="scopes">
          @for (option of scopes; track option.value) {
            <pressable
              [class]="scope() === option.value ? 'chip chip-on' : 'chip'"
              accessibilityRole="button"
              [accessibilityState]="{ selected: scope() === option.value }"
              (press)="scope.set(option.value)"
            >
              <text class="chip-label">{{ option.label }}</text>
            </pressable>
          }
        </view>

        @if (showSuggestions()) {
          <view class="suggestions">
            @if (!query().trim()) {
              <text class="hint">Recent</text>
              @for (recent of recents.items(); track recent) {
                <view class="suggestion">
                  <pressable class="grow" accessibilityRole="button" (press)="useRecent(recent)">
                    <text class="body">{{ recent }}</text>
                  </pressable>
                  <pressable
                    accessibilityRole="button"
                    [accessibilityLabel]="'Forget ' + recent"
                    (press)="recents.forget(recent)"
                  >
                    <text class="hint">Forget</text>
                  </pressable>
                </view>
              }
            } @else {
              @for (suggestion of suggestions(); track suggestion) {
                <pressable
                  class="suggestion"
                  accessibilityRole="button"
                  (press)="useRecent(suggestion)"
                >
                  <text class="body">{{ suggestion }}</text>
                </pressable>
              }
            }
          </view>
        }
      </view>
      @for (row of list.window(); track row.slot) {
        <view [virtualListRow]="row">
          @switch (row.item.kind) {
            @case ('heading') {
              <text class="heading-row">{{ row.item.text }}</text>
            }
            @case ('item') {
              <pressable class="result" accessibilityRole="button" (press)="open(row.item.item)">
                <text class="body">{{ row.item.item.title }}</text>
                <text class="hint">{{ row.item.item.subtitle }}</text>
              </pressable>
            }
            @case ('status') {
              <view class="status">
                @switch (row.item.status) {
                  @case ('loading') {
                    <activity-indicator />
                  }
                  @case ('failed') {
                    <text class="body danger">The store did not answer.</text>
                    <pressable accessibilityRole="button" (press)="remote.reload()">
                      <text class="action">Try again</text>
                    </pressable>
                  }
                  @case ('none') {
                    <text class="hint">Nothing in the store for that.</text>
                  }
                }
              </view>
            }
          }
        </view>
      }
    </virtual-list>
  `,
  styles: `
    .scopes {
      flex-direction: row;
      gap: 8px;
      padding: 8px 16px;
    }
    .chip {
      padding: 6px 12px;
      border-radius: 14px;
      background-color: var(--card);
    }
    .chip-on {
      background-color: var(--accent);
    }
    .chip-label {
      color: var(--text-strong);
      font-size: 13px;
    }
    .chip-on .chip-label {
      color: rgb(255, 255, 255);
    }
    .suggestions {
      padding: 8px 16px;
      gap: 6px;
      background-color: var(--card);
    }
    .suggestion {
      flex-direction: row;
      align-items: center;
      padding: 8px 0;
    }
    .grow {
      flex: 1;
    }
    .list {
      flex: 1;
    }
    .heading-row {
      height: 40px;
      padding: 16px 16px 4px;
      color: var(--text-strong);
      font-weight: 700;
    }
    .result {
      height: 60px;
      padding: 8px 16px;
      justify-content: center;
      border-bottom-width: 1px;
      border-bottom-color: var(--line);
    }
    .status {
      height: 60px;
      flex-direction: row;
      align-items: center;
      justify-content: center;
      gap: 12px;
    }
    .action {
      color: var(--accent);
      font-weight: 600;
    }
  `,
})
export class MusicSearch {
  private readonly store = inject(StoreSearch);
  protected readonly recents = inject(RecentSearches);
  private readonly nav = inject(NativeNavigation);

  protected readonly scopes: { value: Scope; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'artist', label: 'Artists' },
    { value: 'album', label: 'Albums' },
    { value: 'song', label: 'Songs' },
  ];
  readonly query = signal('');
  readonly scope = signal<Scope>('all');
  protected readonly focused = signal(false);

  /** The query once typing has paused, which is what the store is asked about. */
  private readonly settled = signal('');

  /**
   * The store's answer. A new query or scope cancels the request still in flight, so an answer
   * to an older query that arrives late is never shown over a newer one.
   */
  readonly remote = resource({
    params: () => {
      const q = this.settled().trim();
      return q.length >= 2 ? { q, scope: this.scope() } : undefined;
    },
    loader: ({ params, abortSignal }) => this.store.find(params.q, params.scope, abortSignal),
  });

  protected readonly local = computed(() => {
    const query = this.query();
    const scope = this.scope();
    return CATALOGUE.filter((item) => matches(item, query, scope));
  });

  /** The best of the library's matches, ahead of what the store has, as the Music app shows. */
  protected readonly top = computed(() => this.local().slice(0, 20));

  protected readonly suggestions = computed(() =>
    this.local()
      .slice(0, 5)
      .map((item) => item.title),
  );

  protected readonly showSuggestions = computed(
    () => this.focused() && this.recents.items().length > 0,
  );

  protected readonly rows = computed<Row[]>(() => {
    const rows: Row[] = [
      { kind: 'heading', id: 'h-library', text: `In your library (${this.local().length})` },
    ];
    for (const item of this.top()) rows.push({ kind: 'item', id: item.id, item });
    if (this.settled().trim().length < 2) return rows;
    rows.push({ kind: 'heading', id: 'h-store', text: 'In the store' });
    const remote = this.remote;
    if (remote.isLoading()) rows.push({ kind: 'status', id: 's-loading', status: 'loading' });
    else if (remote.error()) rows.push({ kind: 'status', id: 's-failed', status: 'failed' });
    else {
      const found = remote.value() ?? [];
      if (!found.length) rows.push({ kind: 'status', id: 's-none', status: 'none' });
      for (const item of found) rows.push({ kind: 'item', id: item.id, item });
    }
    return rows;
  });

  protected readonly idOf = (row: Row): string => row.id;
  protected readonly rowHeight = (row: Row): number => (row.kind === 'heading' ? 40 : 60);

  constructor() {
    let timer: ReturnType<typeof setTimeout> | undefined;
    effect(() => {
      const query = this.query();
      clearTimeout(timer);
      timer = setTimeout(() => this.settled.set(query), DEBOUNCE_MS);
    });
    inject(DestroyRef).onDestroy(() => clearTimeout(timer));
  }

  protected submit(query: string): void {
    this.recents.remember(query);
    this.settled.set(query);
  }

  /** A recent search or a suggestion taken: it goes in the field, and is searched at once. */
  protected useRecent(query: string): void {
    this.query.set(query);
    this.submit(query);
  }

  protected open(item: CatalogueItem): void {
    this.recents.remember(this.query());
    void this.nav.push(['/search-demo', item.id], { state: { title: item.title } });
  }
}
