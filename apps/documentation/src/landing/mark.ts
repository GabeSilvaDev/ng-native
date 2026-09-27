/**
 * The Angular Native mark: the Angular "A" as an app icon.
 *
 * Angular Primitives draws the "A" broken into its primitive shards; this is those same four
 * shards, set in white on an Angular-red squircle - the shape of an icon on a home screen. Angular,
 * made into a native app.
 *
 * The same drawing is the favicon (`public/favicon.svg`); keep the two in step.
 */
import { Component } from '@angular/core';

@Component({
  selector: 'landing-mark',
  template: `
    <svg viewBox="0 0 32 32" class="size-full" aria-hidden="true">
      <defs>
        <linearGradient id="landing-mark-fill" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#f0224f" />
          <stop offset="1" stop-color="#c4002d" />
        </linearGradient>
      </defs>
      <path
        d="M16 0C27.2 0 32 4.8 32 16S27.2 32 16 32 0 27.2 0 16 4.8 0 16 0Z"
        fill="url(#landing-mark-fill)"
      />
      <g transform="translate(6.4 6.4) scale(0.8)" fill="#ffffff">
        <path d="M14.8486 0L23.138 16.8551L23.9996 3.99892L14.8486 0Z" />
        <path
          d="M16.9875 17.7114H7.01272L5.73926 20.627L12.0001 24L18.261 20.627L16.9875 17.7114Z"
        />
        <path d="M8.72168 13.9298H15.2812L11.9997 6.39575L8.72168 13.9298Z" />
        <path d="M9.15103 0L0 3.99892L0.861556 16.8551L9.15103 0Z" />
      </g>
    </svg>
  `,
  host: { class: 'inline-block' },
})
export class LandingMark {}
