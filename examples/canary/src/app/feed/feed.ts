import {
  Component,
  type OnInit,
  effect,
  inject,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  Text,
  View,
  VirtualList,
  VirtualListRow,
  type VirtualListVisiblePosition,
} from '@ng-native/components';
import { Engine, type NativeSyntheticEvent } from '@ng-native/fabric';
import { NativeHeader } from '@ng-native/router';
import { FeedBackend, type Post } from './feed-backend.ts';
import { FeedPost } from './feed-post.ts';
import { FeedStore } from './feed-store.ts';

/** How far down, in points, the user has to be before new posts wait behind a pill. */
const READING = 40;

/**
 * An infinite feed of text posts, photos and galleries, as a social app's home screen is.
 *
 * Rows size themselves: nothing here knows how tall a post is. Pages load as the end comes into
 * view, pull to refresh puts newer posts on top without moving the one being read, and likes and
 * bookmarks change at once and roll back if the server refuses them.
 */
@Component({
  selector: 'x-feed',
  imports: [
    ActivityIndicator,
    FeedPost,
    NativeHeader,
    Pressable,
    RefreshControl,
    Text,
    View,
    VirtualList,
    VirtualListRow,
  ],
  providers: [FeedStore],
  template: `
    <native-header title="Feed" />
    <view class="screen">
      <view class="toolbar">
        <pressable class="chip" accessibilityRole="button" (press)="arrive()">
          <text class="chip-label">3 new</text>
        </pressable>
        <pressable class="chip" accessibilityRole="button" (press)="fill()">
          <text class="chip-label">5,000 posts</text>
        </pressable>
        <pressable
          class="chip"
          accessibilityRole="switch"
          [accessibilityState]="{ checked: offline() }"
          (press)="toggleOffline()"
        >
          <text class="chip-label">{{ offline() ? 'Offline' : 'Online' }}</text>
        </pressable>
        <pressable class="chip" accessibilityRole="button" (press)="sample()">
          <text class="chip-label">Stats</text>
        </pressable>
      </view>
      <text class="hint stats">{{ store.posts().length }} posts. {{ stats() }}</text>

      @if (store.initialLoading()) {
        <view class="centre"><activity-indicator size="large" /></view>
      } @else if (store.posts().length === 0 && store.pageState() === 'failed') {
        <view class="centre">
          <text class="body">The feed could not be loaded.</text>
          <pressable class="button" accessibilityRole="button" (press)="store.reset()">
            <text class="button-label">Try again</text>
          </pressable>
        </view>
      } @else {
        <virtual-list
          #feed
          class="list"
          [items]="store.posts()"
          [estimatedItemHeight]="estimate"
          [keyExtractor]="idOf"
          [itemType]="kindOf"
          [maintainVisibleContentPosition]="hold"
          [endReachedThreshold]="3"
          (endReached)="store.loadMore()"
          (scroll)="onScroll($event)"
        >
          <refresh-control [refreshing]="store.refreshing()" (refresh)="store.refresh()" />
          @for (row of feed.window(); track row.slot) {
            <view [virtualListRow]="row">
              <x-feed-post
                [post]="row.item"
                [galleryPage]="store.galleryPage(row.item.id)"
                (liked)="store.toggleLike(row.item.id)"
                (bookmarked)="store.toggleBookmark(row.item.id)"
                (edited)="store.edit(row.item.id)"
                (removed)="store.remove(row.item.id)"
                (galleryPaged)="store.setGalleryPage(row.item.id, $event)"
              />
            </view>
          }
          <view listFooter class="footer">
            @switch (store.pageState()) {
              @case ('loading') {
                <activity-indicator />
              }
              @case ('failed') {
                <text class="body">Could not load more posts.</text>
                <pressable class="button" accessibilityRole="button" (press)="store.loadMore()">
                  <text class="button-label">Retry</text>
                </pressable>
              }
              @case ('done') {
                <text class="hint">You are all caught up.</text>
              }
            }
          </view>
        </virtual-list>
      }

      @if (store.unseen() > 0 && reading()) {
        <pressable class="pill" accessibilityRole="button" (press)="showNew()">
          <text class="pill-label">{{ store.unseen() }} new posts</text>
        </pressable>
      }
      @if (store.notice(); as notice) {
        <pressable class="toast" accessibilityRole="alert" (press)="store.dismissNotice()">
          <text class="toast-label">{{ notice }}</text>
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
    .stats {
      padding: 0 12px 6px;
    }
    .list {
      flex: 1;
    }
    .centre {
      flex: 1;
      align-items: center;
      justify-content: center;
      gap: 12px;
    }
    .footer {
      padding: 24px;
      align-items: center;
      gap: 10px;
    }
    .pill {
      position: absolute;
      top: 64px;
      align-self: center;
      padding: 8px 16px;
      border-radius: 18px;
      background-color: var(--accent);
    }
    .pill-label {
      color: rgb(255, 255, 255);
      font-weight: 700;
    }
    .toast {
      position: absolute;
      left: 16px;
      right: 16px;
      bottom: 32px;
      padding: 14px;
      border-radius: 12px;
      background-color: rgb(40, 40, 48);
    }
    .toast-label {
      color: rgb(255, 255, 255);
    }
  `,
})
export class FeedPage implements OnInit {
  protected readonly store = inject(FeedStore);
  private readonly backend = inject(FeedBackend);
  private readonly engine = inject(Engine);
  private readonly feed = viewChild<VirtualList<Post>>('feed');

  protected readonly hold: VirtualListVisiblePosition = {
    minIndexForVisible: 0,
    autoscrollToTopThreshold: READING,
  };
  protected readonly idOf = (post: Post): string => post.id;
  /** Text, photo and gallery rows each recycle into their own kind. */
  protected readonly kindOf = (post: Post): string => post.kind;
  /** A guess from what is known before layout: the text's length and the images' shape. */
  protected readonly estimate = (post: Post): number => {
    const lines = Math.ceil(post.text.length / 42);
    const media = post.images.length ? 360 / (post.images[0]!.aspect || 1.5) : 0;
    return 110 + lines * 21 + media;
  };

  protected readonly offline = signal(false);
  /** Whether the user has scrolled away from the top: written only when that changes. */
  protected readonly reading = signal(false);
  protected readonly stats = signal('');

  constructor() {
    // Posts that arrive while the list is at its top are on screen already: nothing is unseen.
    effect(() => {
      if (this.store.unseen() > 0 && !this.reading()) untracked(() => this.store.markSeen());
    });
  }

  ngOnInit(): void {
    void this.store.loadMore();
  }

  protected onScroll(event: NativeSyntheticEvent<{ contentOffset?: { y?: number } }>): void {
    const reading = (event.nativeEvent?.contentOffset?.y ?? 0) > READING;
    if (reading !== this.reading()) this.reading.set(reading);
    if (!reading && this.store.unseen()) this.store.markSeen();
  }

  protected showNew(): void {
    this.store.markSeen();
    this.feed()?.scrollToOffset({ offset: 0, animated: true });
  }

  /** New posts arriving while the user reads, as a server push would deliver them. */
  protected arrive(): void {
    void this.store.refresh();
  }

  protected fill(): void {
    void this.store.loadMany(5000);
  }

  protected toggleOffline(): void {
    this.offline.set(!this.offline());
    this.backend.offline = this.offline();
  }

  protected sample(): void {
    const stats = this.engine.stats;
    const round = (value: number) => Math.round(value * 10) / 10;
    this.stats.set(
      `${stats.commits} commits, worst ${round(stats.worstCommitMs)}ms, ` +
        `${stats.slowCommits} slow, ${stats.createdNodes} created, ${stats.clonedNodes} cloned`,
    );
  }
}
