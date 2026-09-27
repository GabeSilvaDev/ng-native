import { Component, computed, inject, signal, type OnDestroy } from '@angular/core';
import {
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from '@ng-native/components';
import { LanguageModel, type LanguageModelStream } from '@ng-native/expo/language-model';
import { NativeHeader } from '@ng-native/router';
import { page } from '../screen-styles.ts';

const REASONS: Record<string, string> = {
  notEligible: 'This device or OS version cannot run the on-device model.',
  notEnabled: 'Apple Intelligence is switched off in Settings.',
  notReady: 'The model is still being prepared by the system.',
  downloadRequired: 'Gemini Nano needs downloading first.',
  downloading: 'Gemini Nano is downloading.',
  unknown: 'The platform gave a reason expo-local-llm does not name.',
  notInstalled: 'expo-local-llm is not in this build.',
};

/**
 * `LanguageModel`: a prompt, and the answer streamed into the page as the model writes it.
 * Foundation Models on iOS 26, Gemini Nano on Android; the availability line says which of the
 * platform's reasons applies when it cannot answer.
 */
@Component({
  selector: 'x-language-model',
  imports: [KeyboardAvoidingView, NativeHeader, Pressable, ScrollView, Text, TextInput, View],
  template: `
    <native-header title="On-device AI" />
    <keyboard-avoiding-view class="screen" [keyboardVerticalOffset]="100">
      <scroll-view class="screen" [contentContainerStyle]="page.content">
        <text class="body">Availability: {{ model.availability() }}</text>
        @if (!model.available()) {
          <text class="hint">{{ reason() }}</text>
          <pressable class="card" (press)="model.refresh()">
            <text class="button-label">Check again</text>
          </pressable>
        }

        <text-input
          class="field prompt"
          [(value)]="prompt"
          placeholder="Ask something"
          placeholderTextColor="#6c6c78"
          [multiline]="true"
        />
        <view [style]="page.row">
          <pressable class="button" [style]="grow" (press)="ask()">
            <text class="button-label">Ask</text>
          </pressable>
          @if (streaming()) {
            <pressable class="card" [style]="grow" (press)="answer()?.cancel()">
              <text class="button-label">Stop</text>
            </pressable>
          }
        </view>

        @if (answer(); as stream) {
          <text class="hint">{{ stream.status() }}</text>
          <text class="body">{{ stream.text() }}</text>
          @if (stream.error(); as error) {
            <text class="body danger">{{ error }}</text>
          }
        }
      </scroll-view>
    </keyboard-avoiding-view>
  `,
})
export class LanguageModelPage implements OnDestroy {
  protected readonly model = inject(LanguageModel);
  protected readonly page = page;
  protected readonly prompt = signal('Write a haiku about the Thames.');
  protected readonly answer = signal<LanguageModelStream | null>(null);
  protected readonly streaming = computed(() => this.answer()?.status() === 'streaming');
  protected readonly reason = computed(() => REASONS[this.model.availability()] ?? '');

  protected readonly grow = { flex: 1 };

  ngOnDestroy(): void {
    this.answer()?.cancel();
  }

  protected ask(): void {
    this.answer.set(
      this.model.stream(this.prompt(), { instructions: 'Answer briefly, in British English.' }),
    );
  }
}
