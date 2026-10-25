---
__default__: patch
---

A `<native-tabs-outlet>` under a route parameter, such as `city/:name`, now finds a url inside a tab when the parameter is written with characters a url escapes (an accent or a space, `são-paulo`, `new york`) or with matrix parameters (`rio;lang=pt`). It compared the router's url with the tab's url built from the unescaped segment, so no url was inside a tab: tapping back to a tab opened its first screen instead of the page it was on, and a tap dropped the matrix parameters. Pushing into a tab that has not been opened and the tab a screen over the bar covers read the tab the same way, and follow it too.
