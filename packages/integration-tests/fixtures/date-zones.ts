import { DatePipe } from '@angular/common';
import { Component } from '@angular/core';
import { Text } from '../../components/src/text.ts';

@Component({
  selector: 'x-date-zones',
  imports: [DatePipe, Text],
  template: `
    <text testID="utc">{{ when | date: 'HH:mm' : 'UTC' }}</text>
    <text testID="zero">{{ when | date: 'HH:mm' : '+0000' }}</text>
    <text testID="five">{{ when | date: 'HH:mm' : '+0500' }}</text>
    <text testID="colon">{{ when | date: 'HH:mm' : '-05:30' }}</text>
    <text testID="est">{{ when | date: 'HH:mm' : 'EST' }}</text>
    <text testID="named">{{ when | date: 'HH:mm' : 'Europe/Paris' }}</text>
  `,
})
export class DateZones {
  readonly when = new Date(Date.UTC(2026, 8, 25, 14, 30));
}
