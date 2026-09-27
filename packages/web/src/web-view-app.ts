/**
 * Fixtures for `web-view.test.ts`: plain Angular DOM components, of the kind a `<dom-component>`
 * shows inside a native app. DOM elements and real CSS, nothing from Angular Native.
 */
import { Component, ErrorHandler, inject, input, model, output } from '@angular/core';

@Component({
  selector: 'app-note',
  styles: ['textarea { resize: vertical; }'],
  template: `
    <label id="label">{{ label() }}</label>
    <textarea id="text" [value]="text()" (input)="write($any($event.target).value)"></textarea>
    <button id="send" (click)="sent.emit(text())">Send</button>
    <button id="fail" (click)="fail()">Fail</button>
  `,
})
export class Note {
  readonly label = input('');
  readonly text = model('');
  readonly sent = output<string>();
  readonly handler = inject(ErrorHandler);

  protected write(value: string): void {
    this.text.set(value);
  }

  protected fail(): void {
    throw new Error('the note failed');
  }
}
