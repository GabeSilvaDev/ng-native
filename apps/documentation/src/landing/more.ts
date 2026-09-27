/**
 * The link at the end of a section: "Learn more", and an arrow that moves on towards its guide.
 *
 * Every section ends the same way, so the words stay the same and the section says what it is
 * about. A screen reader gets the topic too - `Learn more about Tailwind` - because a page of
 * links all named "Learn more" is a list of the same link, read aloud.
 */
import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'landing-more',
  imports: [RouterLink],
  template: `
    <a
      class="landing-link landing-more"
      [routerLink]="link()"
      [attr.aria-label]="'Learn more about ' + topic()"
    >
      Learn more
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
  `,
  host: { class: 'inline-block' },
})
export class LandingMore {
  readonly link = input.required<string>();
  /** What the section is about, for the link's accessible name. */
  readonly topic = input.required<string>();
}
