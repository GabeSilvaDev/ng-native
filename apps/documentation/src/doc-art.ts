/**
 * A small line drawing at the top of a component's page, saying what kind of thing it is before a
 * word is read: a switch looks like a switch, a list like rows.
 *
 * The landing page's glyph style - ink strokes, one red accent - on a 64-unit square, set on a
 * plate of dot grid. A page asks for one with `art: <name>` in its front matter. Drawings, not
 * screenshots: they stay true in dark mode and cost nothing to load.
 */
import { Component, input } from '@angular/core';

export const DOC_ART = [
  'layout',
  'safe-area',
  'scroll-view',
  'keyboard-avoiding-view',
  'lists',
  'text',
  'image',
  'activity-indicator',
  'input',
  'switch',
  'pressable',
  'gestures',
  'modal',
  'animation',
] as const;

export type DocArtName = (typeof DOC_ART)[number];

@Component({
  selector: 'doc-art',
  template: `
    <svg viewBox="0 0 64 64" aria-hidden="true">
      @switch (name()) {
        @case ('layout') {
          <rect x="8" y="12" width="48" height="40" rx="3" class="ink" />
          <rect x="13" y="17" width="12" height="30" rx="2" class="ink" />
          <rect x="29" y="17" width="22" height="13" rx="2" class="ink" />
          <rect x="29" y="34" width="22" height="13" rx="2" class="red" />
        }
        @case ('safe-area') {
          <rect x="18" y="6" width="28" height="52" rx="6" class="ink" />
          <rect x="27" y="9.5" width="10" height="3" rx="1.5" class="ink-fill" />
          <rect x="21.5" y="16" width="21" height="34" rx="2" class="red dashed" />
          <path d="M28 54h8" class="ink" />
        }
        @case ('scroll-view') {
          <rect x="18" y="6" width="28" height="52" rx="6" class="ink" />
          <path d="M23 15h14M23 22h11M23 29h14M23 36h9M23 43h14M23 50h11" class="ink faint" />
          <path d="M41.5 17v12" class="red" />
        }
        @case ('keyboard-avoiding-view') {
          <rect x="18" y="6" width="28" height="52" rx="6" class="ink" />
          <rect x="21" y="38" width="22" height="16" rx="2" class="ink" />
          <path
            d="M25 42.5h2M31 42.5h2M37 42.5h2M25 46.5h2M31 46.5h2M37 46.5h2M28 50.5h8"
            class="ink"
          />
          <rect x="22" y="28" width="20" height="6" rx="2" class="red" />
          <path d="M32 24v-8M29 19l3-3 3 3" class="ink faint" />
        }
        @case ('lists') {
          <path d="M9 14h46M9 46h46" class="red" />
          @for (y of [8, 20, 30, 40, 52]; track y) {
            <circle [attr.cx]="15" [attr.cy]="y" r="2.5" [attr.class]="row(y)" />
            <path [attr.d]="'M21 ' + y + 'h28'" [attr.class]="row(y)" />
          }
        }
        @case ('text') {
          <text x="10" y="36" class="glyph-type">Aa</text>
          <path d="M44 20v18" class="red" />
          <path d="M10 46h44M10 53h30" class="ink faint" />
        }
        @case ('image') {
          <rect x="10" y="14" width="44" height="36" rx="3" class="ink" />
          <path d="M14 45l11-12 8 8 6-6 11 10" class="ink" />
          <circle cx="43" cy="24" r="4" class="red" />
        }
        @case ('activity-indicator') {
          @for (spoke of spokes; track spoke.angle) {
            <path
              [attr.d]="spoke.d"
              [attr.class]="$first ? 'red' : 'ink'"
              [attr.opacity]="spoke.opacity"
            />
          }
        }
        @case ('input') {
          <path d="M8 15h16" class="ink faint" />
          <rect x="8" y="21" width="48" height="20" rx="4" class="ink" />
          <path d="M14 31h14" class="ink" />
          <path d="M31 26v10" class="red" />
        }
        @case ('switch') {
          <rect x="14" y="22" width="36" height="20" rx="10" class="ink" />
          <circle cx="40" cy="32" r="7" class="red-fill" />
        }
        @case ('pressable') {
          <rect x="10" y="24" width="44" height="16" rx="8" class="ink" />
          <circle cx="38" cy="32" r="9" class="red faint" />
          <circle cx="38" cy="32" r="3" class="red-fill" />
        }
        @case ('gestures') {
          <circle cx="26" cy="38" r="3" class="red-fill" />
          <circle cx="38" cy="26" r="3" class="red-fill" />
          <path d="M22 42l-8 8M14 44v6h6" class="ink" />
          <path d="M42 22l8-8M44 14h6v6" class="ink" />
        }
        @case ('modal') {
          <rect x="18" y="6" width="28" height="52" rx="6" class="ink" />
          <path d="M23 15h14M23 21h10" class="ink faint" />
          <path d="M21 53V35a4 4 0 0 1 4-4h14a4 4 0 0 1 4 4v18" class="red" />
          <path d="M29 35h6" class="red" />
          <path d="M23 26h18" class="ink faint" />
        }
        @case ('animation') {
          <path d="M38 17h-7M40 22h-10" class="red faint" />
          <circle cx="14" cy="46" r="3.5" class="ink" opacity="0.25" />
          <circle cx="25" cy="39" r="3.5" class="ink" opacity="0.45" />
          <circle cx="35" cy="28" r="3.5" class="ink" opacity="0.7" />
          <circle cx="49" cy="20" r="4.5" class="red-fill" />
        }
      }
    </svg>
  `,
  host: { class: 'doc-art' },
  styles: `
    :host {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 9rem;
      margin-bottom: 2rem;
      border: 1px solid var(--color-border-subtle, rgb(0 0 0 / 0.08));
      border-radius: 0.875rem;
      background-color: var(--color-paper-light);
      background-image: radial-gradient(
        color-mix(in srgb, var(--color-ink) 14%, transparent) 1px,
        transparent 1.2px
      );
      background-size: 16px 16px;
      background-position: center;
    }
    svg {
      width: 6.5rem;
      height: 6.5rem;
      overflow: visible;
    }
    .ink,
    .red {
      fill: none;
      stroke-width: 2;
      stroke-linecap: round;
      stroke-linejoin: round;
      vector-effect: non-scaling-stroke;
    }
    .ink {
      stroke: var(--color-ink);
    }
    .red {
      stroke: var(--color-ng-red);
    }
    .ink-fill {
      fill: var(--color-ink);
    }
    .red-fill {
      fill: var(--color-ng-red);
    }
    .faint {
      opacity: 0.45;
    }
    .dashed {
      stroke-dasharray: 3 3;
    }
    .glyph-type {
      fill: var(--color-ink);
      font-family: var(--font-docs-display, serif);
      font-size: 26px;
      font-weight: 600;
      letter-spacing: -0.02em;
    }
  `,
})
export class DocArt {
  readonly name = input.required<DocArtName>();

  /** Rows outside the red viewport lines are drawn dashed: a virtual list has not made them. */
  protected row(y: number): string {
    return y < 14 || y > 46 ? 'ink faint dashed' : 'ink';
  }

  /** An activity indicator's eight spokes, fading behind the leading one. */
  protected readonly spokes = Array.from({ length: 8 }, (_, index) => {
    const angle = -90 + index * -45;
    const radians = (angle * Math.PI) / 180;
    const [cos, sin] = [Math.cos(radians), Math.sin(radians)];
    const at = (radius: number) => `${32 + cos * radius} ${32 + sin * radius}`;
    return { angle, d: `M${at(9)}L${at(18)}`, opacity: 1 - index * 0.11 };
  });
}
