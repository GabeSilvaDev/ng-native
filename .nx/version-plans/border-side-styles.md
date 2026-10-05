---
__default__: patch
---

A border side styled `none` has no width whatever width another rule gives it, as CSS computes it: `border-right: none` under a later `border-width: 1px` drew the side. Each side's style is kept through the cascade, so a rule that styles the side again draws it again, and `border-top-style`, `border-right-style`, `border-bottom-style` and `border-left-style` are supported where they were dropped with a warning.
