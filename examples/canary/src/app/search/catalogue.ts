import { Service, signal } from '@angular/core';

export type Scope = 'all' | 'album' | 'artist' | 'song';

export interface CatalogueItem {
  readonly id: string;
  readonly kind: Exclude<Scope, 'all'>;
  readonly title: string;
  readonly subtitle: string;
}

const ARTISTS = [
  'Miles Davis',
  'John Coltrane',
  'Nina Simone',
  'Bill Evans',
  'Ella Fitzgerald',
  'Chet Baker',
];
const WORDS = [
  'Blue',
  'Night',
  'Train',
  'Moon',
  'River',
  'Kind',
  'Giant',
  'Steps',
  'Autumn',
  'Sketches',
  'Round',
  'Midnight',
];

function build(): CatalogueItem[] {
  const items: CatalogueItem[] = ARTISTS.map((name, i) => ({
    id: `r${i}`,
    kind: 'artist',
    title: name,
    subtitle: 'Artist',
  }));
  for (let i = 0; i < 1200; i++) {
    const a = WORDS[i % WORDS.length]!;
    const b = WORDS[(i * 7 + 3) % WORDS.length]!;
    const artist = ARTISTS[i % ARTISTS.length]!;
    const kind = i % 5 === 0 ? 'album' : 'song';
    items.push({
      id: `i${i}`,
      kind,
      title: `${a} ${b} ${i}`,
      subtitle: `${kind === 'album' ? 'Album' : 'Song'} by ${artist}`,
    });
  }
  return items;
}

/** The catalogue on the device, for filtering as the user types. */
export const CATALOGUE: readonly CatalogueItem[] = build();

export function matches(item: CatalogueItem, query: string, scope: Scope): boolean {
  if (scope !== 'all' && item.kind !== scope) return false;
  const q = query.trim().toLowerCase();
  return !q || item.title.toLowerCase().includes(q) || item.subtitle.toLowerCase().includes(q);
}

/**
 * The store's search, over the network: slow, each request taking longer than the one before it
 * so an answer can overtake another, and able to fail. What it finds that the device does not
 * have is the "more in the store" section.
 */
@Service()
export class StoreSearch {
  latency = 500;
  failing = false;
  /** Requests made and requests cancelled, which is how a test sees debouncing and cancellation. */
  requests = 0;
  cancelled = 0;

  find(query: string, scope: Scope, signal?: AbortSignal): Promise<CatalogueItem[]> {
    this.requests++;
    // Shorter queries are slower here, so a stale answer can arrive after a fresh one.
    const delay = this.latency + Math.max(0, 6 - query.length) * 60;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        if (this.failing) return reject(new Error('The store is unreachable'));
        resolve(
          Array.from({ length: 8 }, (_, i) => ({
            id: `s-${query}-${i}`,
            kind: scope === 'all' ? (['album', 'song', 'artist'] as const)[i % 3]! : scope,
            title: `${query} (store ${i + 1})`,
            subtitle: 'In the store',
          })),
        );
      }, delay);
      signal?.addEventListener('abort', () => {
        clearTimeout(timer);
        this.cancelled++;
        reject(Object.assign(new Error('Aborted'), { name: 'AbortError' }));
      });
    });
  }
}

/** Searches the user has made, most recent first, kept across visits to the page. */
@Service()
export class RecentSearches {
  readonly items = signal<readonly string[]>(['Coltrane', 'Blue Train']);

  remember(query: string): void {
    const q = query.trim();
    if (!q) return;
    this.items.update((items) =>
      [q, ...items.filter((item) => item.toLowerCase() !== q.toLowerCase())].slice(0, 6),
    );
  }

  forget(query: string): void {
    this.items.update((items) => items.filter((item) => item !== query));
  }
}
