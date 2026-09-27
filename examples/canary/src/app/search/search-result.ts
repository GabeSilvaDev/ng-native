import { Component, inject, input } from '@angular/core';
import { ScrollView, Text } from '@ng-native/components';
import { Router } from '@angular/router';
import { NativeHeader } from '@ng-native/router';

/** What a search opened. Going back from here finds the search as it was left. */
@Component({
  selector: 'x-search-result',
  imports: [NativeHeader, ScrollView, Text],
  template: `
    <native-header [title]="title" />
    <scroll-view class="screen" [contentContainerStyle]="content">
      <text class="heading">{{ title }}</text>
      <text class="hint">{{ id() }}</text>
    </scroll-view>
  `,
})
export class SearchResult {
  readonly id = input.required<string>();
  protected readonly content = { padding: 20, gap: 12 };
  protected readonly title =
    (inject(Router).getCurrentNavigation()?.extras.state?.['title'] as string | undefined) ??
    'Result';
}
