---
__default__: patch
---

The safe HTML methods in `@ng-native/web-compat` (`setHTML`, `appendHTML`, `prependHTML`, `beforeHTML`, `afterHTML` and `replaceWithHTML`) now remove an `<iframe>` inside `<svg>` or `<math>`, and any element registered as a web view, such as `<web-view>` or `<dom-component>`. Before, such an element passed the safe sanitizer and became a react-native-webview with scripts on, so untrusted markup could run a script at the page's origin and post messages to the app as that origin.

`<dom-component>` in `@ng-native/expo` now sends a changed input only to its own page. Before, once a link in the content took the web view to another site, that site could define `window.__ngNative` and receive every input the app changed afterwards.
