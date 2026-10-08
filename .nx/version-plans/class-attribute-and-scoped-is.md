---
'__default__': patch
---

A selector that reads the `class` attribute, `[class*='size-']`, matches the element's classes, so an icon a library styles with `svg:not([class*='size-'])` keeps the size a class gives it.

`*=`, `^=`, `$=`, `~=` and a bare `[class]` looked for a `class` prop, which no element has, so they never matched and their `:not()` always did. They now read the class list in the order it was set, one space between each, as the attribute would spell it.
