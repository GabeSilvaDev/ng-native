/**
 * `<expo-image>`, typed: `expo-image`'s view, registered by name with
 * `registerExpoView('expo-image', 'ExpoImage')`, with its props as inputs so a template is
 * checked against them. Each goes straight to the view; `source` is the array the React
 * component would hand down.
 */
import { Component, input, output } from '@angular/core';
import type { NativeSyntheticEvent } from '@ng-native/fabric';

/** One image `source` entry, as `expo-image` passes them to its view. */
export interface ExpoImageSource {
  readonly uri?: string;
  readonly width?: number;
  readonly height?: number;
  readonly headers?: Readonly<Record<string, string>>;
  readonly cacheKey?: string;
}

export type ExpoImageContentFit = 'cover' | 'contain' | 'fill' | 'none' | 'scale-down';

@Component({
  selector: 'expo-image',
  template: '',
  host: {
    '[source]': 'source()',
    '[placeholder]': 'placeholder()',
    '[contentFit]': 'contentFit()',
    '[contentPosition]': 'contentPosition()',
    '[transition]': 'transition()',
    '[blurRadius]': 'blurRadius()',
    '[tintColor]': 'tintColor()',
    '[cachePolicy]': 'cachePolicy()',
    '[priority]': 'priority()',
    '[recyclingKey]': 'recyclingKey()',
    '[accessibilityLabel]': 'accessibilityLabel()',
  },
})
export class ExpoImage {
  readonly source = input<readonly ExpoImageSource[] | ExpoImageSource | number>();
  readonly placeholder = input<readonly ExpoImageSource[] | ExpoImageSource | number>();
  readonly contentFit = input<ExpoImageContentFit>();
  readonly contentPosition = input<string | Readonly<Record<string, number | string>>>();
  readonly transition = input<number | { readonly duration?: number; readonly effect?: string }>();
  readonly blurRadius = input<number>();
  readonly tintColor = input<string>();
  readonly cachePolicy = input<'none' | 'disk' | 'memory' | 'memory-disk'>();
  readonly priority = input<'low' | 'normal' | 'high'>();
  readonly recyclingKey = input<string>();
  readonly accessibilityLabel = input<string>();
  readonly load = output<NativeSyntheticEvent<Record<string, unknown>>>();
  readonly error = output<NativeSyntheticEvent<{ readonly error: string }>>();
}
