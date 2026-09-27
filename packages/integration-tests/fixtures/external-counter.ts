import { Component, signal } from '@angular/core';
import { Pressable } from '../../components/src/pressable.ts';
import { Text } from '../../components/src/text.ts';
import { View } from '../../components/src/view.ts';

// The external-resource twin of counter.ts: same state, but the template and the stylesheet are
// files of their own, which is how most Angular teams write components.
@Component({
  imports: [Pressable, Text, View],
  selector: 'app-external-counter',
  templateUrl: './external-counter.html',
  styleUrl: './external-counter.css',
})
export class ExternalCounter {
  count = signal(0);

  inc(): void {
    this.count.update((c) => c + 1);
  }
}
