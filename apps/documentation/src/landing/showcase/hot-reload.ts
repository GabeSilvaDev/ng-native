/*
 * The hot-reload showcase: one screen, photographed on the Android emulator before and after the
 * heading is edited while it runs. The button was pressed three times first, and still says so
 * afterwards - the edit reaches the device without restarting the app or losing its state. The
 * landing page plays the edit beside the two captures; its code sheet is this template.
 */
import { Component, signal } from '@angular/core';
import { Pressable, Text, View } from '@ng-native/components';

@Component({
  selector: 'app-root',
  imports: [Pressable, Text, View],
  template: `
    <view class="screen">
      <text class="title">Hello, native</text>
      <text class="lede">One component, both platforms.</text>
      <pressable class="button" (press)="taps.set(taps() + 1)">
        <text class="label">Tapped {{ taps() }} times</text>
      </pressable>
    </view>
  `,
  styles: `
    .screen {
      flex: 1;
      justify-content: center;
      padding: 32px;
      background-image: linear-gradient(135deg, #4f46e5, #c026d3);
    }
    .title {
      font-size: 48px;
      font-weight: 800;
      color: #ffffff;
    }
    .lede {
      margin-top: 12px;
      font-size: 18px;
      color: rgba(255, 255, 255, 0.75);
    }
    .button {
      margin-top: 40px;
      padding: 16px;
      border-radius: 999px;
      background-color: #ffffff;
    }
    .label {
      text-align: center;
      font-size: 18px;
      font-weight: 700;
      color: #4338ca;
    }
  `,
})
export class App {
  protected readonly taps = signal(0);
}
