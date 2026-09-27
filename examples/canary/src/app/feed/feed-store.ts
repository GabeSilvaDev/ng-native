import { Injectable, computed, inject, signal } from '@angular/core';
import { FeedBackend, type Post } from './feed-backend.ts';

/** What the end of the feed is doing. */
export type PageState = 'idle' | 'loading' | 'failed' | 'done';

const numberOf = (post: Post): number => Number(post.id.slice(1));

/**
 * The feed's state, for one visit to the feed: the posts, paging, refreshing, and optimistic
 * likes and bookmarks with rollback.
 *
 * Posts are immutable and replaced on change, so a row bound to one post re-renders only when
 * that post changes. Every request remembers which feed it was made for (`generation`), so a
 * response that arrives after the feed was reset is dropped rather than applied to the new one.
 */
@Injectable()
export class FeedStore {
  private readonly backend = inject(FeedBackend);

  readonly posts = signal<readonly Post[]>([]);
  readonly pageState = signal<PageState>('idle');
  readonly refreshing = signal(false);
  /** The last thing that went wrong that the user should hear about. */
  readonly notice = signal<string | null>(null);
  /** Posts that arrived at the top while the user was reading further down. */
  readonly unseen = signal(0);
  readonly initialLoading = computed(
    () => this.posts().length === 0 && this.pageState() === 'loading',
  );

  /** How many page requests have been made, which is how a test sees duplicates. */
  pageRequests = 0;
  /** Where the next page starts: undefined before the first, null at the end. */
  private next: number | null | undefined = undefined;
  private generation = 0;
  /** What the server last confirmed for each post, to roll an optimistic change back to. */
  private readonly confirmed = new Map<string, { liked: boolean; bookmarked: boolean }>();
  /** The latest request per post and field; an older one failing late must not roll back. */
  private readonly latest = new Map<string, number>();
  private sequence = 0;
  /** The gallery page each post was left on, so a recycled row can put it back. */
  private readonly galleryPages = new Map<string, number>();

  /** Load the next page, unless one is loading or there is none. */
  async loadMore(): Promise<void> {
    const state = this.pageState();
    if (state === 'loading' || state === 'done' || this.next === null) return;
    const generation = this.generation;
    this.pageState.set('loading');
    this.pageRequests++;
    try {
      const page = await this.backend.page(this.next ?? null);
      if (generation !== this.generation) return;
      this.next = page.next;
      this.remember(page.posts);
      this.posts.update((posts) => [...posts, ...this.fresh(posts, page.posts)]);
      this.pageState.set(page.next === null ? 'done' : 'idle');
    } catch {
      if (generation !== this.generation) return;
      this.pageState.set('failed');
    }
  }

  /** Fetch what is newer than the top post, and put it above what is there. */
  async refresh(): Promise<void> {
    if (this.refreshing()) return;
    const top = this.posts()[0];
    if (!top) return this.reset();
    const generation = this.generation;
    this.refreshing.set(true);
    try {
      const arrived = await this.backend.newer(numberOf(top));
      if (generation !== this.generation) return;
      this.remember(arrived);
      const fresh = this.fresh(this.posts(), arrived);
      this.posts.update((posts) => [...fresh, ...posts]);
      this.unseen.update((count) => count + fresh.length);
    } catch {
      if (generation === this.generation) this.notice.set('Could not refresh the feed');
    } finally {
      if (generation === this.generation) this.refreshing.set(false);
    }
  }

  /** Start again from the newest post, dropping anything still in flight. */
  async reset(): Promise<void> {
    this.generation++;
    this.next = undefined;
    this.posts.set([]);
    this.pageState.set('idle');
    this.refreshing.set(false);
    this.unseen.set(0);
    await this.loadMore();
  }

  /** Fill the feed with pages at once, for a stress run past a few thousand posts. */
  async loadMany(count: number): Promise<void> {
    const latency = this.backend.latency;
    this.backend.latency = 0;
    try {
      while (this.posts().length < count && this.pageState() !== 'done') {
        await this.loadMore();
        if (this.pageState() === 'failed') break;
      }
    } finally {
      this.backend.latency = latency;
    }
  }

  toggleLike(id: string): void {
    const post = this.find(id);
    if (!post) return;
    const liked = !post.liked;
    this.patch(id, { liked, likes: post.likes + (liked ? 1 : -1) });
    this.send(id, 'like', () => this.backend.setLiked(id, liked), {
      apply: (confirmed) => (confirmed.liked = liked),
      restore: (current, confirmed) =>
        current.liked === confirmed.liked
          ? {}
          : { liked: confirmed.liked, likes: current.likes + (confirmed.liked ? 1 : -1) },
      failure: 'Could not like the post',
    });
  }

  toggleBookmark(id: string): void {
    const post = this.find(id);
    if (!post) return;
    const bookmarked = !post.bookmarked;
    this.patch(id, { bookmarked });
    this.send(id, 'bookmark', () => this.backend.setBookmarked(id, bookmarked), {
      apply: (confirmed) => (confirmed.bookmarked = bookmarked),
      restore: (_current, confirmed) => ({ bookmarked: confirmed.bookmarked }),
      failure: 'Could not save the bookmark',
    });
  }

  remove(id: string): void {
    this.posts.update((posts) => posts.filter((post) => post.id !== id));
  }

  /** Replace a post with an edited copy, as a server push of an edit would. */
  edit(id: string): void {
    const post = this.find(id);
    if (!post) return;
    this.patch(id, {
      revision: post.revision + 1,
      text: `${post.text.replace(/ \(edited \d+\)$/, '')} (edited ${post.revision + 1})`,
    });
  }

  galleryPage(id: string): number {
    return this.galleryPages.get(id) ?? 0;
  }

  setGalleryPage(id: string, page: number): void {
    this.galleryPages.set(id, page);
  }

  markSeen(): void {
    this.unseen.set(0);
  }

  dismissNotice(): void {
    this.notice.set(null);
  }

  private send(
    id: string,
    field: 'like' | 'bookmark',
    request: () => Promise<void>,
    handlers: {
      apply: (confirmed: { liked: boolean; bookmarked: boolean }) => void;
      restore: (current: Post, confirmed: { liked: boolean; bookmarked: boolean }) => Partial<Post>;
      failure: string;
    },
  ): void {
    const key = `${id}:${field}`;
    const mine = ++this.sequence;
    this.latest.set(key, mine);
    request().then(
      () => {
        const confirmed = this.confirmed.get(id);
        if (confirmed) handlers.apply(confirmed);
      },
      () => {
        // A later tap has its own request in flight, and that one decides the outcome.
        if (this.latest.get(key) !== mine) return;
        const current = this.find(id);
        const confirmed = this.confirmed.get(id);
        if (current && confirmed) this.patch(id, handlers.restore(current, confirmed));
        this.notice.set(handlers.failure);
      },
    );
  }

  private find(id: string): Post | undefined {
    return this.posts().find((post) => post.id === id);
  }

  /** Replace one post, leaving every other post the same object. */
  private patch(id: string, change: Partial<Post>): void {
    if (Object.keys(change).length === 0) return;
    this.posts.update((posts) => {
      const at = posts.findIndex((post) => post.id === id);
      if (at === -1) return posts;
      const next = posts.slice();
      next[at] = { ...posts[at]!, ...change };
      return next;
    });
  }

  private remember(posts: readonly Post[]): void {
    for (const post of posts) {
      this.confirmed.set(post.id, { liked: post.liked, bookmarked: post.bookmarked });
    }
  }

  /** Posts not already in the feed: a page can overlap one that arrived through a refresh. */
  private fresh(existing: readonly Post[], incoming: readonly Post[]): Post[] {
    const ids = new Set(existing.map((post) => post.id));
    return incoming.filter((post) => !ids.has(post.id));
  }
}
