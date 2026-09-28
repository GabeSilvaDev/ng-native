---
title: Layout and style
---

A component's `styles` are CSS, and on a phone they are compiled when the app is built: each rule
becomes a native style the engine matches against the component's own elements, the way a browser
scopes Angular's styles to the component that wrote them.

Layout is flexbox, computed by Yoga, React Native's layout engine. Every `<view>` is a flex
container, and Yoga's defaults are not a browser's: `flex-direction: column`,
`align-items: stretch` and `flex-shrink: 0`. Children run top to bottom and stretch to the width of
their parent unless it says otherwise, and none of them shrinks to make room, so a long text beside
another control in a row needs `flex-shrink: 1` (or `flex: 1`) before it wraps rather than pushing
past the edge.

## Make the title a title

Give the first `<text>` a class, and style the class:

```html
<text class="title">Today</text>
```

```css
.title {
  font-size: 30px;
  font-weight: 700;
}
```

These examples use `px`. The compiler turns them into the density-independent units native layout
uses, points on iOS and density-independent pixels on Android, so `30px` is the same size on every
screen density rather than 30 physical pixels. `rem`, `em`, percentages and the viewport units
work too.

## Put a habit in a card

A row is a `<view>` whose children run left to right. Add one under the two lines of text, with a
habit and its status in it:

```html
<view class="habit">
  <text>Drink water</text>
  <text class="status">To do</text>
</view>
```

```css
.habit {
  flex-direction: row;
  justify-content: space-between;
  padding: 16px;
  border-radius: 12px;
  background-color: #ffffff;
}

.status {
  color: #71717a;
}
```

`justify-content: space-between` pushes the two texts to either end of the row. The screen is
white, so the card only shows once the screen has a color of its own: give `.screen` a
`background-color: #f4f4f5`.

## Space things out

Margins work, but a container can space its children itself. Add `gap: 8px` to `.screen`, and
every child gets 8 points between it and the next.

Not every CSS property has a native equivalent. Try `display: grid` on `.screen`: the browser
would draw it, and a device build drops it with a warning, so the preview shows that warning under
the phone. Read it: it names the file, the line and the reason. Take it out again afterwards.
Component CSS a device cannot draw is dropped with a warning rather than left out without a word;
[Supported CSS](/packages/fabric/supported-css) lists what compiles.
