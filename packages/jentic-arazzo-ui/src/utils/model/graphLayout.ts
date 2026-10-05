// layout operates on identities only; semantic relationships remain intact.
export interface LayoutRelationship {
  id: string;
  source: string;
  target: string;
  kind: string;
}

export const OVERVIEW_WIDTH = 280;
export const OVERVIEW_HEIGHT = 180;
const GAP_X = 100;
const GAP_Y = 100;

export function stronglyConnectedComponents(
  ids: readonly string[],
  edges: readonly LayoutRelationship[],
): string[][] {
  const order = new Map(ids.map((id, index) => [id, index]));
  const adjacency = new Map(ids.map((id) => [id, [] as string[]]));
  for (const edge of edges) {
    if (order.has(edge.source) && order.has(edge.target))
      adjacency.get(edge.source)!.push(edge.target);
  }
  const indices = new Map<string, number>();
  const low = new Map<string, number>();
  const stack: string[] = [];
  const stacked = new Set<string>();
  const components: string[][] = [];
  let next = 0;
  const visit = (id: string) => {
    indices.set(id, next);
    low.set(id, next++);
    stack.push(id);
    stacked.add(id);
    for (const target of adjacency.get(id)!) {
      if (!indices.has(target)) {
        visit(target);
        low.set(id, Math.min(low.get(id)!, low.get(target)!));
      } else if (stacked.has(target)) low.set(id, Math.min(low.get(id)!, indices.get(target)!));
    }
    if (low.get(id) === indices.get(id)) {
      const members: string[] = [];
      let member: string;
      do {
        member = stack.pop()!;
        stacked.delete(member);
        members.push(member);
      } while (member !== id);
      members.sort((a, b) => order.get(a)! - order.get(b)!);
      components.push(members);
    }
  };
  for (const id of ids) if (!indices.has(id)) visit(id);
  return components.sort((a, b) => order.get(a[0])! - order.get(b[0])!);
}

export function prerequisiteCycleEdges(
  ids: readonly string[],
  edges: readonly LayoutRelationship[],
): Set<string> {
  const prerequisites = edges.filter((edge) => edge.kind === 'prerequisite');
  const components = stronglyConnectedComponents(ids, prerequisites);
  const membership = new Map(
    components.flatMap((members, index) => members.map((id) => [id, index] as const)),
  );
  return new Set(
    prerequisites
      .filter((edge) => {
        const component = membership.get(edge.source);
        return (
          component !== undefined &&
          component === membership.get(edge.target) &&
          (components[component].length > 1 || edge.source === edge.target)
        );
      })
      .map((edge) => edge.id),
  );
}

export function layoutRelationshipGraph(
  ids: readonly string[],
  edges: readonly LayoutRelationship[],
  reservedColumns: ReadonlyMap<string, number> = new Map(),
): Map<string, { x: number; y: number }> {
  const positions = new Map<string, { x: number; y: number }>();
  const local = edges.filter((edge) => ids.includes(edge.source) && ids.includes(edge.target));
  if (edges.length === 0 && reservedColumns.size === 0) {
    ids.forEach((id, index) =>
      positions.set(id, {
        x: (index % 3) * (OVERVIEW_WIDTH + GAP_X),
        y: Math.floor(index / 3) * (OVERVIEW_HEIGHT + GAP_Y),
      }),
    );
    return positions;
  }
  const components = stronglyConnectedComponents(ids, local);
  const membership = new Map(
    components.flatMap((members, index) => members.map((id) => [id, index] as const)),
  );
  const outgoing = components.map(() => new Set<number>());
  const indegree = components.map(() => 0);
  for (const edge of local) {
    const source = membership.get(edge.source)!;
    const target = membership.get(edge.target)!;
    if (source !== target && !outgoing[source].has(target)) {
      outgoing[source].add(target);
      indegree[target]++;
    }
  }
  const rank = components.map(() => 0);
  const queue = components.map((_, index) => index).filter((index) => indegree[index] === 0);
  while (queue.length) {
    queue.sort((a, b) => a - b);
    const source = queue.shift()!;
    for (const target of outgoing[source]) {
      rank[target] = Math.max(rank[target], rank[source] + 1);
      if (--indegree[target] === 0) queue.push(target);
    }
  }
  let y = 0;
  for (let level = 0; level <= Math.max(0, ...rank); level++) {
    let x = 0;
    let levelHeight = 0;
    components.forEach((members, index) => {
      if (rank[index] !== level) return;
      const columns = Math.min(3, members.length);
      // reserve a side column for each supplementary reference belonging to a card.
      const slotWidths = members.map(
        (id) => OVERVIEW_WIDTH + (reservedColumns.get(id) || 0) * (OVERVIEW_WIDTH + GAP_X),
      );
      const widths = Array.from({ length: columns }, (_, column) =>
        Math.max(...slotWidths.filter((_, i) => i % columns === column)),
      );
      const rows = Math.ceil(members.length / columns);
      members.forEach((id, i) =>
        positions.set(id, {
          x: x + widths.slice(0, i % columns).reduce((sum, width) => sum + width + GAP_X, 0),
          y: y + Math.floor(i / columns) * (OVERVIEW_HEIGHT + GAP_Y),
        }),
      );
      x += widths.reduce((sum, width) => sum + width + GAP_X, 0);
      levelHeight = Math.max(levelHeight, rows * (OVERVIEW_HEIGHT + GAP_Y));
    });
    y += levelHeight;
  }
  return positions;
}
