import { Component, afterRenderEffect, inject, input, output, viewChild } from '@angular/core';
import { Pressable, Text, View, VirtualList, VirtualListRow } from '@ng-native/components';
import type { NativeSyntheticEvent } from '@ng-native/fabric';
import { ShelfPositions, type Album, type Shelf } from './browse-shelves.ts';

const CARD = 132;

/**
 * One shelf: a horizontal list of albums inside the vertical list of shelves. Its row is recycled
 * as the page scrolls, so the shelf keeps its position in `ShelfPositions` and puts it back when
 * handed a shelf, whether its own again or another one.
 */
@Component({
  selector: 'x-browse-shelf',
  imports: [Pressable, Text, View, VirtualList, VirtualListRow],
  template: `
    <virtual-list
      #row
      class="shelf"
      [horizontal]="true"
      [items]="shelf().albums"
      [itemHeight]="card"
      [keyExtractor]="idOf"
      [showsHorizontalScrollIndicator]="false"
      [scrollEventThrottle]="16"
      (scroll)="remember($event)"
    >
      @for (cell of row.window(); track cell.slot) {
        <pressable
          [virtualListRow]="cell"
          [nativeID]="'card-' + cell.key"
          accessibilityRole="button"
          [accessibilityLabel]="cell.item.title"
          (press)="opened.emit(cell.item)"
        >
          <view
            class="cover"
            [style.backgroundColor]="'hsl(' + cell.item.hue + ', 55%, 55%)'"
          ></view>
          <text class="body" [numberOfLines]="1">{{ cell.item.title }}</text>
        </pressable>
      }
    </virtual-list>
  `,
  styles: `
    .shelf {
      height: 170px;
    }
    .cover {
      width: 120px;
      height: 120px;
      border-radius: 10px;
      margin-bottom: 6px;
    }
  `,
})
export class BrowseShelf {
  private readonly positions = inject(ShelfPositions);
  private readonly list = viewChild.required(VirtualList<Album>);

  readonly shelf = input.required<Shelf>();
  readonly opened = output<Album>();

  protected readonly card = CARD;
  protected readonly idOf = (album: Album) => album.id;

  constructor() {
    // After the render that handed the list its albums, so the offset is measured against them.
    afterRenderEffect({
      write: () => {
        const id = this.shelf().id;
        this.list().scrollToOffset({ offset: this.positions.get(id), animated: false });
      },
    });
  }

  protected remember(event: NativeSyntheticEvent<{ contentOffset?: { x?: number } }>): void {
    this.positions.set(this.shelf().id, event.nativeEvent?.contentOffset?.x ?? 0);
  }
}
