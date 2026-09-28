/**
 * Search over the documentation, from the index Pagefind writes into `dist/pagefind` after the
 * prerender (see the build script in package.json).
 *
 * The index is static files next to the site, so nothing here talks to a service: the first
 * search loads Pagefind's own script from the site and it fetches only the index fragments a term
 * needs. It covers the doc pages alone, because `doc-page.ts` is the one template carrying
 * `data-pagefind-body`. A development server has no index, and says so rather than finding nothing.
 */
import { Component, ElementRef, signal, viewChild } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideSearch } from '@ng-icons/lucide';

/** The part of Pagefind's browser API this uses. */
interface Pagefind {
  debouncedSearch(term: string): Promise<{ results: PagefindResult[] } | null>;
}

interface PagefindResult {
  data(): Promise<{ url: string; excerpt: string; meta: { title?: string } }>;
}

interface Hit {
  readonly url: string;
  readonly title: string;
  readonly excerpt: string;
}

/** A URL rather than a module specifier, so the bundler leaves it for the browser to load. */
const PAGEFIND = '/pagefind/pagefind.js';
const LIMIT = 8;

@Component({
  selector: 'docs-search',
  imports: [NgIcon],
  providers: [provideIcons({ lucideSearch })],
  template: `
    <button
      type="button"
      class="inline-flex size-8 items-center justify-center rounded-md text-fg-tertiary transition-colors hover:bg-surface-raised hover:text-fg"
      aria-label="Search the documentation"
      aria-keyshortcuts="Meta+K Control+K"
      title="Search (⌘K)"
      (click)="open()"
    >
      <ng-icon name="lucideSearch" class="text-base" />
    </button>

    <dialog
      #dialog
      class="mx-auto mt-[12vh] w-[min(40rem,calc(100%-2rem))] rounded-xl border border-border-subtle bg-surface p-0 text-fg shadow-2xl backdrop:bg-black/50 backdrop:backdrop-blur-sm"
      aria-label="Search the documentation"
      (click)="closeOnBackdrop($event)"
    >
      <div class="flex items-center gap-3 border-b border-border-subtle px-4">
        <ng-icon name="lucideSearch" class="shrink-0 text-lg text-fg-tertiary" />
        <input
          #input
          type="search"
          class="h-14 min-w-0 flex-1 bg-transparent text-base text-fg outline-none placeholder:text-fg-tertiary [&::-webkit-search-cancel-button]:hidden"
          placeholder="Search the docs"
          aria-label="Search the docs"
          autocomplete="off"
          spellcheck="false"
          (input)="search(input.value)"
          (keydown.enter)="openFirst($event)"
        />
      </div>

      @if (state() === 'unavailable') {
        <p class="px-4 py-8 text-center text-sm text-fg-tertiary">
          The search index is built with the site, so it is only in a production build.
        </p>
      } @else if (state() === 'empty') {
        <p class="px-4 py-8 text-center text-sm text-fg-tertiary">Nothing matches that.</p>
      } @else if (hits().length) {
        <ul class="max-h-[60vh] overflow-auto p-2" (click)="close()">
          @for (hit of hits(); track hit.url) {
            <li>
              <a
                [href]="hit.url"
                class="block rounded-lg px-3 py-2.5 transition-colors hover:bg-surface-raised focus-visible:bg-surface-raised focus-visible:outline-none"
              >
                <span class="block text-sm font-medium text-fg">{{ hit.title }}</span>
                <span
                  class="mt-0.5 line-clamp-2 block text-[13px] text-fg-secondary [&_mark]:bg-transparent [&_mark]:font-medium [&_mark]:text-brand"
                  [innerHTML]="hit.excerpt"
                ></span>
              </a>
            </li>
          }
        </ul>
      }
    </dialog>
  `,
  host: { '(document:keydown)': 'openOnShortcut($event)' },
})
export class DocsSearch {
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');
  private readonly input = viewChild.required<ElementRef<HTMLInputElement>>('input');

  protected readonly hits = signal<readonly Hit[]>([]);
  protected readonly state = signal<'idle' | 'empty' | 'unavailable'>('idle');

  private pagefind?: Promise<Pagefind | null>;

  protected open(): void {
    this.dialog().nativeElement.showModal();
    this.input().nativeElement.select();
  }

  protected close(): void {
    this.dialog().nativeElement.close();
  }

  protected openOnShortcut(event: KeyboardEvent): void {
    if (event.key.toLowerCase() !== 'k' || !(event.metaKey || event.ctrlKey)) return;
    event.preventDefault();
    this.open();
  }

  /** A click on the dialog element itself, rather than inside it, is a click on the backdrop. */
  protected closeOnBackdrop(event: MouseEvent): void {
    if (event.target === this.dialog().nativeElement) this.close();
  }

  /** Enter takes the reader to the best match, the way every docs search behaves. */
  protected openFirst(event: Event): void {
    const first = this.dialog().nativeElement.querySelector<HTMLAnchorElement>('li a');
    if (!first) return;
    event.preventDefault();
    first.click();
  }

  protected async search(term: string): Promise<void> {
    const pagefind = await this.load();
    if (!pagefind) {
      this.state.set('unavailable');
      return;
    }
    const found = await pagefind.debouncedSearch(term.trim());
    // null: a later keystroke replaced this search before it ran.
    if (!found) return;
    const hits = await Promise.all(found.results.slice(0, LIMIT).map((result) => result.data()));
    if (term !== this.input().nativeElement.value) return;
    this.hits.set(
      hits.map((hit) => ({
        url: routeFor(hit.url),
        title: hit.meta.title ?? '',
        excerpt: hit.excerpt,
      })),
    );
    this.state.set(term.trim() && !hits.length ? 'empty' : 'idle');
  }

  private load(): Promise<Pagefind | null> {
    this.pagefind ??= import(/* @vite-ignore */ PAGEFIND).then(
      (module: Pagefind) => module,
      () => null,
    );
    return this.pagefind;
  }
}

/** Pagefind names a page by its file's folder, `/guide/offline/`; the router's name has no slash. */
export function routeFor(url: string): string {
  return url.replace(/(.)\/(?=$|#)/, '$1');
}
