import { Component } from '@angular/core';
import { View } from '../../components/src/view.ts';

/**
 * The four ways a template can name a style, which do not all take the same road.
 *
 * A static `style="..."` reaches the renderer as `setAttribute('style', <the whole string>)`;
 * `[style]` and `[style.x]` are compiled into Angular's styling instructions, which parse the
 * string themselves and call `setStyle` once per declaration.
 */
@Component({
  imports: [View],
  selector: 'x-style-forms',
  template: `
    <view nativeID="static" style="flex: 1; margin-top: 4px"></view>
    <view nativeID="bound-string" [style]="'flex: 1; margin-top: 5px'"></view>
    <view nativeID="bound-object" [style]="{ flex: 1, marginTop: 6 }"></view>
    <view nativeID="single" [style.marginTop]="'7px'"></view>
  `,
})
export class StyleForms {}
