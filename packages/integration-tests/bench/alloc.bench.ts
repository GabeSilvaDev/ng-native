/**
 * Where creating a list allocates: V8's sampling heap profiler over one 1000-row create, counting
 * objects that were collected as well as those that live, since the collector's work is what
 * the allocations cost.
 *
 *     node --import ./bench/release.mjs --import @ng-native/testing/register bench/alloc.bench.ts
 */
import { Component, signal } from '@angular/core';
import { Session } from 'node:inspector/promises';
import { mount } from '@ng-native/platform';
import type { FabricUIManager } from '@ng-native/fabric';
import { Text } from '../../components/src/text.ts';
import { View } from '../../components/src/view.ts';

@Component({
  selector: 'x-alloc',
  imports: [Text, View],
  template: `
    <view>
      @for (row of rows(); track row.id) {
        <view [style]="row.id === selected() ? styles.row : styles.row"
          ><text [style]="styles.label">{{ row.label }}</text></view
        >
      }
    </view>
  `,
})
class Alloc {
  protected readonly styles = { row: { padding: 6 }, label: { fontSize: 12 } };
  readonly rows = signal<{ id: number; label: string }[]>([]);
  readonly selected = signal(-1);
}

const fabric: FabricUIManager = {
  createNode: () => ({}),
  cloneNodeWithNewChildren: () => ({}),
  cloneNodeWithNewProps: () => ({}),
  cloneNodeWithNewChildrenAndProps: () => ({}),
  appendChild: (parent) => parent,
  createChildSet: () => [],
  appendChildToSet: () => {},
  completeRoot: () => {},
  registerEventHandler: () => {},
};

interface Node {
  callFrame: { functionName: string; url: string; lineNumber: number };
  selfSize: number;
  children: Node[];
}

setTimeout(async () => {
  const app = mount(1, Alloc, fabric);
  const list = app.componentRef.instance as Alloc;
  const session = new Session();
  session.connect();
  await session.post('HeapProfiler.enable');
  await session.post('HeapProfiler.startSampling', {
    samplingInterval: 256,
    includeObjectsCollectedByMajorGC: true,
    includeObjectsCollectedByMinorGC: true,
  });
  list.rows.set(Array.from({ length: 1000 }, (_, i) => ({ id: i, label: `row ${i}` })));
  app.applicationRef.tick();
  const { profile } = (await session.post('HeapProfiler.stopSampling')) as {
    profile: { head: Node };
  };

  const bySite = new Map<string, number>();
  let total = 0;
  const walk = (node: Node, stack: string[]) => {
    const frame = `${node.callFrame.functionName || '(anon)'} ${node.callFrame.url.replace(/.*\//, '')}:${node.callFrame.lineNumber}`;
    const path = [...stack, frame];
    if (node.selfSize) {
      total += node.selfSize;
      // Attribute to the nearest frame in our own code or in Angular, whichever is closer.
      bySite.set(frame, (bySite.get(frame) ?? 0) + node.selfSize);
    }
    for (const child of node.children) walk(child, path);
  };
  walk(profile.head, []);
  console.log(`total sampled: ${(total / 1048576).toFixed(1)}MB for 1000 rows`);
  for (const [site, bytes] of [...bySite].sort((a, b) => b[1] - a[1]).slice(0, 25)) {
    console.log(
      `${((bytes / total) * 100).toFixed(1).padStart(5)}%  ${(bytes / 1024).toFixed(0).padStart(6)}KB  ${site}`,
    );
  }
  process.exit(0);
});
