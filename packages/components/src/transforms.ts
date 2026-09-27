/**
 * Input transforms for props that native reads as "set" or "not set".
 *
 * Angular's own `booleanAttribute` turns an absent input into `false`, which is right for a DOM
 * attribute and wrong for a native prop: `accessible` unset means "the platform decides", and
 * sending `false` for every boolean a view never mentioned would put a dozen props on every
 * node. These keep `undefined` as undefined and otherwise behave as Angular's do, so `<view
 * collapsable="false">` and `<view [collapsable]="false">` both mean false.
 */
import { booleanAttribute, numberAttribute } from '@angular/core';

export function optionalBoolean(value: unknown): boolean | undefined {
  return value === undefined ? undefined : booleanAttribute(value);
}

export function optionalNumber(value: unknown): number | undefined {
  return value === undefined ? undefined : numberAttribute(value);
}
