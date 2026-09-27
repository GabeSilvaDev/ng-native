import { Component } from '@angular/core';
import { Text } from '../../components/src/text.ts';

@Component({
  selector: 'x-platform-color',
  imports: [Text],
  template: `<text nativeID="label">system</text>`,
  styles: `
    #label {
      color: platform-color(label);
    }
  `,
})
export class PlatformColorHost {}
