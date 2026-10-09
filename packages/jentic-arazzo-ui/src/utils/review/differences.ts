import type {
  WorkflowReviewCategory,
  WorkflowReviewEvidence,
  WorkflowReviewEffect,
  WorkflowReviewOptions,
} from '../../types/review';
import { object } from '../contract/references';
import { encodePointer } from '../contract/pointer';
import { effectiveUseLocation, pointersOverlap } from '../model/effectiveUses';
import { catalogKey } from '../catalog/manifest';
import type { ReviewDocument, ReviewProjection } from './inputs';
export interface Difference {
  category: WorkflowReviewCategory;
  before?: WorkflowReviewEvidence;
  after?: WorkflowReviewEvidence;
  effects: WorkflowReviewEffect[];
}
export const canonical = (value: unknown): unknown =>
  Array.isArray(value)
    ? value.map(canonical)
    : value !== null && typeof value === 'object'
      ? Object.fromEntries(
          Object.entries(value)
            .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
            .map(([key, child]) => [key, canonical(child)]),
        )
      : value;
const equal = (a: unknown, b: unknown) =>
  JSON.stringify(canonical(a)) === JSON.stringify(canonical(b));
const pointer = (path: (string | number)[]) => encodePointer(path.map(String));
const category = (path: (string | number)[]): WorkflowReviewCategory => {
  if (path.some((k) => typeof k === 'string' && k.startsWith('x-'))) return 'metadata';
  if (
    path.some((k) =>
      [
        'onSuccess',
        'onFailure',
        'failureActions',
        'successActions',
        'retryLimit',
        'retryAfter',
        'timeout',
        'workflowId',
        'operationId',
        'operationPath',
      ].includes(String(k)),
    )
  )
    return 'actions';
  if (path.some((k) => ['successCriteria', 'criteria', 'dependsOn'].includes(String(k))))
    return 'criteria';
  if (path.includes('sourceDescriptions')) return 'sources';
  if (path.some((k) => ['parameters', 'requestBody', 'payload', 'outputs'].includes(String(k))))
    return 'mappings';
  if (path.some((k) => ['summary', 'description', 'info', 'tags', 'title'].includes(String(k))))
    return 'metadata';
  return 'declarations';
};
function evidence(
  projection: ReviewProjection,
  doc: ReviewDocument,
  path: (string | number)[],
  value: unknown,
  present: boolean,
  workflowId?: string,
  stepId?: string,
): WorkflowReviewEvidence {
  const entry = workflowId
    ? projection.index.byKey.get(
        catalogKey({
          documentId: doc.definition.id,
          revision: doc.definition.revision,
          workflowId,
        }),
      )
    : undefined;
  const location = entry ? structuredClone(entry.location) : undefined;
  if (location && stepId) location.selection = { kind: 'step', workflowId: workflowId!, stepId };
  // action addresses come from the same effective uses as catalog relationships.
  const use = entry?.document.effectiveUses?.find(
    (use) =>
      use.workflowId === workflowId &&
      use.stepId === stepId &&
      (pointer(path) === use.usePointer || pointer(path).startsWith(use.usePointer + '/')),
  );
  const actionLocation = location && use ? effectiveUseLocation(location, use) : location;
  return {
    documentId: doc.definition.id,
    revision: doc.definition.revision,
    uri: doc.definition.uri,
    digest: doc.digest,
    pointer: pointer(path),
    present,
    ...(present ? { value: value as WorkflowReviewEvidence['value'] } : {}),
    workflowId,
    stepId,
    location: actionLocation,
  };
}
function applicableUses(
  projection: ReviewProjection,
  e: WorkflowReviewEvidence | undefined,
  side: 'baseline' | 'candidate',
): WorkflowReviewEffect[] {
  if (!e?.present) return [];
  const effects: WorkflowReviewEffect[] = [];
  for (const entry of projection.index.entries.filter(
    (x) => x.documentId === e.documentId && x.revision === e.revision,
  ))
    for (const use of entry.document.effectiveUses ?? []) {
      if (use.workflowId !== entry.workflowId) continue;
      if (
        !pointersOverlap(e.pointer, use.declarationPointer) &&
        !pointersOverlap(e.pointer, use.usePointer)
      )
        continue;
      effects.push({
        side,
        declarationPointer: use.declarationPointer,
        location: effectiveUseLocation(entry.location, use),
        value: use.action.value as WorkflowReviewEffect['value'],
      });
    }
  return effects;
}
export function authoredDifferences(
  baseline: ReviewProjection,
  candidate: ReviewProjection,
  options: WorkflowReviewOptions,
): Difference[] {
  const differences: Difference[] = [];
  const emit = (
    category: WorkflowReviewCategory,
    before?: WorkflowReviewEvidence,
    after?: WorkflowReviewEvidence,
  ) =>
    differences.push({
      category,
      before,
      after,
      effects: [
        ...applicableUses(baseline, before, 'baseline'),
        ...applicableUses(candidate, after, 'candidate'),
      ],
    });
  const ids = [
    ...new Set([...baseline.documents, ...candidate.documents].map((d) => d.definition.id)),
  ].sort();
  for (const id of ids) {
    const a = baseline.documents.find((d) => d.definition.id === id),
      b = candidate.documents.find((d) => d.definition.id === id);
    const kind = (a ?? b)!.definition.kind ?? 'arazzo';
    const contract = kind !== 'arazzo';
    // Missing bytes are unknown, not evidence that the historic contract had no declarations.
    if (contract && (!a || !b)) continue;
    const ev = (
      p: ReviewProjection,
      d: ReviewDocument | undefined,
      path: (string | number)[],
      v: unknown,
      present: boolean,
      w?: string,
      s?: string,
    ) => (d ? evidence(p, d, path, v, present, w, s) : undefined);
    const diff = (
      x: unknown,
      y: unknown,
      pa: (string | number)[],
      pb: (string | number)[],
      xp: boolean,
      yp: boolean,
      wa?: string,
      wb?: string,
      sa?: string,
      sb?: string,
    ) => {
      if (xp === yp && equal(x, y)) return;
      const before = () => ev(baseline, a, pa, x, xp, wa, sa),
        after = () => ev(candidate, b, pb, y, yp, wb, sb);
      const authoredCategory = category(pa.length ? pa : pb);
      const extension = [...pa, ...pb].some((k) => typeof k === 'string' && k.startsWith('x-'));
      const cat = contract && !extension ? 'contracts' : authoredCategory;
      if (!xp || !yp) {
        emit(cat, before(), after());
        return;
      }
      if (
        x &&
        y &&
        typeof x === 'object' &&
        typeof y === 'object' &&
        !Array.isArray(x) &&
        !Array.isArray(y)
      ) {
        const old = x as Record<string, unknown>,
          next = y as Record<string, unknown>;
        for (const key of [...new Set([...Object.keys(old), ...Object.keys(next)])].sort())
          diff(
            old[key],
            next[key],
            [...pa, key],
            [...pb, key],
            Object.hasOwn(old, key),
            Object.hasOwn(next, key),
            wa,
            wb,
            sa,
            sb,
          );
      } else if (Array.isArray(x) && Array.isArray(y)) {
        // Index comparison preserves sequence order and exact falsy payload leaves.
        for (let i = 0; i < Math.max(x.length, y.length); i++)
          diff(x[i], y[i], [...pa, i], [...pb, i], i < x.length, i < y.length, wa, wb, sa, sb);
      } else emit(cat, before(), after());
    };
    if (contract) {
      diff(a!.raw, b!.raw, [], [], true, true);
      continue;
    }
    if (!a || !b) {
      emit('structure', ev(baseline, a, [], a?.raw, !!a), ev(candidate, b, [], b?.raw, !!b));
      continue;
    }
    const old = Array.isArray(a.raw.workflows) ? a.raw.workflows : [],
      next = Array.isArray(b.raw.workflows) ? b.raw.workflows : [];
    const matchList = options.matches ?? [];
    const paired = new Set<number>();
    // Explicit matches reserve destinations; ordinary ID matching cannot steal them.
    const workflowMatches = matchList.filter((m) => m.before.documentId === id && !m.before.stepId);
    for (const match of workflowMatches) {
      const implicit = old.some(
        (w) =>
          object(w).workflowId === match.after.workflowId &&
          object(w).workflowId !== match.before.workflowId &&
          !workflowMatches.some((m) => m.before.workflowId === match.after.workflowId),
      );
      if (implicit) throw new Error('Explicit match collides with stable workflow match');
    }
    for (let i = 0; i < old.length; i++) {
      const w = object(old[i]),
        wa = String(w.workflowId);
      const match = workflowMatches.find((m) => m.before.workflowId === wa);
      const j = next.findIndex((v) => object(v).workflowId === (match?.after.workflowId ?? wa));
      const v = j >= 0 ? object(next[j]) : undefined,
        wb = v ? String(v.workflowId) : undefined;
      if (j < 0) {
        emit(
          'structure',
          ev(baseline, a, ['workflows', i], w, true, wa),
          ev(candidate, b, ['workflows'], undefined, false, wa),
        );
        continue;
      }
      if (paired.has(j)) throw new Error('Colliding workflow match');
      paired.add(j);
      for (const key of [...new Set([...Object.keys(w), ...Object.keys(v!)])]
        .filter((k) => k !== 'steps')
        .sort())
        diff(
          w[key],
          v![key],
          ['workflows', i, key],
          ['workflows', j, key],
          Object.hasOwn(w, key),
          Object.hasOwn(v!, key),
          wa,
          wb,
        );
      const xs = Array.isArray(w.steps) ? w.steps : [],
        ys = Array.isArray(v!.steps) ? v!.steps : [];
      const stepMatches = matchList.filter(
        (m) => m.before.documentId === id && m.before.workflowId === wa && m.before.stepId,
      );
      if (stepMatches.some((m) => m.after.workflowId !== wb))
        throw new Error('Step match conflicts with workflow pairing');
      const claimed = new Set<number>();
      for (let k = 0; k < xs.length; k++) {
        const sx = object(xs[k]),
          sa = String(sx.stepId),
          m = stepMatches.find((m) => m.before.stepId === sa);
        const l = ys.findIndex((s) => object(s).stepId === (m?.after.stepId ?? sa)),
          sy = l >= 0 ? object(ys[l]) : undefined;
        if (l < 0) {
          emit(
            'structure',
            ev(baseline, a, ['workflows', i, 'steps', k], sx, true, wa, sa),
            ev(candidate, b, ['workflows', j, 'steps'], undefined, false, wb, sa),
          );
          continue;
        }
        if (claimed.has(l)) throw new Error('Colliding step match');
        claimed.add(l);
        diff(
          sx,
          sy,
          ['workflows', i, 'steps', k],
          ['workflows', j, 'steps', l],
          true,
          true,
          wa,
          wb,
          sa,
          String(sy!.stepId),
        );
      }
      ys.forEach((s, l) => {
        if (!claimed.has(l))
          emit(
            'structure',
            ev(
              baseline,
              a,
              ['workflows', i, 'steps'],
              undefined,
              false,
              wa,
              String(object(s).stepId),
            ),
            ev(candidate, b, ['workflows', j, 'steps', l], s, true, wb, String(object(s).stepId)),
          );
      });
      const matchedOrder = xs
        .map(
          (s) =>
            stepMatches.find((m) => m.before.stepId === object(s).stepId)?.after.stepId ??
            object(s).stepId,
        )
        .filter((s) => ys.some((y) => object(y).stepId === s));
      const newOrder = ys.map((s) => object(s).stepId).filter((s) => matchedOrder.includes(s));
      if (!equal(matchedOrder, newOrder))
        emit(
          'actions',
          ev(
            baseline,
            a,
            ['workflows', i, 'steps'],
            xs.map((s) => object(s).stepId),
            true,
            wa,
          ),
          ev(
            candidate,
            b,
            ['workflows', j, 'steps'],
            ys.map((s) => object(s).stepId),
            true,
            wb,
          ),
        );
    }
    next.forEach((w, j) => {
      if (!paired.has(j))
        emit(
          'structure',
          ev(baseline, a, ['workflows'], undefined, false, String(object(w).workflowId)),
          ev(candidate, b, ['workflows', j], w, true, String(object(w).workflowId)),
        );
    });
    for (const key of [...new Set([...Object.keys(a.raw), ...Object.keys(b.raw)])]
      .filter((k) => k !== 'workflows')
      .sort())
      diff(
        a.raw[key],
        b.raw[key],
        [key],
        [key],
        Object.hasOwn(a.raw, key),
        Object.hasOwn(b.raw, key),
      );
  }
  return differences;
}
