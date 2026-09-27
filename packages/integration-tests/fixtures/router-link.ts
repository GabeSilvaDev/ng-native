import { Component } from '@angular/core';
import { Pressable } from '../../components/src/pressable.ts';
import { Text } from '../../components/src/text.ts';
import { NativeRouterLink } from '../../router/src/native-router-link.ts';

/** One link that pushes and one that replaces, as a page would declare them. */
@Component({
  selector: 'x-links',
  imports: [NativeRouterLink, Pressable, Text],
  template: `
    <pressable nativeRouterLink="/pushed"><text>push</text></pressable>
    <pressable nativeRouterLink="/replaced" [replace]="true"><text>replace</text></pressable>
    <pressable nativeRouterLink="/replaced" replace><text>bare replace</text></pressable>
    <pressable nativeRouterLink="detail" [extras]="{ replaceUrl: true }">
      <text>relative</text>
    </pressable>
  `,
})
export class Links {}
