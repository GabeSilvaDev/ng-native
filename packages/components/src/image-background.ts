import { Component, computed, input } from '@angular/core';
import { Image, type ImageResizeMode, type ImageSource } from './image.ts';
import { ViewBase } from './view-base.ts';

/**
 * A view with an image behind its children. RN's `ImageBackground` is a `View` wrapping an
 * absolutely-filled `Image`; there is no native component for it.
 *
 * `imageStyle` styles the image itself. RN also copies the outer style's width and height onto
 * the image, a documented workaround for the image otherwise sizing itself; that is done here
 * from `[style]`, and a background with no size there fills its box at 100%.
 */
@Component({
  selector: 'image-background',
  imports: [Image],
  template: `
    <image
      [source]="source()"
      [style]="fill()"
      [resizeMode]="resizeMode()"
      [blurRadius]="blurRadius()"
      [tintColor]="tintColor()"
      [defaultSource]="defaultSource()"
      [alt]="alt()"
      accessibilityIgnoresInvertColors="true"
    />
    <ng-content />
  `,
})
export class ImageBackground extends ViewBase {
  readonly source = input<ImageSource>();
  readonly defaultSource = input<ImageSource>();
  readonly resizeMode = input<ImageResizeMode>('cover');
  readonly blurRadius = input<number>();
  readonly tintColor = input<string>();
  readonly alt = input<string>();
  /** Styles applied to the image rather than the container. */
  readonly imageStyle = input<Record<string, unknown>>();

  protected readonly fill = computed(() => {
    const outer = this.node.props['style'] as { width?: unknown; height?: unknown } | undefined;
    return {
      position: 'absolute',
      top: 0,
      left: 0,
      bottom: 0,
      right: 0,
      // A background sized by a class has nothing in its style to copy. Left unsized, the image
      // would take its picture's own size rather than the box it is meant to fill.
      width: outer?.width ?? '100%',
      height: outer?.height ?? '100%',
      ...this.imageStyle(),
    };
  });
}
