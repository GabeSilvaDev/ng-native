import { Component, signal } from '@angular/core';
import { Text, View } from '@ng-native/components';
import { beginPhase, report, saveReport } from './fabric-instrument.ts';
import { STEPS, STEP_MS, initial, styles } from './rows.ts';

/**
 * The benchmark screen, ours.
 *
 * The script in `rows.ts`, on a timer so no tap is needed and both sides run it identically. The
 * mount phase opens in the constructor - the moment this component starts rendering - so it
 * measures the same span as React's, which opens at the top of its own function body.
 */
@Component({
  selector: 'x-bench-angular',
  imports: [Text, View],
  template: `
    <view [style]="styles.page">
      <text [style]="styles.head">{{ summary() }}</text>
      @for (row of rows(); track row.id) {
        <view [style]="row.id === selected() ? styles.selected : row.style"
          ><text [style]="styles.label">{{ row.label }}</text></view
        >
      }
    </view>
  `,
})
export class AngularBench {
  protected readonly styles = styles;
  /**
   * Two signals where React has one state, because that is how each is written: a row reads the
   * selection and its own item, so it refreshes when one of those changes and not otherwise.
   */
  protected readonly rows = signal(initial().rows);
  protected readonly selected = signal(-1);
  protected readonly summary = signal('angular: measuring...');

  constructor() {
    beginPhase('mount');
    STEPS.slice(1).forEach((step, i) => {
      setTimeout(
        () => {
          beginPhase(step.name);
          const next = step.apply({ rows: this.rows(), selected: this.selected() });
          this.rows.set(next.rows);
          this.selected.set(next.selected);
        },
        (i + 1) * STEP_MS,
      );
    });
    setTimeout(() => this.show(), STEPS.length * STEP_MS);
  }

  private show(): void {
    const text = report();
    console.error(
      `[bench] keys ${(globalThis as { __bench?: { gcKeys(): string } }).__bench?.gcKeys()}`,
    );
    console.error(`[bench] angular | ${text.replace(/\n/g, ' | ')}`);
    saveReport(`[bench] angular | ${text.replace(/\n/g, ' | ')}`);
    this.summary.set(`angular\n${text}`);
  }
}
