import type {
  ActionChannel,
  ActionFact,
  DocumentSnapshot,
  InspectionDiagnostic,
  InspectionProfile,
  InspectionResult,
  OccurrencePath,
  Owner,
  ParameterFact,
  PlainObject,
  PrerequisiteFact,
  Provenance,
  SourceBinding,
  StepFact,
  TargetContext,
  WorkflowFact,
} from './types';
import { clone } from './snapshot';
import { parseReusableReference } from './inventory';
import { targetClassifier } from './targets';

const array = (value: any): any[] => (Array.isArray(value) ? value : []);
const object = (value: any): PlainObject =>
  value && typeof value === 'object' && !Array.isArray(value) ? value : {};
const at = (value: any, path: OccurrencePath): any =>
  path.reduce((current, key) => current?.[key], value);

export function extractFacts(
  snapshot: DocumentSnapshot,
  profile?: InspectionProfile,
): InspectionResult {
  const document = snapshot.document;
  const authored = snapshot.authoredDocument;
  const classifyTarget = profile
    ? targetClassifier(document)
    : (reference: string, context: TargetContext) => ({
        reference,
        role: context.role,
        kind: 'malformed' as const,
        navigable: false,
        reason: 'unsupported specification version',
      });
  const diagnostics: InspectionDiagnostic[] = clone(snapshot.diagnostics ?? []);
  const warn = (
    provenance: Provenance,
    category: InspectionDiagnostic['category'],
    code: string,
    message: string,
  ): InspectionDiagnostic => {
    const diagnostic: InspectionDiagnostic = {
      ...provenance,
      phase: 'inspection',
      category,
      severity: 'warning',
      code,
      message,
      originalReference: provenance.reference,
    };
    diagnostics.push(diagnostic);
    return diagnostic;
  };
  const supports = (feature: string) => profile?.supports(feature) ?? false;
  const reusable = (
    value: PlainObject,
    path: OccurrencePath,
    owner: Owner,
    expectedBucket: string,
    seen = new Set<string>(),
  ): {
    value: PlainObject;
    declarationPath?: OccurrencePath;
    diagnostics: InspectionDiagnostic[];
    unresolved: boolean;
  } => {
    if (typeof value.reference !== 'string')
      return { value: clone(value), diagnostics: [], unresolved: false };
    const reference = value.reference;
    const parsed = parseReusableReference(reference);
    const declarationPath = parsed ? ['components', parsed.bucket, parsed.key] : undefined;
    const definition =
      parsed && parsed.bucket === expectedBucket ? at(authored, declarationPath!) : undefined;
    const provenance = { ...owner, path, declarationPath, reference };
    if (!parsed || parsed.bucket !== expectedBucket) {
      return {
        value: clone(value),
        declarationPath,
        diagnostics: [
          warn(
            provenance,
            'malformed-target',
            'malformed-reusable',
            'reusable expression does not identify the expected component collection',
          ),
        ],
        unresolved: true,
      };
    }
    if (!definition || seen.has(reference)) {
      return {
        value: clone(value),
        declarationPath,
        diagnostics: [
          warn(
            provenance,
            'missing-reference',
            'missing-reusable',
            `reusable component ${reference} is unavailable`,
          ),
        ],
        unresolved: true,
      };
    }
    const nested = reusable(
      object(definition),
      path,
      owner,
      expectedBucket,
      new Set([...seen, reference]),
    );
    const resolved = { ...clone(nested.value) };
    if (Object.hasOwn(value, 'value')) resolved.value = clone(value.value);
    return { ...nested, value: resolved, declarationPath };
  };
  const parameters = (
    values: any,
    originals: any,
    path: OccurrencePath,
    owner: Owner,
    declarationPath?: OccurrencePath,
  ): ParameterFact[] =>
    array(values).map((value, index) => {
      const original = object(array(originals)[index] ?? value);
      const occurrencePath = [...path, index];
      const resolved = reusable(
        original.reference ? original : object(value),
        occurrencePath,
        owner,
        'parameters',
      );
      const parameterDeclaration = declarationPath
        ? [...declarationPath, index]
        : resolved.declarationPath;
      for (const diagnostic of resolved.diagnostics)
        if (parameterDeclaration) diagnostic.declarationPath = parameterDeclaration;
      if (resolved.value.in === 'querystring' && !supports('querystring'))
        resolved.diagnostics.push(
          warn(
            {
              ...owner,
              path: occurrencePath,
              declarationPath: parameterDeclaration,
              reference: original.reference,
            },
            'unsupported-feature',
            'unsupported-querystring',
            'querystring parameter location requires selected Arazzo 1.1 inspection',
          ),
        );
      return {
        ...owner,
        path: occurrencePath,
        declarationPath: parameterDeclaration,
        reference: original.reference,
        authored: clone(original),
        value: resolved.value,
        status: resolved.unresolved ? 'unresolved' : 'resolved',
        diagnostics: resolved.diagnostics,
      };
    });
  const actions = (
    values: any,
    originals: any,
    path: OccurrencePath,
    owner: Owner,
    channel: ActionChannel,
    origin: 'workflow' | 'step',
  ): ActionFact[] =>
    array(values).map((value, index) => {
      const original = object(array(originals)[index] ?? value);
      const occurrencePath = [...path, index];
      const bucket = channel === 'onSuccess' ? 'successActions' : 'failureActions';
      const resolved = reusable(
        original.reference ? original : object(value),
        occurrencePath,
        owner,
        bucket,
      );
      const action = resolved.value;
      const provenance = {
        ...owner,
        path: occurrencePath,
        declarationPath: resolved.declarationPath,
        reference: original.reference,
      };
      const actionDiagnostics = [...resolved.diagnostics];
      const known = channel === 'onFailure' ? ['end', 'goto', 'retry'] : ['end', 'goto'];
      let status: ActionFact['status'] = resolved.unresolved
        ? 'unresolved'
        : known.includes(action.type)
          ? 'resolved'
          : 'unsupported';
      if (status === 'unsupported')
        actionDiagnostics.push(
          warn(
            provenance,
            'unsupported-feature',
            'unsupported-action',
            `action type ${String(action.type)} has no understood transition semantics`,
          ),
        );
      let parameterFacts: ParameterFact[] = [];
      if (Object.hasOwn(action, 'parameters')) {
        if (supports('actionParameters')) {
          parameterFacts = parameters(
            action.parameters,
            action.parameters,
            [...occurrencePath, 'parameters'],
            owner,
            resolved.declarationPath ? [...resolved.declarationPath, 'parameters'] : undefined,
          );
          action.parameters = parameterFacts.map((parameter) => clone(parameter.value));
          actionDiagnostics.push(...parameterFacts.flatMap((parameter) => parameter.diagnostics));
        } else
          actionDiagnostics.push(
            warn(
              provenance,
              'unsupported-feature',
              'unsupported-action-parameters',
              'action parameters require the selected Arazzo 1.1 inspection profile',
            ),
          );
      }
      let target;
      if (status === 'resolved' && action.type !== 'end') {
        if (action.workflowId !== undefined && action.stepId !== undefined) {
          target = {
            kind: 'ambiguous' as const,
            reference: String(action.workflowId),
            role: 'action' as const,
            navigable: false,
            reason: 'action has both workflow and step locators',
          };
        } else if (typeof action.workflowId === 'string')
          target = classifyTarget(action.workflowId, {
            ...owner,
            role: 'action',
            targetType: 'workflow',
            path: occurrencePath,
          });
        else if (typeof action.stepId === 'string')
          target = classifyTarget(
            action.stepId.startsWith('$')
              ? action.stepId
              : `$workflows.${owner.workflowId}.steps.${action.stepId}`,
            { ...owner, role: 'action', targetType: 'step', path: occurrencePath },
          );
        else if (action.type === 'retry') {
          if (owner.stepId)
            target = classifyTarget(`$workflows.${owner.workflowId}.steps.${owner.stepId}`, {
              ...owner,
              role: 'action',
              path: occurrencePath,
            });
        } else {
          status = 'unsupported';
          actionDiagnostics.push(
            warn(
              provenance,
              'malformed-target',
              'absent-action-target',
              'transition action has no understood destination',
            ),
          );
        }
        if (target && ['ambiguous', 'malformed'].includes(target.kind)) status = 'unsupported';
        if (target && !target.navigable && !target.kind.startsWith('external'))
          actionDiagnostics.push(
            warn(
              { ...provenance, reference: target.reference },
              target.kind === 'missing'
                ? 'missing-reference'
                : target.kind === 'ambiguous'
                  ? 'ambiguous-binding'
                  : 'malformed-target',
              'action-target',
              target.reason ?? 'action target is unavailable',
            ),
          );
      }
      // declaration diagnostics are also visible at every transcluded use site.
      for (const diagnostic of snapshot.diagnostics ?? []) {
        if (
          resolved.declarationPath &&
          diagnostic.path
            .slice(0, resolved.declarationPath.length)
            .every((part, i) => part === resolved.declarationPath![i])
        ) {
          const projected = {
            ...clone(diagnostic),
            ...owner,
            path: [...occurrencePath, ...diagnostic.path.slice(resolved.declarationPath.length)],
            declarationPath: diagnostic.declarationPath ?? diagnostic.path,
          };
          diagnostics.push(projected);
          actionDiagnostics.push(projected);
        }
      }
      return {
        ...provenance,
        channel,
        origin,
        authoredIndex: index,
        status,
        authored: clone(original),
        value: action,
        parameters: parameterFacts,
        target,
        diagnostics: actionDiagnostics,
      };
    });
  const prerequisites = (
    values: any,
    path: OccurrencePath,
    owner: Owner,
    role: 'workflow-prerequisite' | 'step-prerequisite',
  ): PrerequisiteFact[] =>
    array(values).map((reference, index) => {
      const provenance = { ...owner, path: [...path, index], reference };
      const target = classifyTarget(reference, { ...owner, role, path: provenance.path });
      if (!target.navigable && !target.kind.startsWith('external'))
        warn(
          provenance,
          target.kind === 'missing' ? 'missing-reference' : 'malformed-target',
          'prerequisite-target',
          target.reason ?? 'prerequisite target is unavailable',
        );
      return { ...provenance, authoredIndex: index, target };
    });
  const sourceBinding = (step: PlainObject, path: OccurrencePath, owner: Owner): SourceBinding => {
    const locators: PlainObject = {};
    for (const field of ['operationId', 'operationPath', 'workflowId', 'channelPath'])
      if (Object.hasOwn(step, field)) locators[field] = clone(step[field]);
    const sources = array(document.sourceDescriptions);
    const candidates = new Map<string, PlainObject>();
    const explicitNames = new Set<string>();
    for (const locator of Object.values(locators)) {
      if (typeof locator !== 'string') continue;
      const braced = /^\{\$sourceDescriptions\.(.+)\.url\}/.exec(locator);
      const matches = sources.filter((source) =>
        braced
          ? braced[1] === source.name
          : locator.startsWith(`$sourceDescriptions.${source.name}.`),
      );
      matches.forEach((source) => {
        candidates.set(source.name, source);
        explicitNames.add(source.name);
      });
    }
    if (!explicitNames.size && Object.keys(locators).length) {
      const types =
        step.channelPath !== undefined
          ? ['asyncapi']
          : step.workflowId !== undefined
            ? ['arazzo']
            : ['openapi', 'asyncapi'];
      sources
        .filter((source) => types.includes(source.type))
        .forEach((source) => candidates.set(source.name, source));
    }
    const conflicting = Object.keys(locators).length > 1;
    const source =
      candidates.size === 1 && explicitNames.size === 1 && !conflicting
        ? [...candidates.values()][0]
        : undefined;
    const status =
      conflicting || candidates.size > 1
        ? 'ambiguous'
        : source
          ? ['openapi', 'asyncapi', 'arazzo'].includes(source.type)
            ? 'declared'
            : 'unsupported'
          : 'unverified';
    if (status === 'ambiguous')
      warn(
        { ...owner, path },
        'ambiguous-binding',
        'ambiguous-source',
        'source ownership or authored locators are ambiguous; all locators remain available',
      );
    if (
      supports('asyncIntent') &&
      Object.hasOwn(step, 'action') &&
      !['send', 'receive'].includes(step.action)
    )
      warn(
        { ...owner, path: [...path, 'action'] },
        'unsupported-feature',
        'unsupported-async-intent',
        'async action intent is not a recognized send or receive declaration',
      );
    if (status === 'unsupported')
      warn(
        { ...owner, path },
        'unsupported-feature',
        'unsupported-source-kind',
        `source kind ${String(source?.type)} is not understood`,
      );
    return {
      ...owner,
      path,
      status,
      verification: 'unverified',
      sourceName: source?.name,
      sourceType: source?.type,
      source: source ? clone(source) : undefined,
      candidates: [...candidates.keys()],
      locators,
      ...(supports('asyncIntent')
        ? {
            intent: ['send', 'receive'].includes(step.action) ? step.action : undefined,
            timeout: clone(step.timeout),
            correlationId: clone(step.correlationId),
          }
        : {}),
    };
  };
  const workflows: WorkflowFact[] = [];
  if (!profile)
    warn(
      { path: ['arazzo'] },
      'unsupported-version',
      'unsupported-version',
      `Arazzo ${snapshot.exactVersion || '(undeclared)'} has no semantic inspection profile; authored content remains available`,
    );
  else {
    array(document.sourceDescriptions).forEach((source, index) => {
      if (source.type === 'asyncapi' && !supports('asyncIntent'))
        warn(
          { path: ['sourceDescriptions', index, 'type'] },
          'unsupported-feature',
          'unsupported-asyncapi',
          'AsyncAPI source inspection requires selected Arazzo 1.1 features',
        );
      else if (
        source.type !== undefined &&
        !['openapi', 'arazzo', 'asyncapi'].includes(source.type)
      )
        warn(
          { path: ['sourceDescriptions', index, 'type'] },
          'unsupported-feature',
          'unsupported-source-kind',
          `source kind ${String(source.type)} is not understood`,
        );
    });
    array(document.workflows).forEach((workflow: PlainObject, wi: number) => {
      const workflowId = workflow.workflowId;
      const owner = { workflowId };
      const path = ['workflows', wi];
      const original = object(array(authored.workflows)[wi] ?? workflow);
      const workflowActions = {
        onSuccess: actions(
          workflow.successActions,
          original.successActions,
          [...path, 'successActions'],
          owner,
          'onSuccess',
          'workflow',
        ),
        onFailure: actions(
          workflow.failureActions,
          original.failureActions,
          [...path, 'failureActions'],
          owner,
          'onFailure',
          'workflow',
        ),
      };
      const steps: StepFact[] = array(workflow.steps).map((step: PlainObject, si: number) => {
        const stepOwner = { workflowId, stepId: step.stepId };
        const stepPath = [...path, 'steps', si];
        const originalStep = object(array(original.steps)[si] ?? step);
        for (const [field, feature] of [
          ['dependsOn', 'stepPrerequisites'],
          ['channelPath', 'asyncIntent'],
          ['action', 'asyncIntent'],
          ['timeout', 'asyncIntent'],
          ['correlationId', 'asyncIntent'],
        ] as const) {
          if (Object.hasOwn(step, field) && !supports(feature))
            warn(
              { ...stepOwner, path: [...stepPath, field] },
              'unsupported-feature',
              `unsupported-${field}`,
              `${field} is preserved as authored data but is not understood by this profile`,
            );
        }
        const stepActions = {
          onSuccess: actions(
            step.onSuccess,
            originalStep.onSuccess,
            [...stepPath, 'onSuccess'],
            stepOwner,
            'onSuccess',
            'step',
          ),
          onFailure: actions(
            step.onFailure,
            originalStep.onFailure,
            [...stepPath, 'onFailure'],
            stepOwner,
            'onFailure',
            'step',
          ),
        };
        const binding = sourceBinding(step, stepPath, stepOwner);
        const callTarget =
          typeof step.workflowId === 'string' && Object.keys(binding.locators).length === 1
            ? classifyTarget(step.workflowId, {
                ...stepOwner,
                role: 'call',
                path: [...stepPath, 'workflowId'],
              })
            : undefined;
        if (callTarget && !callTarget.navigable && !callTarget.kind.startsWith('external'))
          warn(
            { ...stepOwner, path: [...stepPath, 'workflowId'], reference: step.workflowId },
            callTarget.kind === 'missing' ? 'missing-reference' : 'malformed-target',
            'call-target',
            callTarget.reason ?? 'call target is unavailable',
          );
        return {
          ...stepOwner,
          path: stepPath,
          authoredIndex: si,
          authored: clone(originalStep),
          value: clone(step),
          actions: stepActions,
          parameters: parameters(
            step.parameters,
            originalStep.parameters,
            [...stepPath, 'parameters'],
            stepOwner,
          ),
          prerequisites: supports('stepPrerequisites')
            ? prerequisites(
                step.dependsOn,
                [...stepPath, 'dependsOn'],
                stepOwner,
                'step-prerequisite',
              )
            : [],
          sourceBinding: binding,
          callTarget,
          diagnostics: diagnostics.filter(
            (d) => d.workflowId === workflowId && d.stepId === step.stepId,
          ),
        };
      });
      workflows.push({
        ...owner,
        path,
        authoredIndex: wi,
        authored: clone(original),
        value: clone(workflow),
        actions: workflowActions,
        parameters: parameters(
          workflow.parameters,
          original.parameters,
          [...path, 'parameters'],
          owner,
        ),
        prerequisites: prerequisites(
          workflow.dependsOn,
          [...path, 'dependsOn'],
          owner,
          'workflow-prerequisite',
        ),
        steps,
        diagnostics: diagnostics.filter(
          (d) => d.workflowId === workflowId && d.stepId === undefined,
        ),
      });
    });
  }
  return {
    snapshot,
    documentId: snapshot.id,
    profileId: profile?.id,
    support: {
      profile: profile?.id,
      exactVersion: snapshot.exactVersion,
      representation: 'available',
      semanticInspection: !profile
        ? 'unsupported'
        : profile.id === '1.0'
          ? 'supported'
          : 'selected',
      referenceExpansion: 'limited',
      schemaValidation: 'not-established',
      execution: 'not-established',
      sourceVerification: 'unverified',
      limitations: [
        'Inspection does not establish schema validation or execution support.',
        'Source documents and their versions have not been fetched or verified.',
        ...(profile?.id === '1.1'
          ? ['Selected Arazzo 1.1 inspection; full 1.1 conformance is not established.']
          : []),
      ],
    },
    workflows,
    workflowsById: new Map(workflows.map((workflow) => [workflow.workflowId, workflow])),
    stepsByWorkflow: new Map(
      workflows.map((workflow) => [
        workflow.workflowId,
        new Map(workflow.steps.map((step) => [step.stepId, step])),
      ]),
    ),
    diagnostics,
    raw: clone(document),
    classifyTarget,
  };
}
