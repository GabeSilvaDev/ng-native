import { Component, signal } from '@angular/core';
import { FormField, disabled, form, required } from '@angular/forms/signals';
import { UiDatePicker, UiHost, UiPicker } from '../../expo/src/expo-ui-components.ts';

/** A booking form: a date and a choice, both Signal Forms fields on SwiftUI controls. */
@Component({
  selector: 'x-ui-form',
  imports: [FormField, UiDatePicker, UiHost, UiPicker],
  template: `
    <ui-host>
      <ui-date-picker nativeID="date" title="Arrival" [formField]="f.arrival" />
      <ui-picker
        nativeID="room"
        label="Room"
        pickerStyle="menu"
        [options]="rooms"
        [formField]="f.room"
      />
    </ui-host>
  `,
})
export class UiForm {
  readonly data = signal({ arrival: new Date('2026-10-01T09:00:00.000Z'), room: 'double' });
  readonly locked = signal(false);
  readonly f = form(this.data, (path) => {
    required(path.room);
    disabled(path.arrival, () => this.locked());
  });
  readonly rooms = [
    { value: 'single', label: 'Single' },
    { value: 'double', label: 'Double' },
    { value: 'suite', label: 'Suite' },
  ];
}

/** Pickers disabled outside a form, by a bare attribute. */
@Component({
  selector: 'x-ui-disabled',
  imports: [UiDatePicker, UiHost, UiPicker],
  template: `
    <ui-host>
      <ui-date-picker nativeID="bare-date" disabled />
      <ui-picker nativeID="bare-room" disabled [options]="rooms" />
    </ui-host>
  `,
})
export class UiDisabled {
  readonly rooms = [{ value: 'single', label: 'Single' }];
}

/** Hosts sized to their SwiftUI content, both ways and one way. */
@Component({
  selector: 'x-ui-hosts',
  imports: [UiHost],
  template: `
    <ui-host nativeID="both" [matchContents]="true" />
    <ui-host nativeID="tall" [matchContents]="{ vertical: true }" />
  `,
})
export class UiHosts {}
