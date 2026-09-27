import { Directive } from '@angular/core';
import { ViewBase } from './view-base.ts';

/**
 * The basic building block: a box that lays out with flexbox and paints its own background,
 * border and shadow. Commits as `RCTView`.
 *
 * Every prop is on `ViewBase`; styling comes from `[style]`, `class` and the component's CSS.
 */
@Directive({ selector: 'view' })
export class View extends ViewBase {}
