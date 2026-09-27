---
title: Your first screen
---

Over this course you build a habit tracker: a list of things to do each day, ticked off as you do
them. It is Angular as you already write it, with signals, control flow and components. What is
new is what it renders to: native views on iOS and Android, not a DOM. The course is about that
difference.

On a device, Angular drives React Native's Fabric renderer directly, with no React component tree
in between, and Expo provides the app runtime and the build tooling. The preview beside the editor
runs the same components in the browser, through `@ng-native/web`. X-ray labels each element with
the native view it becomes on a device; it does not inspect a running iOS or Android app.

There is no `<div>` or `<span>` on a phone. A template is made of native elements instead:
`<view>` becomes a plain native view, and `<text>` native text. They come from
`@ng-native/components`, and the component lists the ones it uses in `imports`, as it would any
other component.

## Name the screen

Change `Hello` to `Today`.

Text on a phone has to be inside a `<text>`. A native view has no text of its own, so a word
written straight into a `<view>` has nowhere to be drawn. That is why the starter wraps it.

The starter's `padding-top` adds 16 points to the top safe-area inset, so the heading clears the
status bar and the notch. The preview supplies example insets. On a device, a
`<safe-area-provider>` at the root of the app measures them and publishes them as CSS custom
properties such as `--safe-area-inset-top`. Without one, the `0px` fallback applies and the heading
sits under the status bar. See [Safe area](/packages/components/safe-area).

## Add a second line

A `<view>` lays out its children in a column, top to bottom. That is the default on a phone,
where a browser's would be a row of inline content. Add a second `<text>` after the first, inside
the same `<view>`:

```html
<text>3 left to do</text>
```

Turn on X-ray to see what each element became. `<text>` is a `Paragraph`, React Native's text view
on both platforms, and `<view>` is a `View`. Leave `Text` out of `imports` and the preview warns
about an element it does not know, the way a device build would.
