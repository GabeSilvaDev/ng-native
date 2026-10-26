---
__default__: patch
---

A `<virtual-list>` row whose item comes back to the window after leaving it, with nothing arriving to take its place (a filter put on below the scroll position and taken off again), takes back the slot it left. It took another parked slot, so the window held its key twice: with `track row.key` Angular threw `NG0955` (duplicated keys) and the row was drawn twice, and with `track row.slot` a hidden copy of it was kept. An item that comes back as another `itemType` gets a slot of that type, and its old one is let go.
