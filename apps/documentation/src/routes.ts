/**
 * The home page, and everything else.
 *
 * The wildcard is not a fallback here, it is the main route: every guide page and package page is
 * a markdown file resolved from the URL by `doc-page`, so they need no entry of their own. The
 * home page is the one page that is not a document.
 *
 * Lazy, so that a reader who opened one page has downloaded one page.
 */
import type { ResolveFn, Routes } from '@angular/router';
import { loadDoc, type DocModule } from './content.ts';

/** The markdown page for the URL, or `null` when there is none: see `doc-page`'s `doc` input. */
const doc: ResolveFn<DocModule | null> = (route) => {
  const load = loadDoc(route.url.map((segment) => segment.path).join('/'));
  return load ? load().catch(() => null) : null;
};

export const routes: Routes = [
  { path: '', loadComponent: () => import('./landing/landing.ts').then((m) => m.Home) },
  // The course. Its lesson page is a workspace rather than a document, so the shell drops the
  // sidebar and footer for everything under `learn`; see `app.ts`.
  {
    path: 'learn',
    loadComponent: () => import('./learn/course-page.ts').then((m) => m.CoursePage),
  },
  {
    path: 'learn/:slug',
    loadComponent: () => import('./learn/lesson-page.ts').then((m) => m.LessonPage),
  },
  // The example apps: a gallery, and a page for each with its code. See `example-apps/registry.ts`.
  {
    path: 'examples',
    loadComponent: () => import('./example-apps/gallery-page.ts').then((m) => m.ExampleGalleryPage),
  },
  {
    path: 'examples/:slug',
    loadComponent: () => import('./example-apps/example-app-page.ts').then((m) => m.ExampleAppPage),
  },
  {
    path: '**',
    loadComponent: () => import('./doc-page.ts').then((m) => m.DocPage),
    resolve: { doc },
  },
];
