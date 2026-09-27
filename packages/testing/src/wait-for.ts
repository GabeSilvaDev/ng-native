/**
 * `waitFor`, as Testing Library means it: run the callback until it stops throwing, or give up and
 * throw what it last threw.
 *
 * Polled on real timers. Each wait is a macrotask, which is also what lets zoneless change
 * detection run and commit between attempts, so a retry sees the next frame rather than the same
 * one again.
 *
 * ponytail: real timers only. Under a fake clock the interval never elapses; advance the clock
 * yourself, or use `settle()`, until someone needs the Jest/Vitest timer integration.
 */
/** How long `waitFor`, and every `findBy` query, keeps trying. */
export interface WaitForOptions {
  /** How long to keep trying, in milliseconds. Default 1000. */
  timeout?: number;
  /** How long between attempts, in milliseconds. Default 50. */
  interval?: number;
}

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Retry `callback` until it returns without throwing, and resolve to what it returned.
 *
 * Rejects with the callback's last error once `timeout` has passed, so a failing `waitFor` reads
 * like the assertion inside it rather than like a timeout.
 */
export async function waitFor<T>(
  callback: () => T | Promise<T>,
  { timeout = 1000, interval = 50 }: WaitForOptions = {},
): Promise<T> {
  const deadline = Date.now() + timeout;
  for (;;) {
    try {
      return await callback();
    } catch (error) {
      if (Date.now() >= deadline) throw error;
    }
    await sleep(interval);
  }
}
