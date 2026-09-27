---
title: Layout and views
summary: <view>, Yoga's flexbox defaults, and safe area insets.
art: layout
---

# Layout and views

`<view>` is the plain box: flexbox layout, and whatever background, border and shadow its style
gives it. It has no props beyond the shared ones on every element - all of its behavior comes from
`[style]`, `class`, and the component's own CSS.

```html
<view class="rounded-lg border p-4" [style.backgroundColor]="tint()">
  <text>Card content</text>
</view>
```

<!-- api: View -->

## Yoga, not CSS

Every element lays out with Yoga, React Native's flexbox implementation, and only with Yoga:
there is no `display: block`, no inline formatting context, and no way to opt out of flex layout
for a `<view>`. The default is not the one CSS in a browser uses. Yoga starts every node at
`display: flex; flex-direction: column; align-items: stretch; flex-shrink: 0`, so two `<view>`s
with nothing set stack vertically and stretch to their parent's width - a browser's defaults would
lay the same markup out as a shrink-to-fit row. Write `flex-direction: row` explicitly wherever a
layout needs one; there is no ambient row behavior to fall back on.

`<text>` is the one element Yoga does not treat as a flex container, because its content lays out
as text - wrapping, breaking, nested runs sitting on a shared baseline - rather than as boxes. A
`<text>` still participates in its parent's flex layout as a child; it just cannot itself arrange
children with `flex-direction`.

## Safe area

Keeping content clear of the notch, the status bar and the home indicator is the job of
`<safe-area-provider>` and `<safe-area-view>`; see [Safe area](/packages/components/safe-area).

## Escape hatches

`[nativeRef]` reads the retained native node a primitive sits on, for the rare case an app needs
to reach past the component's own API - issuing a native command directly, say. `#ref="nativeRef"`
on a template reference gives access to `.node`.

<!-- api: NativeRef -->
