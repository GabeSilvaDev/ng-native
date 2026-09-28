/**
 * `<expo-symbol>`: an SF Symbol, from `expo-symbols`, typed so a template is checked against the
 * props. iOS only. Registered with `registerExpoViews('expo-symbol')`.
 *
 * It does what the module's React component does before native sees the props: the view is `size`
 * points square (24 unless set), `type` is `monochrome` unless set, one colour or several become
 * the list native takes, and an `animationSpec` is what turns animation on.
 *
 * ```html
 * <expo-symbol name="heart.fill" [size]="28" tintColor="#ff2d55" weight="semibold" />
 * <expo-symbol name="cloud.sun.fill" type="palette" [colors]="['#fff', '#ffcc00']" />
 * ```
 */
import { Component, computed, input } from '@angular/core';
import { optionalNumber } from './transforms.ts';

export type SymbolType = 'monochrome' | 'hierarchical' | 'palette' | 'multicolor';
export type SymbolScale = 'default' | 'unspecified' | 'small' | 'medium' | 'large';
export type SymbolWeight =
  | 'unspecified'
  | 'ultraLight'
  | 'thin'
  | 'light'
  | 'regular'
  | 'medium'
  | 'semibold'
  | 'bold'
  | 'heavy'
  | 'black';
export type SymbolResizeMode =
  | 'scaleToFill'
  | 'scaleAspectFit'
  | 'scaleAspectFill'
  | 'redraw'
  | 'center'
  | 'top'
  | 'bottom'
  | 'left'
  | 'right'
  | 'topLeft'
  | 'topRight'
  | 'bottomLeft'
  | 'bottomRight';

/** How a symbol animates, as `expo-symbols` describes it. */
export interface SymbolAnimationSpec {
  readonly effect?: {
    readonly type: 'bounce' | 'pulse' | 'scale';
    readonly wholeSymbol?: boolean;
    readonly direction?: 'up' | 'down';
  };
  readonly repeating?: boolean;
  readonly repeatCount?: number;
  readonly speed?: number;
  readonly variableAnimationSpec?: Readonly<Record<string, boolean>>;
}

@Component({
  selector: 'expo-symbol',
  template: '',
  host: {
    '[name]': 'name()',
    '[type]': 'type()',
    '[scale]': 'scale()',
    '[weight]': 'weight()',
    '[tintColor]': 'tintColor()',
    '[colors]': 'colourList()',
    '[resizeMode]': 'resizeMode()',
    '[animationSpec]': 'animationSpec()',
    '[animated]': 'animated()',
    '[style.width]': 'size()',
    '[style.height]': 'size()',
  },
})
export class ExpoSymbol {
  /** The symbol's name, as SF Symbols lists it: `heart.fill`, `cloud.sun.rain`. */
  readonly name = input.required<string>();
  readonly type = input<SymbolType>('monochrome');
  readonly scale = input<SymbolScale>();
  readonly weight = input<SymbolWeight>();
  /** The colour of a `monochrome` or `hierarchical` symbol. */
  readonly tintColor = input<string>();
  /** The layers' colours, for `palette`. */
  readonly colors = input<string | readonly string[]>();
  readonly resizeMode = input<SymbolResizeMode>();
  readonly animationSpec = input<SymbolAnimationSpec>();
  /** Points, both ways. */
  readonly size = input(24, { transform: (value: unknown) => optionalNumber(value) ?? 24 });

  protected readonly colourList = computed(() => {
    const colours = this.colors();
    return colours === undefined ? undefined : typeof colours === 'string' ? [colours] : colours;
  });
  protected readonly animated = computed(() => this.animationSpec() !== undefined);
}
