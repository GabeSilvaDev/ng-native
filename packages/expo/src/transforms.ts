/**
 * Input transforms for numbers and switches written as static attributes, which arrive as
 * strings, that keep an unset prop unset rather than sending `false` or `NaN`. The same pair
 * exists in the components and router packages; this package does not depend on either.
 */
import { booleanAttribute, numberAttribute } from '@angular/core';

export function optionalBoolean(value: unknown): boolean | undefined {
  return value === undefined ? undefined : booleanAttribute(value);
}

export function optionalNumber(value: unknown): number | undefined {
  return value === undefined ? undefined : numberAttribute(value);
}
