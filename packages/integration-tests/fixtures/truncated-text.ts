import { Component } from '@angular/core';
import { Text } from '../../components/src/text.ts';

@Component({
  selector: 'x-truncated',
  imports: [Text],
  template: `
    <text nativeID="default" [numberOfLines]="1">a long line</text>
    <text nativeID="head" [numberOfLines]="1" ellipsizeMode="head">a long line</text>
  `,
})
export class Truncated {}
