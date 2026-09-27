import { Component, signal } from '@angular/core';
import { Text } from '../../../../components/src/text.ts';
import { View } from '../../../../components/src/view.ts';

// One of two screens sharing a stylesheet from the directory above, through a `../` path.
@Component({
  imports: [Text, View],
  selector: 'app-home',
  template: '<view class="box"><text>count is {{ count() }}</text></view>',
  styleUrl: '../lab.css',
})
export class Home {
  count = signal(0);

  inc(): void {
    this.count.update((c) => c + 1);
  }
}
