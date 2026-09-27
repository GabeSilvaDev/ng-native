import { DestroyRef, Injectable, inject, signal } from '@angular/core';
import { ChatBackend, type ChatMessage } from './chat-backend.ts';

/**
 * One conversation: its transcript newest first (the order an inverted list draws bottom up),
 * sending with retry, older history on demand, and Sam typing and replying.
 */
@Injectable()
export class ChatStore {
  private readonly backend = inject(ChatBackend);

  readonly messages = signal<readonly ChatMessage[]>([]);
  readonly loadingOlder = signal(false);
  readonly reachedStart = signal(false);
  readonly typing = signal(false);
  /** Requests for history, which is how a test sees a duplicate. */
  historyRequests = 0;

  private before: number | null | undefined = undefined;
  private sent = 0;
  private replies = 0;
  private live: ReturnType<typeof setInterval> | null = null;
  private readonly timers = new Set<ReturnType<typeof setTimeout>>();

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      this.stopLive();
      for (const timer of this.timers) clearTimeout(timer);
    });
  }

  /** The next page of older messages, unless one is on its way or there are none. */
  async loadOlder(): Promise<void> {
    if (this.loadingOlder() || this.before === null) return;
    this.loadingOlder.set(true);
    this.historyRequests++;
    try {
      const page = await this.backend.history(this.before ?? null);
      this.before = page.before;
      this.messages.update((messages) => [...messages, ...page.messages]);
      this.reachedStart.set(page.before === null);
    } finally {
      this.loadingOlder.set(false);
    }
  }

  send(text: string): void {
    const trimmed = text.trim();
    if (!trimmed) return;
    const message: ChatMessage = {
      id: `m${++this.sent}`,
      from: 'me',
      text: trimmed,
      sentAt: Date.now(),
      state: 'sending',
    };
    this.messages.update((messages) => [message, ...messages]);
    this.deliver(message);
  }

  retry(id: string): void {
    const message = this.messages().find((candidate) => candidate.id === id);
    if (!message || message.state !== 'failed') return;
    this.replace(id, { state: 'sending' });
    this.deliver(message);
  }

  /** Sam starts typing, and a moment later the message arrives. */
  receive(after = 1200): void {
    this.typing.set(true);
    this.later(after, () => {
      this.typing.set(false);
      const reply = this.backend.reply(++this.replies);
      this.messages.update((messages) => [reply, ...messages]);
    });
  }

  /** A message every `every` milliseconds, for reading and scrolling while they arrive. */
  startLive(every = 1500): void {
    this.stopLive();
    this.live = setInterval(() => this.receive(400), every);
  }

  stopLive(): void {
    if (this.live) clearInterval(this.live);
    this.live = null;
  }

  get isLive(): boolean {
    return this.live !== null;
  }

  private deliver(message: ChatMessage): void {
    this.backend.send(message).then(
      () => this.replace(message.id, { state: 'sent' }),
      () => this.replace(message.id, { state: 'failed' }),
    );
  }

  private replace(id: string, change: Partial<ChatMessage>): void {
    this.messages.update((messages) => {
      const at = messages.findIndex((message) => message.id === id);
      if (at === -1) return messages;
      const next = messages.slice();
      next[at] = { ...messages[at]!, ...change };
      return next;
    });
  }

  private later(delay: number, run: () => void): void {
    const timer = setTimeout(() => {
      this.timers.delete(timer);
      run();
    }, delay);
    this.timers.add(timer);
  }
}
