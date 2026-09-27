import { Service, inject, signal } from '@angular/core';
import { Accessibility } from '@ng-native/device';

/** The app's one toast and its one loading cover, which any screen, sheet or modal can raise. */
@Service()
export class Toasts {
  readonly message = signal<string | null>(null);
  readonly loading = signal(false);
  private timer: ReturnType<typeof setTimeout> | null = null;
  private readonly accessibility = inject(Accessibility);

  /**
   * Shown, and spoken: a presented sheet is modal to a screen reader, so a toast drawn above it
   * in the overlay is never reached by moving through the screen.
   */
  show(message: string, ms = 2500): void {
    if (this.timer) clearTimeout(this.timer);
    this.message.set(message);
    this.accessibility.announce(message);
    this.timer = setTimeout(() => this.message.set(null), ms);
  }

  dismiss(): void {
    if (this.timer) clearTimeout(this.timer);
    this.message.set(null);
  }

  /** Cover everything, touches included, while `work` runs. */
  async while<T>(work: Promise<T>): Promise<T> {
    this.loading.set(true);
    try {
      return await work;
    } finally {
      this.loading.set(false);
    }
  }
}
