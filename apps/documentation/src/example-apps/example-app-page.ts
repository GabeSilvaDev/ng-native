/**
 * `/examples/<slug>`: one example app - its screens, what it shows, its code and how to run it.
 */
import { Component, computed, effect, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LandingPhone } from '../landing/phone.ts';
import { Seo } from '../seo.ts';
import { GITHUB_REPO, SITE_NAME } from '../site.ts';
import { ExampleCodeBrowser } from './code-browser.ts';
import { exampleApp, type ExampleScreenshot } from './registry.ts';

@Component({
  selector: 'example-app-page',
  imports: [ExampleCodeBrowser, LandingPhone, RouterLink],
  template: `
    <div class="mx-auto max-w-6xl px-5 pt-10 pb-24">
      <a
        routerLink="/examples"
        class="text-sm font-medium text-brand underline-offset-4 hover:underline"
        >Examples</a
      >
      @if (app(); as app) {
        <div class="mt-2 flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
          <h1 class="font-display text-4xl font-semibold tracking-tight text-fg">
            {{ app.title }}
          </h1>
          <a
            class="inline-flex h-9 items-center rounded-md border border-border-default px-3.5 text-sm font-medium text-fg transition-colors hover:border-border-strong hover:bg-surface-raised"
            [href]="folderUrl()"
            >View on GitHub</a
          >
        </div>
        <p class="mt-5 max-w-3xl text-[1.0625rem] leading-relaxed text-fg-secondary">
          {{ app.summary }}
        </p>

        <ul
          class="-mx-5 mt-8 flex snap-x scroll-px-5 gap-8 overflow-x-auto px-5 pt-4 pb-16 sm:gap-9"
          aria-label="Screenshots"
        >
          @for (shot of app.screenshots; track shot.src) {
            <li class="w-44 shrink-0 snap-start sm:w-48">
              <figure>
                <landing-phone
                  [platform]="shot.platform"
                  [src]="shot.src"
                  [alt]="app.title + ', ' + caption(shot)"
                  [eager]="$first"
                />
                <figcaption class="mt-4 text-center text-xs text-fg-tertiary">
                  {{ caption(shot) }}
                </figcaption>
              </figure>
            </li>
          }
        </ul>

        <div class="mt-4 grid grid-cols-1 gap-12 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
          <section aria-labelledby="shows">
            <h2 id="shows" class="font-display text-xl font-semibold tracking-tight text-fg">
              What it shows
            </h2>
            <ul
              class="mt-5 flex flex-col divide-y divide-border-subtle border-y border-border-subtle"
            >
              @for (feature of app.features; track feature.label) {
                <li>
                  <a
                    [routerLink]="feature.docs"
                    class="group flex flex-col gap-0.5 py-3 sm:flex-row sm:gap-6"
                  >
                    <span
                      class="shrink-0 text-sm font-medium text-fg transition-colors group-hover:text-brand sm:w-36"
                      >{{ feature.label }}</span
                    >
                    <span class="text-sm text-fg-secondary">{{ feature.detail }}</span>
                  </a>
                </li>
              }
            </ul>
          </section>

          <section aria-labelledby="run">
            <h2 id="run" class="font-display text-xl font-semibold tracking-tight text-fg">
              Run it
            </h2>
            <p class="mt-3 text-sm text-fg-secondary">
              Clone the repository and start the app with Expo. Press i for the iOS simulator, a for
              the Android emulator, or scan the code with Expo Go.
            </p>
            <pre
              class="shiki mt-4"
              data-commands
            ><code>@for (line of commands(); track $index) {<span class="block"><span class="mr-2 opacity-50 select-none" aria-hidden="true">$</span>{{ line }}</span>}</code></pre>
          </section>
        </div>

        <section class="mt-16" aria-labelledby="code">
          <h2 id="code" class="font-display text-xl font-semibold tracking-tight text-fg">
            The code
          </h2>
          <p class="mt-3 mb-5 text-sm text-fg-secondary">
            Every file in the app, as it is in the repository.
          </p>
          <example-code-browser
            [slug]="app.slug"
            [sourceRoot]="app.sourceRoot"
            [entry]="app.entry"
          />
        </section>
      } @else {
        <h1 class="mt-2 font-display text-4xl font-semibold tracking-tight text-fg">
          No such example
        </h1>
        <p class="mt-5 text-fg-secondary">
          There is no example app at this address.
          <a routerLink="/examples" class="text-fg underline underline-offset-2">See them all</a>.
        </p>
      }
    </div>
  `,
})
export class ExampleAppPage {
  private readonly seo = inject(Seo);

  /** From the route, through the router's input binding. */
  readonly slug = input.required<string>();

  protected readonly app = computed(() => exampleApp(this.slug()));

  protected readonly folderUrl = computed(
    () => `${GITHUB_REPO}/tree/main/${this.app()?.sourceRoot ?? 'examples'}`,
  );

  protected readonly commands = computed(() => [
    `git clone ${GITHUB_REPO}.git`,
    'cd angular-native && pnpm install',
    `cd ${this.app()?.sourceRoot ?? 'examples'} && pnpm start`,
  ]);

  constructor() {
    effect(() => this.describePage());
  }

  protected caption(shot: ExampleScreenshot): string {
    const platform = shot.platform === 'ios' ? 'iOS' : 'Android';
    return `${shot.screen}, ${platform}, ${shot.scheme}`;
  }

  private describePage(): void {
    const app = this.app();
    if (!app) {
      this.seo.notFound();
      return;
    }
    this.seo.apply({
      title: `${app.title} example - ${SITE_NAME}`,
      description: app.pitch,
      path: `/examples/${app.slug}`,
      type: 'article',
      breadcrumbs: [
        { title: 'Home', path: '/' },
        { title: 'Examples', path: '/examples' },
        { title: app.title, path: `/examples/${app.slug}` },
      ],
    });
  }
}
