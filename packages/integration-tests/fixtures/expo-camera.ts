import { Component, viewChild } from '@angular/core';
import { Camera } from '@ng-native/expo/camera';

@Component({
  selector: 'expo-camera-fixture',
  imports: [Camera],
  template: `<expo-camera facing="back" />`,
})
export class ExpoCameraFixture {
  readonly camera = viewChild.required(Camera);
}
