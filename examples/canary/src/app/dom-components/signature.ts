'use dom';
/**
 * A DOM component, shown on a native screen by `<dom-component>` (see `dom-components.ts`).
 *
 * Ordinary Angular for the browser: a `<canvas>` and real CSS, neither of which native has. It is
 * compiled by the app's own Metro, as a web bundle, and runs in a web view.
 */
import { Component, ElementRef, effect, input, output, viewChild } from '@angular/core';
import { mountInWebView } from '@ng-native/web/web-view';

@Component({
  selector: 'app-signature',
  styles: [
    `
      :host {
        display: block;
        font:
          15px -apple-system,
          system-ui,
          sans-serif;
        color: #8e8e93;
      }
      canvas {
        display: block;
        box-sizing: border-box;
        width: 100%;
        height: 180px;
        touch-action: none;
        background: repeating-linear-gradient(#fff 0 35px, #e5e5ea 35px 36px);
        border: 1px solid #d1d1d6;
        border-radius: 12px;
      }
      .bar {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-top: 8px;
      }
      button {
        font: inherit;
        color: #c4002d;
        background: none;
        border: 0;
        padding: 6px 0;
      }
    `,
  ],
  template: `
    <canvas
      #pad
      (pointerdown)="start($event)"
      (pointermove)="draw($event)"
      (pointerup)="finish()"
    ></canvas>
    <div class="bar">
      <span>Sign as {{ name() }}</span>
      <button (click)="clear()">Clear</button>
    </div>
  `,
})
export class Signature {
  readonly name = input('');
  readonly ink = input('#1c1c1e');
  readonly strokes = output<number>();
  readonly cleared = output<void>();

  private readonly pad = viewChild.required<ElementRef<HTMLCanvasElement>>('pad');
  private drawing = false;
  private count = 0;

  constructor() {
    effect(() => {
      const canvas = this.pad().nativeElement;
      const scale = window.devicePixelRatio;
      canvas.width = canvas.clientWidth * scale;
      canvas.height = canvas.clientHeight * scale;
      const context = this.context();
      context.scale(scale, scale);
      context.lineWidth = 2.5;
      context.lineCap = 'round';
    });
    effect(() => (this.context().strokeStyle = this.ink()));
  }

  protected start(event: PointerEvent): void {
    this.drawing = true;
    this.context().beginPath();
    this.context().moveTo(event.offsetX, event.offsetY);
  }

  protected draw(event: PointerEvent): void {
    if (!this.drawing) return;
    this.context().lineTo(event.offsetX, event.offsetY);
    this.context().stroke();
  }

  protected finish(): void {
    if (!this.drawing) return;
    this.drawing = false;
    this.strokes.emit(++this.count);
  }

  protected clear(): void {
    const canvas = this.pad().nativeElement;
    this.context().clearRect(0, 0, canvas.width, canvas.height);
    this.count = 0;
    this.cleared.emit();
  }

  private context(): CanvasRenderingContext2D {
    return this.pad().nativeElement.getContext('2d')!;
  }
}

export default mountInWebView(Signature);
