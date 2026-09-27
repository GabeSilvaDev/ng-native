import { Component, signal } from '@angular/core';
import { Text, View } from '../../components/src/index.ts';

@Component({
  selector: 'x-i18n',
  imports: [Text, View],
  template: `
    <view>
      <text nativeID="greeting" i18n="@@greeting">Hello, {{ name() }}!</text>
      <text nativeID="plain" i18n>Plain text</text>
    </view>
  `,
})
export class I18nHost {
  readonly name = signal('Ada');
}
