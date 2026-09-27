/**
 * The end of the page: one line, and the ways onward.
 *
 * Type only, centred under the mark - the page has shown enough phones by here, and the hero's
 * are the ones a reader remembers. The red underline under "every screen" is the same hand as the
 * hero's under "Angular".
 */
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LINKS } from './content.ts';
import { underline } from './ink.ts';
import { LandingMark } from './mark.ts';

@Component({
  selector: 'landing-final-cta',
  imports: [LandingMark, RouterLink],
  template: `
    <section aria-labelledby="cta-title">
      <div
        class="mx-auto flex max-w-[56rem] flex-col items-center px-[var(--gutter)] py-32 text-center"
      >
        <landing-mark class="size-14" />
        <h2
          id="cta-title"
          class="landing-display mt-8 text-[clamp(2.6rem,5.4vw,4.6rem)] text-balance"
        >
          Your Angular app belongs on
          <span class="relative inline-block"
            >every screen.<svg
              class="absolute -bottom-[0.14em] left-0 h-[0.22em] w-full overflow-visible"
              viewBox="0 0 100 10"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <path class="ink-red ink-stretch cta-rule" [attr.d]="rule" /></svg
          ></span>
        </h2>
        <div class="mt-12 flex flex-wrap items-center justify-center gap-3">
          <a class="landing-button" data-kind="primary" [routerLink]="links.getStarted"
            >Get started</a
          >
          <a class="landing-button" data-kind="secondary" [routerLink]="links.docs"
            >Read the docs</a
          >
          <a class="landing-button" data-kind="secondary" [href]="links.github">Star on GitHub</a>
        </div>
        <div class="mt-8 flex flex-wrap justify-center gap-x-8 gap-y-3 text-sm">
          <a class="landing-link" [routerLink]="links.examples">Browse the examples</a>
          <a class="landing-link" [href]="links.issues">Open an issue</a>
        </div>
        <p class="mt-10 text-sm text-graphite">
          Angular Native is free, MIT licensed and built in the open.
          <a class="landing-link" [routerLink]="links.sponsor">Sponsor its development</a>.
        </p>
      </div>
    </section>
  `,
})
export class LandingFinalCta {
  protected readonly links = LINKS;
  protected readonly rule = underline(0, 6, 100, 404);
}
