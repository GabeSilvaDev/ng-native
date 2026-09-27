import { Component } from '@angular/core';
import { Text } from '../../components/src/text.ts';
import { View } from '../../components/src/view.ts';

/**
 * Text that names no colour of its own, which is most text in a themed app: it inherits the
 * theme's foreground rather than declaring one.
 *
 * Two components rather than one with a `class` input, because `mount` takes engine options and
 * providers and has no way to set an input - passing one is accepted and ignored, so a single
 * fixture driven that way renders the light case twice and the dark assertion answers itself.
 */
@Component({
  imports: [Text, View],
  selector: 'x-theme-foreground-light',
  template: `<view><text nativeID="plain">plain</text></view>`,
})
export class ThemeForegroundLight {}

@Component({
  imports: [Text, View],
  selector: 'x-theme-foreground-dark',
  template: `<view class="dark"><text nativeID="plain">plain</text></view>`,
})
export class ThemeForegroundDark {}
