---
'__default__': patch
---

A font a `styleUrl` sheet in another directory declares is bundled from beside that sheet, and an `@ng-icons` import wrapped over several lines keeps the line numbers of the file below it.

`url('./Inter.ttf')` in `../shared/fonts.css` was required from the component's directory, where there is no such file, so Metro could not resolve it. It is now resolved against the sheet it is written in, as CSS does, in the component's module and in the hot update an edited template or sheet carries. An `@ng-icons` import that Prettier wrapped was inlined as one line, so an error or a source map line after it was off by the lines it lost.
