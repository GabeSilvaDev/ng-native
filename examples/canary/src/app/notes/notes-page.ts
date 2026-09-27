import { Component, inject } from '@angular/core';
import { Pressable, ScrollView, Text, View } from '@ng-native/components';
import { NativeHeader, NativeNavigation } from '@ng-native/router';
import { Notes, inline, type Note } from './notes-model.ts';

const WHEN = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' });

/** The notes, newest first: each a card with its title and the start of what it says. */
@Component({
  selector: 'x-notes',
  imports: [NativeHeader, Pressable, ScrollView, Text, View],
  template: `
    <native-header title="Notes" [largeTitle]="true" />
    <view class="screen">
      <scroll-view class="page" contentInsetAdjustmentBehavior="automatic">
        @for (note of notes.all(); track note.id) {
          <pressable
            class="card"
            accessibilityRole="button"
            [accessibilityLabel]="(note.title || 'Untitled') + ', ' + preview(note)"
            (press)="open(note.id)"
          >
            <text class="title" [numberOfLines]="1">{{ note.title || 'Untitled' }}</text>
            <text class="preview" [numberOfLines]="2">
              <text class="date">{{ when(note) }} </text>{{ preview(note) }}
            </text>
          </pressable>
        }
      </scroll-view>
      <pressable
        class="new"
        accessibilityRole="button"
        accessibilityLabel="New note"
        (press)="create()"
      >
        <text class="new-glyph">✎</text>
      </pressable>
    </view>
  `,
  styles: `
    .screen,
    .page {
      flex: 1;
      background-color: light-dark(oklch(0.97 0.012 90), oklch(0.16 0.01 90));
    }
    .card {
      margin: 0 16px 12px;
      padding: 14px 16px;
      border-radius: 18px;
      background-color: light-dark(white, oklch(0.23 0.01 90));
      box-shadow: 0 6px 16px -12px light-dark(rgba(60, 40, 0, 0.4), black);
    }
    .card:first-child {
      margin-top: 8px;
    }
    .title {
      color: light-dark(oklch(0.22 0.02 80), oklch(0.95 0.01 90));
      font-size: 17px;
      font-weight: 700;
    }
    .preview {
      margin-top: 4px;
      color: light-dark(oklch(0.5 0.02 80), oklch(0.7 0.01 90));
      font-size: 14px;
      line-height: 19px;
    }
    .date {
      color: oklch(0.62 0.15 70);
      font-weight: 700;
    }
    .new {
      position: absolute;
      right: 20px;
      bottom: 34px;
      width: 58px;
      height: 58px;
      border-radius: 29px;
      align-items: center;
      justify-content: center;
      background-image: linear-gradient(145deg, oklch(0.82 0.16 85), oklch(0.7 0.17 60));
      box-shadow: 0 14px 24px -10px oklch(0.6 0.17 60 / 0.7);
    }
    .new-glyph {
      color: white;
      font-size: 24px;
      font-weight: 700;
    }
  `,
})
export class NotesPage {
  protected readonly notes = inject(Notes);
  private readonly nav = inject(NativeNavigation);

  protected preview(note: Note): string {
    const first = note.blocks.find((block) => block.text) ?? note.blocks[0];
    return first
      ? inline(first.text)
          .map((span) => span.text)
          .join('') || 'No text'
      : 'No text';
  }

  protected when(note: Note): string {
    return WHEN.format(new Date(note.edited));
  }

  protected open(id: string): void {
    void this.nav.push(`/notes/${id}`);
  }

  protected create(): void {
    this.open(this.notes.create().id);
  }
}
