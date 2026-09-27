import { Component, computed, input } from '@angular/core';
import type { FieldTree } from '@angular/forms/signals';
import { Text, View } from '@ng-native/components';

/**
 * A field's label, the control itself (projected), and its first error once the user has left
 * the field or tried to submit. Reads only its own field's state, so validating one field
 * re-renders one row.
 */
@Component({
  selector: 'x-form-row',
  imports: [Text, View],
  template: `
    <view class="row">
      <text class="label">{{ label() }}</text>
      <ng-content />
      @if (pending()) {
        <text class="hint">Checking</text>
      } @else if (error(); as error) {
        <text class="hint danger" accessibilityRole="alert">{{ error }}</text>
      } @else if (hint()) {
        <text class="hint">{{ hint() }}</text>
      }
    </view>
  `,
  styles: `
    .row {
      gap: 6px;
    }
    .label {
      color: var(--text-strong);
      font-size: 14px;
      font-weight: 600;
    }
  `,
})
export class FormRow {
  readonly label = input.required<string>();
  readonly field = input.required<FieldTree<unknown>>();
  readonly hint = input<string>();

  protected readonly pending = computed(() => this.field()().pending());
  protected readonly error = computed(() => {
    const state = this.field()();
    if (!state.touched()) return null;
    return state.errors()[0]?.message ?? null;
  });
}
