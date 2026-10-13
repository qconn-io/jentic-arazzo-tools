import { describe, expect, it } from 'vitest';
import { layoutRelationshipGraph, prerequisiteCycleEdges } from '../src/utils/model/graphLayout';

const edge = (id: string, source: string, target: string, kind = 'prerequisite') => ({
  id,
  source,
  target,
  kind,
});

describe('workflow relationship layout', () => {
  it('flags only prerequisite edges internal to prerequisite cycles', () => {
    const edges = [
      edge('ab', 'a', 'b'),
      edge('ba', 'b', 'a'),
      edge('in', 'x', 'a'),
      edge('out', 'b', 'z'),
      edge('self', 'z', 'z'),
      edge('call', 'z', 'x', 'call'),
    ];
    expect([...prerequisiteCycleEdges(['a', 'b', 'x', 'z'], edges)]).toEqual(['ab', 'ba', 'self']);
    expect([
      ...prerequisiteCycleEdges(['a', 'b'], [edge('ab', 'a', 'b'), edge('ba', 'b', 'a', 'call')]),
    ]).toEqual([]);
  });

  it('keeps dense SCCs, parallel edges and disconnected cards deterministic and disjoint', () => {
    const ids = ['a', 'b', 'c', 'd', 'e', 'f', 'g'];
    const edges = [
      edge('ab', 'a', 'b'),
      edge('bc', 'b', 'c'),
      edge('ca', 'c', 'a', 'call'),
      edge('ab2', 'a', 'b', 'action'),
      edge('cd', 'c', 'd'),
      edge('dd', 'd', 'd', 'action'),
    ];
    const layout = layoutRelationshipGraph(ids, edges);
    expect(layoutRelationshipGraph(ids, edges)).toEqual(layout);
    for (const id of ids) {
      const a = layout.get(id)!;
      expect(Number.isFinite(a.x) && Number.isFinite(a.y)).toBe(true);
      for (const other of ids.filter((value) => value !== id)) {
        const b = layout.get(other)!;
        expect(a.x + 280 <= b.x || b.x + 280 <= a.x || a.y + 180 <= b.y || b.y + 180 <= a.y).toBe(
          true,
        );
      }
    }
    expect(layout.get('d')!.y).toBeGreaterThan(layout.get('a')!.y);
  });

  it('ranks each condensation component by its longest prerequisite path', () => {
    const layout = layoutRelationshipGraph(
      ['a', 'b', 'c', 'd'],
      [edge('ab', 'a', 'b'), edge('bc', 'b', 'c'), edge('ac', 'a', 'c'), edge('cd', 'c', 'd')],
    );
    expect(layout.get('b')!.y).toBeGreaterThan(layout.get('a')!.y);
    expect(layout.get('c')!.y).toBeGreaterThan(layout.get('b')!.y);
    expect(layout.get('d')!.y).toBeGreaterThan(layout.get('c')!.y);
  });

  it('uses a three-column grid when no local relationships exist', () => {
    const layout = layoutRelationshipGraph(['a', 'b', 'c', 'd'], []);
    expect(layout.get('a')).toEqual({ x: 0, y: 0 });
    expect(layout.get('b')!.y).toBe(0);
    expect(layout.get('d')!.x).toBe(0);
    expect(layout.get('d')!.y).toBeGreaterThan(180);
  });
});
