/**
 * A sheet of source, laid on the page like a printout: the real file, highlighted.
 *
 * The code is never transcribed. It is the example's own text, read off disk and highlighted by
 * `build/source.ts` at build time, so the component shown and the component running beside it
 * cannot drift apart.
 *
 * What the page asks of it:
 * - `lit` marks every line containing one of the given strings;
 * - `focus` scrolls the sheet so the line holding that token sits in the middle of it, for a
 *   sheet shorter than its file;
 * - `locate` answers where a piece of text is on screen, for a thread to start from.
 */
import {
  Component,
  ElementRef,
  afterRenderEffect,
  computed,
  inject,
  input,
  viewChild,
} from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { prefersReducedMotion } from './ink.ts';

@Component({
  selector: 'landing-code',
  template: `
    <div class="code-sheet">
      <div class="code-sheet-head">
        <span class="code-sheet-file">{{ file() }}</span>
        <ng-content select="[sheet-note]" />
      </div>
      <div #body class="code-sheet-body" [style.max-height]="maxHeight()">
        <div class="relative min-w-max">
          <div #content [innerHTML]="trusted()"></div>
        </div>
      </div>
      <ng-content />
    </div>
  `,
  host: { class: 'block min-w-0' },
})
export class LandingCode {
  private readonly sanitizer = inject(DomSanitizer);
  private readonly body = viewChild.required<ElementRef<HTMLElement>>('body');
  private readonly content = viewChild.required<ElementRef<HTMLElement>>('content');

  readonly html = input.required<string>();
  readonly file = input('app.ts');
  readonly lit = input<readonly string[]>([]);
  readonly focus = input<string | null>(null);
  readonly maxHeight = input<string | null>(null);

  // Trusted rather than sanitised: Shiki writes each token's colours into a `style` attribute,
  // which Angular's sanitiser strips. The HTML is generated at build time from the repository's
  // own files, not from anything a visitor supplies.
  protected readonly trusted = computed(() => this.sanitizer.bypassSecurityTrustHtml(this.html()));

  constructor() {
    afterRenderEffect(() => {
      this.trusted();
      const lit = this.lit();
      for (const line of this.content().nativeElement.querySelectorAll<HTMLElement>('.line')) {
        const text = line.textContent ?? '';
        line.classList.toggle(
          'is-lit',
          lit.some((token) => text.includes(token)),
        );
      }
    });

    afterRenderEffect(() => {
      const token = this.focus();
      if (!token) return;
      const body = this.body().nativeElement;
      const rect = this.locate(token, this.content().nativeElement);
      if (!rect) return;
      body.scrollTo({
        top: Math.max(0, rect.top - body.clientHeight / 2 + rect.height),
        behavior: prefersReducedMotion() ? 'auto' : 'smooth',
      });
    });
  }

  /**
   * Where the first occurrence of `text` sits, relative to `origin`'s top-left corner, or null
   * if the code does not contain it. Read on layout changes, never during an animation frame.
   */
  locate(text: string, origin: Element): DOMRect | null {
    // Shiki splits a token like `(press)` across several spans, so the search runs over the
    // concatenated text and the match is mapped back onto whichever nodes it spans.
    const walker = document.createTreeWalker(this.content().nativeElement, NodeFilter.SHOW_TEXT);
    const nodes: { node: Node; start: number }[] = [];
    let content = '';
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      nodes.push({ node, start: content.length });
      content += node.textContent ?? '';
    }
    const at = content.indexOf(text);
    if (at < 0) return null;
    const find = (offset: number) => {
      let found = nodes[0]!;
      for (const entry of nodes) if (entry.start <= offset) found = entry;
      return found;
    };
    const first = find(at);
    const last = find(at + text.length - 1);
    const range = document.createRange();
    range.setStart(first.node, at - first.start);
    range.setEnd(last.node, at + text.length - last.start);
    const rect = range.getBoundingClientRect();
    const base = origin.getBoundingClientRect();
    return new DOMRect(rect.left - base.left, rect.top - base.top, rect.width, rect.height);
  }
}
