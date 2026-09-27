import {
  Component,
  Injector,
  afterNextRender,
  computed,
  inject,
  input,
  signal,
  viewChildren,
} from '@angular/core';
import type { NativeSyntheticEvent } from 'react-native';
import { KeyboardDock, Pressable, ScrollView, Text, TextInput, View } from '@ng-native/components';
import { NativeHeader, NativeHeaderItem } from '@ng-native/router';
import { Notes, inline, shortcut, wrapped, type Block, type BlockKind } from './notes-model.ts';

type Selection = { start: number; end: number };

const KINDS: readonly { kind: BlockKind; glyph: string; name: string }[] = [
  { kind: 'heading', glyph: 'H', name: 'Heading' },
  { kind: 'bullet', glyph: '•', name: 'Bullet list' },
  { kind: 'check', glyph: '☑︎', name: 'Checklist' },
  { kind: 'quote', glyph: '❝', name: 'Quote' },
];

/**
 * A note, as blocks: each block its own text field, so a heading, a list item, a checklist item
 * and a quote each have their own size and marker. Markdown turns a block into its kind as it is
 * typed (`# `, `- `, `[] `, `> `), return starts the next block and a list carries on, backspace
 * in an empty block takes it away, and a toolbar on the keyboard sets the kind or marks the
 * selection bold or italic. Reading mode draws the marks as nested text.
 */
@Component({
  selector: 'x-note-editor',
  imports: [
    KeyboardDock,
    NativeHeader,
    NativeHeaderItem,
    Pressable,
    ScrollView,
    Text,
    TextInput,
    View,
  ],
  template: `
    <native-header [title]="reading() ? note()?.title || 'Note' : ''">
      <native-header-item type="right">
        <pressable
          accessibilityRole="button"
          [accessibilityLabel]="reading() ? 'Edit' : 'Done'"
          (press)="reading.set(!reading())"
        >
          <text class="mode">{{ reading() ? 'Edit' : 'Done' }}</text>
        </pressable>
      </native-header-item>
    </native-header>
    @if (note(); as note) {
      <view class="screen">
        <scroll-view
          class="page"
          contentInsetAdjustmentBehavior="automatic"
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
        >
          @if (reading()) {
            <text class="read-title" accessibilityRole="header">{{
              note.title || 'Untitled'
            }}</text>
            @for (block of note.blocks; track block.id) {
              <view [class]="'read-block ' + block.kind" [class.done]="block.done">
                @if (block.kind === 'bullet') {
                  <text class="marker">•</text>
                } @else if (block.kind === 'check') {
                  <text class="marker">{{ block.done ? '☑︎' : '☐' }}</text>
                }
                <text class="read-text">
                  @for (span of spans(block); track $index) {
                    <text
                      [class.bold]="span.bold"
                      [class.italic]="span.italic"
                      [class.code]="span.code"
                      [class.strike]="span.strike"
                      >{{ span.text }}</text
                    >
                  }
                </text>
              </view>
            }
          } @else {
            <text-input
              class="title-field"
              placeholder="Title"
              accessibilityLabel="Title"
              [value]="note.title"
              (valueChange)="rename($event)"
            />
            @for (block of note.blocks; track block.id; let i = $index) {
              <view [class]="'block ' + block.kind" [class.done]="block.done">
                @if (block.kind === 'bullet') {
                  <text class="marker">•</text>
                } @else if (block.kind === 'check') {
                  <pressable
                    class="box"
                    accessibilityRole="checkbox"
                    [accessibilityLabel]="block.text || 'Item'"
                    [accessibilityState]="{ checked: !!block.done }"
                    (press)="toggle(block)"
                  >
                    <text class="marker">{{ block.done ? '☑︎' : '☐' }}</text>
                  </pressable>
                }
                <text-input
                  class="text"
                  [multiline]="true"
                  [scrollEnabled]="false"
                  submitBehavior="submit"
                  [placeholder]="i === 0 && !block.text ? 'Start writing' : ''"
                  [accessibilityLabel]="accessibleKind(block.kind) + ' ' + (i + 1)"
                  [value]="block.text"
                  (valueChange)="edit(block, $event)"
                  (submitEditing)="split(block)"
                  (keyPress)="key(block, i, $event)"
                  (focus)="focused.set(block.id)"
                  (selectionChange)="select($event)"
                />
              </view>
            }
          }
        </scroll-view>

        @if (!reading()) {
          <keyboard-dock class="dock">
            <view class="toolbar" accessibilityRole="toolbar">
              @for (one of kinds; track one.kind) {
                <pressable
                  class="tool"
                  [class.on]="focusedBlock()?.kind === one.kind"
                  accessibilityRole="button"
                  [accessibilityLabel]="one.name"
                  [accessibilityState]="{ selected: focusedBlock()?.kind === one.kind }"
                  (press)="setKind(one.kind)"
                >
                  <text class="tool-glyph">{{ one.glyph }}</text>
                </pressable>
              }
              <view class="rule"></view>
              <pressable
                class="tool"
                accessibilityRole="button"
                accessibilityLabel="Bold"
                (press)="mark('**')"
              >
                <text class="tool-glyph bold">B</text>
              </pressable>
              <pressable
                class="tool"
                accessibilityRole="button"
                accessibilityLabel="Italic"
                (press)="mark('*')"
              >
                <text class="tool-glyph italic">I</text>
              </pressable>
            </view>
          </keyboard-dock>
        }
      </view>
    }
  `,
  styles: `
    :host {
      --ink: light-dark(oklch(0.22 0.02 80), oklch(0.95 0.01 90));
      --soft: light-dark(oklch(0.55 0.02 80), oklch(0.68 0.01 90));
      --accent: oklch(0.7 0.16 70);
    }
    .screen,
    .page {
      flex: 1;
      background-color: light-dark(oklch(0.985 0.008 90), oklch(0.14 0.01 90));
    }
    .mode {
      color: var(--accent);
      font-size: 17px;
      font-weight: 700;
    }
    .title-field,
    .read-title {
      margin: 8px 20px 10px;
      color: var(--ink);
      font-size: 30px;
      font-weight: 900;
      letter-spacing: -0.6px;
    }
    .block,
    .read-block {
      flex-direction: row;
      align-items: flex-start;
      gap: 8px;
      padding: 0 20px;
    }
    .text,
    .read-text {
      flex: 1;
      padding: 4px 0;
      color: var(--ink);
      font-size: 17px;
      line-height: 24px;
    }
    .heading .text,
    .heading .read-text {
      margin-top: 12px;
      font-size: 22px;
      line-height: 28px;
      font-weight: 800;
    }
    .quote {
      margin: 4px 20px;
      padding: 0 0 0 14px;
      border-left-width: 3px;
      border-left-color: var(--accent);
    }
    .quote .text,
    .quote .read-text {
      color: var(--soft);
      font-style: italic;
    }
    .marker {
      padding-top: 4px;
      color: var(--accent);
      font-size: 17px;
      line-height: 24px;
      font-weight: 800;
    }
    .done .text,
    .done .read-text {
      color: var(--soft);
      text-decoration-line: line-through;
    }
    .bold {
      font-weight: 800;
    }
    .italic {
      font-style: italic;
    }
    .code {
      font-family: Menlo;
      font-size: 15px;
      color: oklch(0.55 0.15 30);
      background-color: light-dark(oklch(0.94 0.02 30), oklch(0.28 0.03 30));
    }
    .strike {
      text-decoration-line: line-through;
    }
    .toolbar {
      flex-direction: row;
      align-items: center;
      gap: 4px;
      padding: 8px 12px;
      border-top-width: var(--hairline, 0.5px);
      border-top-color: light-dark(oklch(0.88 0.01 90), oklch(0.3 0.01 90));
      background-color: light-dark(oklch(0.97 0.008 90), oklch(0.19 0.01 90));
    }
    .tool {
      width: 40px;
      height: 36px;
      border-radius: 10px;
      align-items: center;
      justify-content: center;
    }
    .on {
      background-color: oklch(from var(--accent) l c h / 0.2);
    }
    .tool-glyph {
      color: var(--ink);
      font-size: 18px;
    }
    .rule {
      width: 1px;
      height: 22px;
      margin: 0 6px;
      background-color: light-dark(oklch(0.85 0.01 90), oklch(0.35 0.01 90));
    }
  `,
})
export class NoteEditor {
  readonly id = input.required<string>();
  private readonly notes = inject(Notes);
  private readonly injector = inject(Injector);
  private readonly fields = viewChildren(TextInput);
  protected readonly kinds = KINDS;
  protected readonly note = computed(() => this.notes.all().find((note) => note.id === this.id()));
  protected readonly reading = signal(false);
  protected readonly focused = signal<string | null>(null);
  protected readonly focusedBlock = computed(() =>
    this.note()?.blocks.find((block) => block.id === this.focused()),
  );
  private selection: Selection = { start: 0, end: 0 };

  protected spans(block: Block) {
    return inline(block.text);
  }

  protected accessibleKind(kind: BlockKind): string {
    return KINDS.find((one) => one.kind === kind)?.name ?? 'Paragraph';
  }

  protected rename(title: string): void {
    this.notes.update(this.id(), () => ({ title }));
  }

  protected edit(block: Block, text: string): void {
    // Again in a block the shortcut already made, while its prefix is still there: typed quickly,
    // the text the field was given without it arrives after more keys, and native keeps its own
    // then, as a controlled field does. The last key's text settles it.
    const typed = shortcut(text);
    const applies = typed && (block.kind === 'paragraph' || typed.kind === block.kind);
    this.replace(block.id, applies ? typed : { text });
  }

  protected toggle(block: Block): void {
    this.replace(block.id, { done: !block.done });
  }

  protected split(block: Block): void {
    // Return in an empty list item ends the list, as every editor does.
    if (!block.text && block.kind !== 'paragraph') {
      this.replace(block.id, { kind: 'paragraph' });
      return;
    }
    const made = this.notes.split(this.id(), block.id);
    if (made) this.focus(made.id);
  }

  protected key(block: Block, index: number, event: NativeSyntheticEvent<{ key: string }>): void {
    if (event.nativeEvent.key !== 'Backspace' || block.text || index === 0) return;
    const before = this.note()?.blocks[index - 1];
    this.notes.remove(this.id(), block.id);
    if (before) this.focus(before.id);
  }

  protected select(event: NativeSyntheticEvent<{ selection: Selection }>): void {
    this.selection = event.nativeEvent.selection;
  }

  protected setKind(kind: BlockKind): void {
    const block = this.focusedBlock();
    if (block) this.replace(block.id, { kind: block.kind === kind ? 'paragraph' : kind });
  }

  protected mark(around: string): void {
    const block = this.focusedBlock();
    if (!block) return;
    this.replace(block.id, { text: wrapped(block.text, this.selection, around).text });
  }

  private replace(blockId: string, change: Partial<Block>): void {
    this.notes.update(this.id(), (note) => ({
      blocks: note.blocks.map((block) => (block.id === blockId ? { ...block, ...change } : block)),
    }));
  }

  /** Put the caret in a block once it is on screen. The title is the first field, so blocks start at one. */
  private focus(blockId: string): void {
    afterNextRender(
      () => {
        const index = this.note()?.blocks.findIndex((block) => block.id === blockId) ?? -1;
        this.fields()[index + 1]?.focus();
      },
      { injector: this.injector },
    );
  }
}
