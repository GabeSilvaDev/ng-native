import { Component, input, output } from '@angular/core';
import {
  UiButton,
  UiHost,
  UiList,
  UiSlot,
  UiSwipeActions,
  UiText,
  UiVStack,
  type UiModifier,
} from '@ng-native/expo';
import type { Mail } from './inbox-model.ts';

/**
 * A folder of messages as iOS draws a list: a SwiftUI `List`, whose rows take the system's own
 * swipe actions - Archive and Delete from the trailing edge, a full swipe deleting - with the look
 * and the feel of Mail on the version of iOS the phone runs.
 */
@Component({
  selector: 'x-inbox-native-list',
  imports: [UiButton, UiHost, UiList, UiSlot, UiSwipeActions, UiText, UiVStack],
  template: `
    <ui-host [style]="size()">
      <ui-list [modifiers]="listModifiers">
        @for (mail of mails(); track mail.id) {
          <ui-swipe-actions>
            <ui-button [modifiers]="rowModifiers" (buttonPress)="opened.emit(mail)">
              <ui-vstack alignment="leading" [spacing]="2">
                <ui-text [text]="mail.from" [modifiers]="mail.unread ? unreadFrom : from" />
                <ui-text [text]="mail.subject" [modifiers]="subject" />
                <ui-text [text]="mail.preview" [modifiers]="preview" />
              </ui-vstack>
            </ui-button>
            <ui-slot name="actions" [extraProps]="trailing">
              <ui-button
                label="Delete"
                systemImage="trash"
                role="destructive"
                (buttonPress)="removed.emit(mail)"
              />
              <ui-button
                label="Archive"
                systemImage="archivebox"
                [modifiers]="archiveModifiers"
                (buttonPress)="archived.emit(mail)"
              />
            </ui-slot>
          </ui-swipe-actions>
        }
      </ui-list>
    </ui-host>
  `,
})
export class InboxNativeList {
  readonly mails = input.required<readonly Mail[]>();
  /** The page's size. A SwiftUI list has no height of its own for the layout to give it. */
  readonly size = input.required<{ width: number; height: number | undefined }>();
  readonly opened = output<Mail>();
  readonly archived = output<Mail>();
  readonly removed = output<Mail>();

  protected readonly trailing = { edge: 'trailing', allowsFullSwipe: true };
  protected readonly listModifiers = [modifier('listStyle', { style: 'plain' })];
  // A plain button, so the row reads as text rather than taking the accent colour of a button.
  protected readonly rowModifiers = [modifier('buttonStyle', { style: 'plain' })];
  protected readonly from = [font('regular', 16), oneLine];
  protected readonly unreadFrom = [font('semibold', 16), oneLine];
  protected readonly subject = [font('regular', 15), oneLine];
  protected readonly preview = [
    font('regular', 14),
    modifier('foregroundStyle', { style: { type: 'hierarchical', hierarchical: 'secondary' } }),
    modifier('lineLimit', { limit: 2 }),
  ];
  protected readonly archiveModifiers = [modifier('tint', { color: '#8e5cf6' })];
}

/**
 * One SwiftUI modifier, as \`@expo/ui\`'s modifier functions build them. Written out rather than
 * imported: that module loads its native half as it is imported, which a test has no way to.
 */
function modifier(type: string, params: Record<string, unknown>): UiModifier {
  return { $type: type, ...params };
}

function font(weight: 'regular' | 'semibold', size: number): UiModifier {
  return modifier('font', { weight, size });
}

const oneLine = modifier('lineLimit', { limit: 1 });
