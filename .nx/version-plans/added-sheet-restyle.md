---
'__default__': patch
---

A component whose CSS is not scoped (`ViewEncapsulation.None`) styles again only the views its rules could match the first time it renders, where every view in the app was styled again. On a screen of several hundred views that is the difference between a menu opening at once and after a visible pause.
