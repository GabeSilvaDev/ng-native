/**
 * A command someone is meant to run, with a button that copies it.
 *
 * Horizontally scrollable rather than wrapped, so a long command stays one pasteable line on a
 * phone. The confirmation is announced once, politely, and only when a copy actually happened.
 */
import { Component, input, signal } from '@angular/core';

@Component({
  selector: 'landing-command',
  template: `
    <div class="landing-command">
      <span class="text-graphite select-none" aria-hidden="true">$</span>
      <code tabindex="0" [attr.aria-label]="'Command: ' + command()">{{ command() }}</code>
      <button type="button" class="landing-command-copy" (click)="copy()">
        {{ copied() ? 'Copied' : 'Copy' }}
      </button>
      <span class="sr-only" aria-live="polite">{{
        copied() ? 'Copied to the clipboard' : ''
      }}</span>
    </div>
  `,
  host: { class: 'block min-w-0' },
})
export class LandingCommand {
  readonly command = input.required<string>();

  protected readonly copied = signal(false);
  private reset?: ReturnType<typeof setTimeout>;

  protected async copy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.command());
    } catch {
      // No clipboard permission (an insecure origin, or a browser that refused): the command is
      // still selectable, so say nothing rather than claim a copy that did not happen.
      return;
    }
    this.copied.set(true);
    clearTimeout(this.reset);
    this.reset = setTimeout(() => this.copied.set(false), 1800);
  }
}
