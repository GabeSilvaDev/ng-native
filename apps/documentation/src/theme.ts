/**
 * Which palette the page is wearing.
 *
 * This owns the `dark` class on the document root, which is what every palette on the page is
 * selected by - the site's own chrome tokens in `styles.css`, and the same tokens a live example
 * reads through Tailwind's `dark:` variant. Setting the class here therefore themes the examples
 * too, without any of them being told.
 *
 * The preference is stored, because a reader who chose dark meant it for more than this page.
 * `index.html` reads the same key before first paint so the choice survives a reload without a
 * white flash.
 */
import { Service, signal } from '@angular/core';

const KEY = 'angular-native-docs-theme';

export type Scheme = 'light' | 'dark';

@Service()
export class DocsTheme {
  private readonly current = signal<Scheme>(read());

  readonly scheme = this.current.asReadonly();

  toggle(): void {
    this.set(this.current() === 'dark' ? 'light' : 'dark');
  }

  private set(scheme: Scheme): void {
    this.current.set(scheme);
    document.documentElement.classList.toggle('dark', scheme === 'dark');
    try {
      localStorage.setItem(KEY, scheme);
    } catch {
      // Private browsing refuses to store anything. The class is already set, so the choice holds
      // for this page; it just will not survive a reload, which is the most that can be offered.
    }
  }
}

/**
 * The class `index.html` already put on the root, read back rather than recomputed.
 *
 * Recomputing it from `localStorage` and `prefers-color-scheme` would duplicate that script's
 * logic in a second place, and the two would eventually disagree about what happens when storage
 * throws. The class is the answer; this reads the answer.
 */
function read(): Scheme {
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
}
