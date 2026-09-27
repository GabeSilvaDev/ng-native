import { Component } from '@angular/core';
import { Text } from '../../components/src/text.ts';

@Component({
  selector: 'x-truncated-by-css',
  imports: [Text],
  template: `
    <text nativeID="truncate" class="truncate">a long line</text>
    <text nativeID="clamp" class="clamp">a long paragraph</text>
    <text nativeID="clip" class="truncate clip">a long line</text>
    <text nativeID="bound" class="clamp" [numberOfLines]="3">a long paragraph</text>
    <text nativeID="unclamped" class="clamp none">a long paragraph</text>
  `,
  styles: `
    .truncate {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .clamp {
      overflow: hidden;
      display: -webkit-box;
      -webkit-box-orient: vertical;
      -webkit-line-clamp: 2;
    }
    .clip {
      text-overflow: clip;
    }
    .none {
      -webkit-line-clamp: unset;
    }
  `,
})
export class TruncatedByCss {}
