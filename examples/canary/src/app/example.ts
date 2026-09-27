import { Component, input } from '@angular/core';
import { Text, View } from '@ng-native/components';

/**
 * A note written across several lines in a template keeps the source's indentation, because a
 * text node is text: native has no HTML whitespace collapsing to do it for us. So it is done
 * here, once, rather than by writing every note on one long line.
 */
const prose = (value: string): string => value.replace(/\s+/g, ' ').trim();

/**
 * One example, presented the way documentation presents one: what it is, what to look for, and
 * the thing itself running.
 *
 * The `note` is deliberately about *what to look at* rather than what the code says. Most of what
 * this project gets wrong is invisible - a selector that matches nothing, a unit that resolves to
 * zero - so an example that does not tell you what "working" looks like is not much of an example.
 */
@Component({
  selector: 'x-example',
  imports: [Text, View],
  template: `
    <view [style]="block">
      <text class="strong">{{ title() }}</text>
      @if (note()) {
        <text class="hint">{{ note() }}</text>
      }
      <view class="stage">
        <ng-content />
      </view>
      @if (code()) {
        <view [style]="codeBox">
          <text [style]="codeText">{{ code() }}</text>
        </view>
      }
    </view>
  `,
  styles: `
    .stage {
      background-color: var(--card-inset);
      border-radius: 10px;
      padding: 12px;
      gap: 8px;
    }
  `,
})
export class Example {
  readonly title = input.required<string>();
  /** What to look at, and what tells you it is wrong. */
  readonly note = input('', { transform: prose });
  /** The line or two that produced it. Optional: some examples are clearer without. */
  readonly code = input('');

  protected readonly block = { gap: 6, paddingVertical: 10 };
  /** Code reads as code on either palette, so the box stays dark in both. */
  protected readonly codeBox = { backgroundColor: '#08080c', borderRadius: 8, padding: 10 };
  protected readonly codeText = {
    color: '#8fb8ff',
    fontSize: 12,
    fontFamily: 'Menlo',
  };
}

/** A titled group of examples, so a long page reads as chapters rather than a list. */
@Component({
  selector: 'x-section',
  imports: [Text, View],
  template: `
    <view [style]="block">
      <text class="heading">{{ title() }}</text>
      @if (note()) {
        <text class="body">{{ note() }}</text>
      }
      <ng-content />
    </view>
  `,
})
export class Section {
  readonly title = input.required<string>();
  readonly note = input('', { transform: prose });
  protected readonly block = { gap: 4, paddingTop: 18 };
}
