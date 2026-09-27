import { Directive, input } from '@angular/core';
import { ViewBase } from './view-base.ts';

/**
 * A bar docked above the keyboard, iOS only. Pair it with a text input by giving this view a
 * `nativeID` and the input the same `inputAccessoryViewID`.
 *
 * RN's wrapper positions the native host absolutely and wraps the content in a safe-area view
 * sized to the window; the first is done here, the second is the caller's choice of content.
 * On Android there is no native counterpart and the element commits as a plain view.
 */
@Directive({
  selector: 'input-accessory-view',
  host: {
    '[backgroundColor]': 'backgroundColor()',
    '[style.position]': '"absolute"',
  },
})
export class InputAccessoryView extends ViewBase {
  /** The bar's background. */
  readonly backgroundColor = input<string>();
}
