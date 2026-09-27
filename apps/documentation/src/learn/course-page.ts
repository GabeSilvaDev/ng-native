/**
 * `/learn`: what the course builds, and its lessons in order with how far the learner has got.
 */
import { Component, effect, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { COURSE_TITLE, LESSONS, type CourseLesson } from './course.ts';
import { LearnProgress } from './progress.ts';
import { Seo } from '../seo.ts';
import { SITE_NAME } from '../site.ts';

const DESCRIPTION =
  'Build a habit tracker with Angular Native in your browser: real components, native CSS, Tailwind and tests, on an iOS and Android preview.';

@Component({
  selector: 'learn-course-page',
  imports: [RouterLink],
  template: `
    <div class="mx-auto max-w-3xl px-5 pt-10 pb-24">
      <p class="text-sm font-medium text-brand">Learn</p>
      <h1 class="mt-2 font-display text-4xl font-semibold tracking-tight text-fg">{{ title }}</h1>
      <div class="prose mt-5 max-w-2xl">
        <p>
          One app, built a lesson at a time. You write Angular in the editor and it runs beside you
          in a browser preview: the real Angular Native components, with iOS, Android and dark mode
          a switch away. Each step has checks that run as you type.
        </p>
        <p>
          The course assumes you know modern Angular: standalone components, signals, control flow,
          dependency injection and Signal Forms. It teaches how they work with native views. There
          is nothing to install.
        </p>
      </div>

      <ol class="mt-10 flex flex-col gap-3">
        @for (lesson of lessons; track lesson.slug) {
          <li>
            @if (lesson.planned) {
              <div class="flex gap-4 rounded-xl border border-dashed border-border-default p-5">
                <span class="font-display text-2xl font-semibold text-fg-quaternary">{{
                  lesson.number
                }}</span>
                <div>
                  <h2 class="font-medium text-fg-tertiary">{{ lesson.title }}</h2>
                  <p class="mt-1 text-sm text-fg-tertiary">{{ lesson.summary }} Not written yet.</p>
                </div>
              </div>
            } @else {
              <a
                [routerLink]="'/learn/' + lesson.slug"
                class="flex gap-4 rounded-xl border border-border-subtle p-5 transition-colors hover:border-border-strong hover:bg-surface-raised"
              >
                <span class="font-display text-2xl font-semibold text-fg-tertiary">{{
                  lesson.number
                }}</span>
                <div class="min-w-0 flex-1">
                  <h2 class="font-medium text-fg">{{ lesson.title }}</h2>
                  <p class="mt-1 text-sm text-fg-secondary">{{ lesson.summary }}</p>
                </div>
                @if (status(lesson); as label) {
                  <span class="self-center text-xs font-medium text-emerald-600">{{ label }}</span>
                }
              </a>
            }
          </li>
        }
      </ol>
    </div>
  `,
})
export class CoursePage {
  private readonly progress = inject(LearnProgress);

  protected readonly title = COURSE_TITLE;
  protected readonly lessons = LESSONS;

  constructor() {
    const seo = inject(Seo);
    effect(() =>
      seo.apply({
        title: `Learn ${SITE_NAME}: ${COURSE_TITLE}`,
        description: DESCRIPTION,
        path: '/learn',
        type: 'website',
      }),
    );
  }

  /** "Done", or how many steps are done, or nothing for a lesson not started. */
  protected status(lesson: CourseLesson): string {
    const saved = this.progress.get(lesson.slug);
    if (!saved?.done.length) return '';
    return `${saved.done.length} ${saved.done.length === 1 ? 'step' : 'steps'} done`;
  }
}
