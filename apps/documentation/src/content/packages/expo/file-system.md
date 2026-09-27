---
title: File system
summary: The cache and document directories, and the create-then-write dance a first write needs.
---

# File system

`FileSystem` locates files by what they are for, cache or document, rather than by path, and
hands back Expo's own `File`. It is a locator, not a file API: everything else - moving, listing,
downloading, streaming - is on the object it returns, documented by `expo-file-system` itself.

## Install

```sh
npx expo install expo-file-system
```

```ts
import { FileSystem } from '@ng-native/expo/file-system';
```

## The smallest useful example

```ts
import { Component, inject } from '@angular/core';
import { FileSystem } from '@ng-native/expo/file-system';

@Component({
  selector: 'app-notes',
  template: `<pressable (press)="save()"><text>Save</text></pressable>`,
})
export class Notes {
  private readonly files = inject(FileSystem);

  protected save(): void {
    this.files.write(this.files.document('notes.txt'), 'Buy milk');
  }
}
```

## `cache(name)` and `document(name)`

Both return Expo's `File` for a name in one of the two directories an app actually chooses
between:

- **`cache(name)`** - a file the system may delete under storage pressure. Use it for anything
  that can be rebuilt or re-downloaded.
- **`document(name)`** - a file that survives, and is included in backups. Use it for anything the
  user would notice losing.

Neither call touches disk; it only names where the file would live. `File` carries `uri`,
`exists`, `size`, and its own `text()`, `textSync()`, `bytes()`, `create()` and `delete()` - use
those directly for anything beyond writing.

## `write(file, content)`

`File.write()` alone throws on a file that has never been created, which is the first thing
everyone hits. `write()` creates the file first (with intermediates) if it does not already
exist, then writes - text or bytes - replacing whatever was there.

```ts
this.files.write(this.files.cache('thumb.jpg'), imageBytes);
```

## Without the module installed

Unlike most services in this package, `FileSystem` does not fall back to reporting nothing:
`cache()`, `document()` and `write()` throw `[angular-native] expo-file-system is not installed`.
A file that silently failed to write is worse than an error that says why.

## Reference

<!-- api: FileSystem -->
