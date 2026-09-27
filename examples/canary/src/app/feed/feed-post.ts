import { Component, computed, effect, input, output, signal, viewChild } from '@angular/core';
import { Image, Pressable, ScrollView, Text, View } from '@ng-native/components';
import type { NativeSyntheticEvent } from '@ng-native/fabric';
import type { Post, PostImage } from './feed-backend.ts';

/**
 * A post's images, paged sideways inside a row that scrolls vertically.
 *
 * The row is recycled, so the native scroll view here is the one the previous post in this slot
 * left at some page. The page each post was on is kept outside the row, and put back whenever the
 * row is handed a different post; otherwise a recycled gallery opens on another post's page.
 */
@Component({
  selector: 'x-feed-gallery',
  imports: [Image, ScrollView, Text, View],
  template: `
    <view class="gallery" (layout)="onLayout($event)">
      <scroll-view
        #pager
        [horizontal]="true"
        [pagingEnabled]="true"
        [showsHorizontalScrollIndicator]="false"
        [style]="frame()"
        (momentumScrollEnd)="onSettled($event)"
      >
        @for (image of images(); track image.uri) {
          <image [source]="{ uri: image.uri }" [style]="frame()" resizeMode="cover" />
        }
      </scroll-view>
      <text class="counter">{{ page() + 1 }}/{{ images().length }}</text>
    </view>
  `,
  styles: `
    .gallery {
      border-radius: 10px;
      overflow: hidden;
      background-color: var(--card-inset);
    }
    .counter {
      position: absolute;
      right: 8px;
      top: 8px;
      padding: 2px 8px;
      border-radius: 10px;
      color: rgb(255, 255, 255);
      background-color: rgba(0, 0, 0, 0.55);
      font-size: 12px;
    }
  `,
})
export class FeedGallery {
  readonly postId = input.required<string>();
  readonly images = input.required<readonly PostImage[]>();
  /** The page to show when a post is handed in. */
  readonly initialPage = input(0);
  readonly pageChange = output<number>();

  private readonly pager = viewChild.required<ScrollView>('pager');
  private readonly width = signal(0);
  protected readonly page = signal(0);
  /** The first image's shape sets the gallery's, so every page is the same size. */
  protected readonly frame = computed(() => {
    const width = this.width();
    const aspect = this.images()[0]?.aspect ?? 1.5;
    return width ? { width, height: Math.round(width / aspect) } : { height: 220 };
  });

  constructor() {
    // A different post in this row: go to its page, without animating, before anyone sees it.
    effect(() => {
      this.postId();
      const page = this.initialPage();
      const width = this.width();
      this.page.set(page);
      if (width) this.pager().scrollTo({ x: page * width, animated: false });
    });
  }

  protected onLayout(event: NativeSyntheticEvent<{ layout?: { width: number } }>): void {
    const width = event.nativeEvent?.layout?.width ?? 0;
    if (width && width !== this.width()) this.width.set(width);
  }

  protected onSettled(event: NativeSyntheticEvent<{ contentOffset?: { x: number } }>): void {
    const width = this.width();
    if (!width) return;
    const page = Math.round((event.nativeEvent?.contentOffset?.x ?? 0) / width);
    if (page === this.page()) return;
    this.page.set(page);
    this.pageChange.emit(page);
  }
}

/** One post in the feed: text, a photo or a gallery, and the actions under it. */
@Component({
  selector: 'x-feed-post',
  imports: [FeedGallery, Image, Pressable, Text, View],
  template: `
    <view class="post">
      <view class="byline">
        <text class="author">{{ post().author }}</text>
        <text class="hint">{{ post().id }}</text>
      </view>
      <text class="body">{{ post().text }}</text>
      @switch (post().kind) {
        @case ('photo') {
          <image
            class="photo"
            [source]="{ uri: post().images[0]!.uri }"
            [style]="{ aspectRatio: post().images[0]!.aspect }"
            resizeMode="cover"
            accessibilityRole="image"
            [accessibilityLabel]="'Photo by ' + post().author"
          />
        }
        @case ('gallery') {
          <x-feed-gallery
            [postId]="post().id"
            [images]="post().images"
            [initialPage]="galleryPage()"
            (pageChange)="galleryPaged.emit($event)"
          />
        }
      }
      <view class="actions">
        <pressable
          class="action"
          accessibilityRole="button"
          [accessibilityLabel]="(post().liked ? 'Unlike, ' : 'Like, ') + post().likes + ' likes'"
          [accessibilityState]="{ selected: post().liked }"
          (press)="liked.emit()"
        >
          <text [class]="post().liked ? 'action-label on' : 'action-label'"
            >{{ post().liked ? 'Liked' : 'Like' }} {{ post().likes }}</text
          >
        </pressable>
        <pressable
          class="action"
          accessibilityRole="button"
          [accessibilityLabel]="post().bookmarked ? 'Remove bookmark' : 'Bookmark'"
          [accessibilityState]="{ selected: post().bookmarked }"
          (press)="bookmarked.emit()"
        >
          <text [class]="post().bookmarked ? 'action-label on' : 'action-label'">{{
            post().bookmarked ? 'Saved' : 'Save'
          }}</text>
        </pressable>
        <pressable
          class="action"
          accessibilityRole="button"
          accessibilityLabel="Edit"
          (press)="edited.emit()"
        >
          <text class="action-label">Edit</text>
        </pressable>
        <pressable
          class="action"
          accessibilityRole="button"
          accessibilityLabel="Delete"
          (press)="removed.emit()"
        >
          <text class="action-label danger">Delete</text>
        </pressable>
      </view>
    </view>
  `,
  styles: `
    .post {
      background-color: var(--card);
      padding: 14px;
      gap: 10px;
      margin-bottom: 8px;
    }
    .byline {
      flex-direction: row;
      justify-content: space-between;
    }
    .author {
      color: var(--text-strong);
      font-weight: 700;
      font-size: 15px;
    }
    .photo {
      width: 100%;
      border-radius: 10px;
      background-color: var(--card-inset);
    }
    .actions {
      flex-direction: row;
      gap: 18px;
    }
    .action {
      padding: 6px 0;
    }
    .action-label {
      color: var(--text-muted);
      font-size: 14px;
      font-weight: 600;
    }
    .on {
      color: var(--accent);
    }
  `,
})
export class FeedPost {
  readonly post = input.required<Post>();
  readonly galleryPage = input(0);
  readonly liked = output<void>();
  readonly bookmarked = output<void>();
  readonly edited = output<void>();
  readonly removed = output<void>();
  readonly galleryPaged = output<number>();
}
