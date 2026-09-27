/**
 * A page's blocks, rendered.
 *
 * Prose arrives as HTML that was rendered at build time and goes in with `[innerHTML]`; an
 * example arrives as a name and becomes an island. See `build/markdown.ts` for why a page is a
 * list of blocks rather than one string.
 *
 * `bypassSecurityTrustHtml` is safe here in the strict sense the name asks for: this HTML is
 * markdown from this repository, compiled by this build, never anything a reader supplied. It is
 * needed rather than optional because Angular's sanitiser strips `style` attributes, and Shiki
 * puts every token's two theme colours in one - so sanitised code blocks come out unhighlighted.
 */
import { Component, computed, inject, input } from '@angular/core';
import { DomSanitizer, type SafeHtml } from '@angular/platform-browser';
import type { DocBlock } from '../build/markdown.ts';
import { ApiReference } from './api-reference.ts';
import { DocExample, type LoadedExample } from './example.ts';
import { exampleLoader } from './examples.ts';

type Rendered =
  | { readonly kind: 'html'; readonly html: SafeHtml }
  | {
      readonly kind: 'example';
      readonly name: string;
      readonly load: () => Promise<LoadedExample>;
    }
  | { readonly kind: 'api'; readonly reference: string };

@Component({
  selector: 'doc-content',
  imports: [ApiReference, DocExample],
  template: `
    @for (item of items(); track $index) {
      @switch (item.kind) {
        @case ('html') {
          <div [innerHTML]="item.html"></div>
        }
        @case ('api') {
          <api-reference [reference]="item.reference" />
        }
        @default {
          <doc-example [name]="item.name" [load]="item.load" />
        }
      }
    }
  `,
  host: { class: 'prose block' },
})
export class DocContent {
  private readonly sanitizer = inject(DomSanitizer);

  readonly blocks = input.required<readonly DocBlock[]>();

  /**
   * Built once per page rather than per change-detection pass, because both halves are compared
   * by identity downstream: a fresh `SafeHtml` would rewrite every paragraph's `innerHTML`, and a
   * fresh loader would look like a changed input to `doc-example` and remount the island under
   * the reader.
   */
  protected readonly items = computed<Rendered[]>(() =>
    this.blocks().map((block) => {
      if (block.kind === 'html') {
        return { kind: 'html', html: this.sanitizer.bypassSecurityTrustHtml(block.html) } as const;
      }
      if (block.kind === 'api') return { kind: 'api', reference: block.reference } as const;
      return { kind: 'example', name: block.name, load: exampleLoader(block.name) } as const;
    }),
  );
}
