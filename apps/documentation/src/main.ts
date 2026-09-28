/**
 * The entry point, and the one place on this site that is an ordinary Angular application.
 *
 * `bootstrapApplication`, not `mount`: the site's own chrome is a document - a header, a
 * sidebar, articles, anchors - and Angular's DOM renderer is what draws those. The components the
 * site is *about* cannot be drawn that way, and are not: each one is mounted separately by
 * `doc-example`, into a container of its own, through `mount`. See `example.ts`.
 *
 * Zoneless, like everything else in this project. `provideZonelessChangeDetection` here mirrors
 * what `mount` provides for each island, so the two halves of the page agree about how change
 * detection runs even though they have separate injectors.
 */
import { bootstrapApplication } from '@angular/platform-browser';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideRouter, withComponentInputBinding, withInMemoryScrolling } from '@angular/router';
import { App } from './app.ts';
import { routes } from './routes.ts';
import './styles.css';

void bootstrapApplication(App, {
  providers: [
    provideZonelessChangeDetection(),
    provideRouter(
      routes,
      // Anchor scrolling so a `#heading` link from the contents column lands on the heading, and
      // no position restoration because every navigation here is to a different document.
      withInMemoryScrolling({ anchorScrolling: 'enabled', scrollPositionRestoration: 'top' }),
      // A lesson reads its slug as an input.
      withComponentInputBinding(),
    ),
  ],
});
