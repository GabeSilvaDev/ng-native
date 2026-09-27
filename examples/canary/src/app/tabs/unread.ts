import { Service, signal } from '@angular/core';

/**
 * A count two components share: the profile tab changes it, the tab bar shows it.
 *
 * `@Service()` needs no `providedIn` and no providers array - importing it and injecting it is
 * the whole setup.
 */
@Service()
export class Unread {
  readonly count = signal(2);

  add(): void {
    this.count.update((value) => value + 1);
  }

  clear(): void {
    this.count.set(0);
  }
}
