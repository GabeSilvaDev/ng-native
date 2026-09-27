import { Component } from '@angular/core';
import { View } from '../../../../components/src/view.ts';

// The other screen sharing `../lab.css`.
@Component({
  imports: [View],
  selector: 'app-settings',
  template: '<view class="box"></view>',
  styleUrl: '../lab.css',
})
export class Settings {}
