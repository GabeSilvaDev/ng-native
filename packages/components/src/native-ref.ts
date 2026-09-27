import { Directive, ElementRef, inject } from '@angular/core';

/** Escape hatch for reading a primitive's retained node, e.g. to issue a native command. */
@Directive({ selector: '[nativeRef]', exportAs: 'nativeRef' })
export class NativeRef {
  readonly node = inject(ElementRef).nativeElement;
}
