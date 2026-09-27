import {
  Directive,
  type EmbeddedViewRef,
  type OnChanges,
  type SimpleChanges,
  TemplateRef,
  ViewContainerRef,
  inject,
  input,
} from '@angular/core';

/**
 * Stamp out a caller's `<ng-template>` with a context, which is `NgTemplateOutlet` without
 * depending on `@angular/common` for it.
 *
 * The view is made once per template and its context updated in place after that, so a list that
 * re-renders with new neighbours for a separator does not rebuild the separator.
 */
@Directive({ selector: '[templateSlot]' })
export class TemplateSlot<C extends object> implements OnChanges {
  readonly template = input.required<TemplateRef<C>>({ alias: 'templateSlot' });
  readonly context = input.required<C>({ alias: 'templateSlotContext' });

  private readonly container = inject(ViewContainerRef);
  private view: EmbeddedViewRef<C> | null = null;

  ngOnChanges(changes: SimpleChanges): void {
    if (this.view && !changes['template']) {
      Object.assign(this.view.context, this.context());
      return;
    }
    this.container.clear();
    this.view = this.container.createEmbeddedView(this.template(), { ...this.context() });
  }
}
