import { Component } from '@angular/core';
import { Image } from '../../components/src/image.ts';
import { ImageBackground } from '../../components/src/image-background.ts';

/**
 * Images whose single source knows its own size, 600 by 300, sized by the author in every way
 * CSS allows, and one sized by nothing at all.
 */
@Component({
  selector: 'x-intrinsic-image',
  imports: [Image],
  styles: `
    .size-11 {
      width: 44px;
      height: 44px;
    }
    .thumb {
      width: 44px;
    }
    .tall {
      height: 50px;
    }
    .square {
      aspect-ratio: 1;
    }
  `,
  template: `
    <image nativeID="bare" [source]="art" />
    <image nativeID="classed" [source]="art" class="size-11" />
    <image nativeID="width-rule" [source]="art" class="thumb" />
    <image nativeID="height-rule" [source]="art" class="tall" />
    <image nativeID="bound" [source]="art" [style.width.px]="120" [style.height.px]="90" />
    <image nativeID="bound-width" [source]="art" [style.width.px]="120" />
    <image nativeID="own-ratio" [source]="art" class="thumb square" />
    <image nativeID="global" [source]="art" class="global-size" />
    <image nativeID="uri-only" [source]="{ uri: 'b.jpg' }" />
  `,
})
export class IntrinsicImage {
  protected readonly art = { uri: 'a.jpg', width: 600, height: 300 };
}

/** A background sized by a class, over a picture that knows its own size. */
@Component({
  selector: 'x-intrinsic-background',
  imports: [ImageBackground],
  styles: '.banner { width: 320px; height: 160px; }',
  template: '<image-background class="banner" [source]="art" />',
})
export class IntrinsicBackground {
  protected readonly art = { uri: 'a.jpg', width: 600, height: 300 };
}
