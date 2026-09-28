/**
 * The hero: the claim, and one Angular component running on both platforms.
 *
 * The phones are three apps, fanned - `examples/vault.ts`, `player.ts` and `fitness.ts` - each a
 * screenshot of real native views on the iOS simulator or the Android emulator. The pointer tilts
 * the fan by a few degrees at most; not on touch, and not under reduced motion.
 */
import { Component, ElementRef, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LandingCommand } from './command.ts';
import { CREATE_COMMAND, LINKS, STATUS } from './content.ts';
import { LandingPhone, type DevicePlatform } from './phone.ts';
import { prefersReducedMotion, underline } from './ink.ts';

@Component({
  selector: 'landing-hero',
  imports: [LandingCommand, LandingPhone, RouterLink],
  template: `
    <section
      class="relative mx-auto max-w-[80rem] px-[var(--gutter)] pt-10 pb-20 lg:pt-16"
      [class.hero-intro]="intro"
      aria-labelledby="hero-title"
    >
      <div class="grid items-center gap-x-8 gap-y-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <!-- ============================================================ The claim -->
        <div class="relative z-10 min-w-0 lg:pt-8">
          <p class="landing-eyebrow hero-rise flex items-center gap-3" style="--i: 0">
            <span>Angular Native</span>
            <span aria-hidden="true">·</span>
            <span>Now in {{ status.stage }}</span>
          </p>
          <h1 id="hero-title" class="landing-display mt-5 text-[clamp(2.7rem,5vw,4.5rem)]">
            <span class="hero-rise block whitespace-nowrap" style="--i: 1">Build native apps</span>
            <span class="hero-rise block" style="--i: 2">
              with
              <span class="relative inline-block"
                >Angular.<svg
                  class="absolute -bottom-[0.12em] left-0 h-[0.2em] w-full overflow-visible"
                  viewBox="0 0 100 10"
                  preserveAspectRatio="none"
                  aria-hidden="true"
                >
                  <path class="ink-red ink-stretch hero-thread" [attr.d]="headlineRule" /></svg
              ></span>
            </span>
          </h1>
          <p class="landing-prose hero-rise mt-7" style="--i: 3">
            Angular components that render as real <code>UIView</code> and
            <code>android.view.View</code>, built and shipped with Expo. Write templates, signals
            and services as you do on the web, and style them with CSS and Tailwind.
          </p>

          <div class="hero-rise mt-8 flex flex-wrap items-center gap-3" style="--i: 4">
            <a class="landing-button" data-kind="primary" [routerLink]="links.getStarted">
              Get started
              <svg viewBox="0 0 16 16" class="size-4" aria-hidden="true">
                <path
                  d="M3 8h9.5M9 4.5 12.5 8 9 11.5"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.6"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            </a>
            <a class="landing-button" data-kind="secondary" [href]="links.github">View on GitHub</a>
          </div>

          <landing-command
            class="hero-rise mt-6 max-w-[34rem]"
            style="--i: 5"
            [command]="command"
          />
          <p class="hero-rise mt-3 text-sm text-graphite" style="--i: 6">
            Angular {{ status.angular }} · Expo {{ status.expo }} · iOS and Android
          </p>
        </div>

        <!-- ============================================================ The proof -->
        <!--
          Three apps, fanned: a bank, a music player, a fitness tracker. Each phone is a capture of
          one of src/examples, running as real native views - two on the iOS simulator, one on the
          Android emulator - and the caption says which.
        -->
        <figure class="relative min-w-0">
          <div #devices class="hero-fan" (pointermove)="tilt($event)" (pointerleave)="level()">
            <div class="hero-glow" aria-hidden="true"></div>
            <div class="hero-fan-inner">
              @for (phone of phones; track phone.shot) {
                <landing-phone
                  class="hero-phone"
                  [attr.data-slot]="phone.slot"
                  [platform]="phone.platform"
                  [shot]="phone.shot"
                  [alt]="phone.alt"
                  [eager]="true"
                />
              }
            </div>
          </div>
          <figcaption class="hero-fan-caption">
            Real screenshots · iOS simulator and Android emulator
          </figcaption>
        </figure>
      </div>
    </section>
  `,
})
export class LandingHero {
  private readonly devices = viewChild.required<ElementRef<HTMLElement>>('devices');

  protected readonly links = LINKS;
  protected readonly status = STATUS;
  protected readonly command = CREATE_COMMAND;
  protected readonly phones: {
    slot: 'left' | 'centre' | 'right';
    platform: DevicePlatform;
    shot: string;
    alt: string;
  }[] = [
    {
      slot: 'left',
      platform: 'ios',
      shot: 'vault',
      alt: 'A dark banking app home screen, with a gradient card and a week of spending, on iOS',
    },
    {
      slot: 'centre',
      platform: 'ios',
      shot: 'player',
      alt: 'A music player with drawn sunset album art, a scrubber and playback controls, on iOS',
    },
    {
      slot: 'right',
      platform: 'android',
      shot: 'fitness',
      alt: 'A fitness summary with activity rings and a map of an evening run, on Android',
    },
  ];

  /**
   * Whether the load sequence runs. Never under reduced motion, where everything is drawn - and
   * not if the page has already painted: that is the prerendered copy, which played the sequence
   * itself on first paint, and the client taking over must not play it a second time.
   */
  protected readonly intro =
    !prefersReducedMotion() &&
    !performance.getEntriesByType('paint').some((entry) => entry.name === 'first-contentful-paint');

  protected readonly headlineRule = underline(0, 6, 100, 11);

  protected tilt(event: PointerEvent): void {
    if (event.pointerType !== 'mouse' || prefersReducedMotion()) return;
    const box = this.devices().nativeElement.getBoundingClientRect();
    const x = (event.clientX - box.left) / box.width - 0.5;
    const y = (event.clientY - box.top) / box.height - 0.5;
    this.devices().nativeElement.style.setProperty('--tx', `${(x * 6).toFixed(2)}deg`);
    this.devices().nativeElement.style.setProperty('--ty', `${(-y * 4).toFixed(2)}deg`);
  }

  protected level(): void {
    this.devices().nativeElement.style.setProperty('--tx', '0deg');
    this.devices().nativeElement.style.setProperty('--ty', '0deg');
  }
}
