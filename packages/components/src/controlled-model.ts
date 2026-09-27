import { type ModelSignal, type SimpleChanges, untracked, ɵSIGNAL as SIGNAL } from '@angular/core';

/**
 * A `model()` that native edits, with React Native's controlled-component rule: once something
 * outside binds the model, its value is the truth, and a native edit is only a proposal.
 *
 * The model has to stay a model, because that is the whole of the Signal Forms contract. What
 * goes wrong with a plain `set` is a refusal. The user flips a switch, `set(true)` emits, the app
 * keeps `false` and writes it back - but that is the value its binding last wrote, so Angular
 * sends nothing down, and the model is left saying `true` while the app says `false`. Nothing
 * downstream can see the disagreement, because the model and native agree with each other.
 *
 * So `propose` emits the new value and then puts the model back where the parent last put it,
 * without emitting again. If the parent takes the value, its binding changes and writes it in
 * during change detection, as it would for any other input; if it refuses, the binding stays
 * quiet and the model is already back at the value the app kept. Either way, by the time the
 * pass has rendered the model says what the app says, and the component compares that with what
 * native is showing.
 *
 * The write back goes through the model's input node, the same call Angular makes for a binding,
 * which is the one way to set a model without emitting. Nothing bound means nothing to defer to,
 * and the model keeps what native reported, as an uncontrolled RN component does.
 */
export class ControlledModel<T> {
  /** Whether a binding or `FormField` has ever written the model. */
  private bound = false;
  private readonly model: ModelSignal<T>;
  private readonly name: string;

  constructor(model: ModelSignal<T>, name: string) {
    this.model = model;
    this.name = name;
  }

  /** Call from `ngOnChanges`. A template binding and `FormField` both arrive through it. */
  noteChanges(changes: SimpleChanges): void {
    if (this.name in changes) this.bound = true;
  }

  /** A native edit: emit it, and leave the model to the parent if it has one. */
  propose(value: T): void {
    const held = untracked(this.model);
    this.model.set(value);
    if (!this.bound) return;
    const node = this.model[SIGNAL];
    node.applyValueToInputSignal(node, held);
  }
}
