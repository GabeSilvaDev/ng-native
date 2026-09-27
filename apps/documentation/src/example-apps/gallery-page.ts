/**
 * `/examples`: every example app, as a card with a screenshot from a device.
 */
import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LandingPhone } from '../landing/phone.ts';
import { Seo } from '../seo.ts';
import { SITE_NAME } from '../site.ts';
import { EXAMPLE_APPS } from './registry.ts';

const DESCRIPTION =
  'Complete apps built with Angular Native, running on iOS and Android, with their source and the commands to run them.';

@Component({
  selector: 'example-gallery-page',
  imports: [LandingPhone, RouterLink],
  template: `
    <div class="mx-auto max-w-5xl px-5 pt-10 pb-24">
      <p class="text-sm font-medium text-brand">Examples</p>
      <h1 class="mt-2 font-display text-4xl font-semibold tracking-tight text-fg">
        Apps built with Angular Native
      </h1>
      <div class="prose mt-5 max-w-2xl">
        <p>
          Complete apps, each a folder in the repository: Angular components on native screens, with
          the router, forms, storage and tests a real app needs. Read the code here, or clone it and
          run it on your own phone.
        </p>
      </div>

      <ul class="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        @for (app of apps; track app.slug) {
          <li>
            <a
              [routerLink]="'/examples/' + app.slug"
              class="group flex h-full flex-col overflow-hidden rounded-xl border border-border-subtle transition-colors hover:border-border-strong"
              [attr.data-example]="app.slug"
            >
              @if (app.screenshots[0]; as shot) {
                <div
                  class="flex h-80 justify-center overflow-hidden border-b border-border-subtle bg-surface-sunken px-10 pt-9 transition-colors group-hover:bg-surface-raised"
                >
                  <landing-phone
                    class="w-48 shrink-0 transition-transform duration-300 group-hover:-translate-y-1"
                    [platform]="shot.platform"
                    [src]="shot.src"
                    [alt]="app.title + ', ' + shot.screen + ' screen'"
                  />
                </div>
              }
              <div class="flex flex-1 flex-col p-5">
                <h2 class="font-display text-lg font-semibold tracking-tight text-fg">
                  {{ app.title }}
                </h2>
                <p class="mt-1.5 text-sm text-fg-secondary">{{ app.pitch }}</p>
                <ul class="mt-4 flex flex-wrap gap-1.5" aria-label="What it shows">
                  @for (feature of app.features; track feature.label) {
                    <li
                      class="rounded-full border border-border-subtle px-2.5 py-0.5 text-xs text-fg-secondary"
                    >
                      {{ feature.label }}
                    </li>
                  }
                </ul>
              </div>
            </a>
          </li>
        }
      </ul>
    </div>
  `,
})
export class ExampleGalleryPage {
  protected readonly apps = EXAMPLE_APPS;

  constructor() {
    inject(Seo).apply({
      title: `Examples - ${SITE_NAME}`,
      description: DESCRIPTION,
      path: '/examples',
      type: 'website',
      breadcrumbs: [
        { title: 'Home', path: '/' },
        { title: 'Examples', path: '/examples' },
      ],
    });
  }
}
