import { Component, signal } from '@angular/core';
import { Modal, Pressable, ScrollView, Text, View } from '@ng-native/components';
import { NativeHeader } from '@ng-native/router';
import { page } from '../screen-styles.ts';

@Component({
  selector: 'x-modal-page',
  imports: [NativeHeader, ScrollView, Pressable, Modal, Text, View],
  template: `
    <native-header title="Modal" />
    <scroll-view class="screen" [contentContainerStyle]="page.content">
      <text class="hint">
        A hidden modal is left out of the native tree, so the screen under it keeps its touches.
      </text>

      <pressable class="button" (press)="open.set(true)">
        <text class="button-label">open modal</text>
      </pressable>

      @if (open()) {
        <modal [transparent]="true" animationType="fade">
          <view class="sheet" [style]="sheet">
            <text class="heading">A native modal</text>
            <pressable class="button" (press)="open.set(false)">
              <text class="button-label">close</text>
            </pressable>
          </view>
        </modal>
      }
    </scroll-view>
  `,
  styles: `
    .sheet {
      background-color: var(--card);
    }
  `,
})
export class ModalPage {
  protected readonly page = page;
  protected readonly open = signal(false);
  protected readonly sheet = {
    flex: 1,
    margin: 40,
    marginTop: 160,
    padding: 24,
    gap: 16,
    borderRadius: 14,
    justifyContent: 'center',
  };
}
