/**
 * Fades an element up into place the first time it scrolls into view, then leaves it alone.
 *
 * A one-shot trigger, not a scroll-linked animation: once shown, scrolling does nothing to it.
 * Anything already on screen when the page boots is shown at once, so the prerendered page never
 * blinks out and back in, and `prefers-reduced-motion` skips the effect entirely. The hidden state
 * only applies under `html.reveal-armed`, which is set here rather than in the markup, so the
 * prerendered page - and a browser without JavaScript - shows everything.
 *
 * Classes are toggled directly rather than through a binding, so an element is marked shown in the
 * same frame the page is armed.
 */
import { afterNextRender, DestroyRef, Directive, ElementRef, inject } from '@angular/core';

@Directive({
  selector: '[landingReveal]',
  host: { class: 'reveal' },
})
export class LandingReveal {
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private observer?: IntersectionObserver;

  constructor() {
    afterNextRender(() => this.watch());
    inject(DestroyRef).onDestroy(() => this.observer?.disconnect());
  }

  private watch(): void {
    const onScreen = this.element.getBoundingClientRect().top < innerHeight;
    if (onScreen || matchMedia('(prefers-reduced-motion: reduce)').matches) {
      this.element.classList.add('is-shown');
      return;
    }
    document.documentElement.classList.add('reveal-armed');
    this.observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        this.element.classList.add('is-shown');
        this.observer?.disconnect();
      },
      { rootMargin: '0px 0px -12% 0px' },
    );
    this.observer.observe(this.element);
  }
}
