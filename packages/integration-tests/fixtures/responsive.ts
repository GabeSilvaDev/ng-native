import { Component } from '@angular/core';
import { Text } from '../../components/src/text.ts';
import { View } from '../../components/src/view.ts';

@Component({
  imports: [Text, View],
  selector: 'x-responsive',
  template: `<view nativeID="box"
    ><text nativeID="label">responsive</text><view nativeID="toggle" class="toggle"></view
  ></view>`,
  styles: `
    view {
      padding-top: 1px;
    }
    @media (min-width: 600px) {
      view {
        padding-top: 2px;
      }
    }
    @media (prefers-color-scheme: dark) {
      text {
        color: rgb(9, 9, 9);
      }
    }
    @media (min-width: 600px) and (orientation: landscape) {
      view {
        padding-bottom: 3px;
      }
    }
    @media (max-width: 100px), (min-height: 900px) {
      view {
        padding-left: 4px;
      }
    }
    .toggle {
      display: none;
    }
    @media (min-width: 600px) {
      .toggle {
        display: block;
      }
    }
    @media (prefers-reduced-motion: reduce) {
      view {
        padding-right: 5px;
      }
    }
  `,
})
export class Responsive {}
