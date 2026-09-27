import { Directive, computed, input } from '@angular/core';
import type { Insets } from './events.ts';
import { optionalBoolean, optionalNumber } from './transforms.ts';
import { ViewBase } from './view-base.ts';

/** A remote or local image, or several at different scales for native to choose between. */
export interface ImageURISource {
  readonly uri: string;
  readonly width?: number;
  readonly height?: number;
  readonly scale?: number;
  readonly headers?: Readonly<Record<string, string>>;
  readonly method?: string;
  readonly body?: string;
  readonly cache?: 'default' | 'reload' | 'force-cache' | 'only-if-cached';
}
/** A `require()`d asset compiles to a number; the host resolves it at commit time. */
export type ImageSource = number | ImageURISource | readonly ImageURISource[];

export type ImageResizeMode = 'cover' | 'contain' | 'stretch' | 'repeat' | 'center' | 'none';

/** Parse an HTML `srcset`: `"a.png 1x, a@2x.png 2x"`. */
function parseSrcSet(srcSet: string): ImageURISource[] {
  return srcSet
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const [uri, descriptor] = entry.split(/\s+/);
      const scale = descriptor?.endsWith('x') ? Number(descriptor.slice(0, -1)) : 1;
      return { uri: uri!, scale: Number.isFinite(scale) ? scale : 1 };
    });
}

/**
 * An image. Commits as `RCTImageView`.
 *
 * What RN's `Image.js` does before native sees the props is done here: a `require()`d asset is
 * resolved and its own width and height become the default size, `src` and `srcSet` are turned
 * into sources, `alt` becomes the accessibility label, and `crossOrigin` and `referrerPolicy`
 * become request headers. A `tintColor` given in `[style]` reaches native as it does in RN,
 * because the engine flattens style into props.
 *
 * Events are element events: `(load)`, `(error)`, `(loadStart)`, `(loadEnd)`, `(progress)`.
 */
@Directive({
  selector: 'image',
  host: {
    '[source]': 'resolvedSource()',
    '[defaultSource]': 'defaultSource()',
    '[loadingIndicatorSource]': 'loadingIndicatorSource()',
    '[resizeMode]': 'resizeMode()',
    '[resizeMethod]': 'resizeMethod()',
    '[resizeMultiplier]': 'resizeMultiplier()',
    '[blurRadius]': 'blurRadius()',
    '[capInsets]': 'capInsets()',
    '[tintColor]': 'tintColor()',
    '[fadeDuration]': 'fadeDuration()',
    '[progressiveRenderingEnabled]': 'progressiveRenderingEnabled()',
    '[intrinsicSize]': 'intrinsic()',
  },
})
export class Image extends ViewBase {
  /** `Image.ios.js`: alt text is what makes an image worth stopping on. */
  protected override accessibleByDefault(): boolean {
    return this.alt() !== undefined;
  }

  /** And it is the label, unless the app gave a better one. */
  protected override labelByDefault(): string | undefined {
    return this.alt();
  }

  /** What to show: a `require()`d asset, a `{uri}` object, or a list of them. */
  readonly source = input<ImageSource>();
  /** `src`: a bare URI, the web spelling of `source`. */
  readonly src = input<string>();
  /** `srcSet`: URIs at several scales, as HTML writes it. */
  readonly srcSet = input<string>();
  /** Shown until `source` loads. */
  readonly defaultSource = input<ImageSource>();
  /** Android: an image shown in place of the loading indicator. */
  readonly loadingIndicatorSource = input<ImageURISource>();
  /** How the image fits its box. Defaults to `cover`. */
  readonly resizeMode = input<ImageResizeMode>();
  /** Android: how a large image is scaled down while decoding. */
  readonly resizeMethod = input<'auto' | 'resize' | 'scale' | 'none'>();
  /** Android: the factor `resizeMethod: 'resize'` scales by. */
  readonly resizeMultiplier = input(undefined, { transform: optionalNumber });
  /** A blur applied to the image. */
  readonly blurRadius = input(undefined, { transform: optionalNumber });
  /** iOS: the edges of a stretchable image that must not stretch. */
  readonly capInsets = input<Insets>();
  /** Recolour every opaque pixel; for icons. May also come from `[style]`. */
  readonly tintColor = input<string>();
  /** Android: how long the fade-in takes, in ms. Defaults to 300. */
  readonly fadeDuration = input(undefined, { transform: optionalNumber });
  /** Android: show a progressive JPEG as it loads. */
  readonly progressiveRenderingEnabled = input(undefined, { transform: optionalBoolean });
  /** Text describing the image for a screen reader; sets `accessible` too. */
  readonly alt = input<string>();
  /** Send credentials with the request, as the HTML attribute means. */
  readonly crossOrigin = input<'anonymous' | 'use-credentials'>();
  /** The `Referrer-Policy` header for the request. */
  readonly referrerPolicy = input<string>();

  /** `source` alone, resolved once however many things read it. */
  private readonly fromSource = computed<readonly ImageURISource[]>(() => {
    const source = this.source();
    if (source === undefined) return [];
    if (Array.isArray(source)) return source as readonly ImageURISource[];
    const resolved = this.engine.resolveAsset(source) as ImageURISource | undefined;
    return resolved ? [resolved] : [];
  });

  /** Every source form, resolved to the list native reads. */
  protected readonly resolvedSource = computed<readonly ImageURISource[] | undefined>(() => {
    const listed = [...this.fromSource(), ...this.fromSrc()];
    if (!listed.length) return undefined;
    const headers = this.headers();
    return headers
      ? listed.map((one) => ({ ...one, headers: { ...one.headers, ...headers } }))
      : listed;
  });

  /** A single source's own size, which RN uses as the default box, as an `<img>` does. */
  protected readonly intrinsic = computed(() => {
    const source = this.source();
    if (this.src() || this.srcSet() || Array.isArray(source)) return undefined;
    const [one] = this.fromSource();
    return one?.width !== undefined && one.height !== undefined
      ? { width: one.width, height: one.height }
      : undefined;
  });

  private fromSrc(): readonly ImageURISource[] {
    const set = this.srcSet();
    const src = this.src();
    const out = set ? parseSrcSet(set) : [];
    if (src && !out.some((one) => one.scale === 1)) out.push({ uri: src, scale: 1 });
    return out;
  }

  private headers(): Record<string, string> | null {
    const headers: Record<string, string> = {};
    const cors = this.crossOrigin();
    if (cors === 'use-credentials') headers['Access-Control-Allow-Credentials'] = 'true';
    const referrer = this.referrerPolicy();
    if (referrer) headers['Referrer-Policy'] = referrer;
    return Object.keys(headers).length ? headers : null;
  }
}
