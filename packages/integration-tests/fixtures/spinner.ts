import { Component } from '@angular/core';
import { View } from '../../components/src/view.ts';
import { ActivityIndicator } from '../../components/src/activity-indicator.ts';

@Component({
  selector: 'x-spinner',
  imports: [ActivityIndicator, View],
  template: `
    <view>
      <activity-indicator [animating]="true" />
      <activity-indicator [animating]="true" [style]="extra" />
      <activity-indicator [animating]="true" size="large" />
    </view>
  `,
})
export class Spinner {
  extra = { backgroundColor: '#225522' };
}
