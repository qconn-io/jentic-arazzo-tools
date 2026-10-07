import { decodePointer, encodePointer, resolvePointer } from './pointer';
import type { SourceRegistry, SourceValidityToken } from '../source/SourceRegistry';
import type {
  ContractDocumentFacts,
  ContractOperation,
  ContractDeclarationIdentity,
} from './types';
import {
  createReferenceProjector,
  indexOperations,
  object,
  parseContract,
  string,
} from './references';

// AsyncAPI 3 Multi Format Schema Objects; other formats remain authored data.
function supportsSchemaFormat(format: string): boolean {
  const normalized = format.replace(/\s+/g, '').toLowerCase();
  return (
    /^application\/vnd\.aai\.asyncapi(?:\+(?:json|yaml))?;version=3\.0\.\d+$/.test(normalized) ||
    /^application\/schema\+(?:json|yaml);version=draft-0[467]$/.test(normalized) ||
    /^application\/vnd\.oai\.openapi(?:\+(?:json|yaml))?;version=3\.[01]\.\d+$/.test(normalized)
  );
}

export async function projectAsyncAPI(
  content: string | object,
  uri: string,
  registry: SourceRegistry,
  revision?: string,
  acquisitionValidity?: SourceValidityToken,
): Promise<ContractDocumentFacts> {
  const validity = acquisitionValidity ?? registry.captureValidity(uri, revision);
  const ensureCurrent = () => {
    if (!registry.isCurrent(validity)) throw new Error('Obsolete contract projection');
  };
  const api = await parseContract(content);
  const version = string(api.asyncapi) ?? '';
  const facts: ContractDocumentFacts = {
    version,
    dialect: 'asyncapi',
    uri,
    revision,
    operations: new Map(),
    rawContent: content,
    unsupportedDiagnostics: [],
  };
  if (!/^3\.0\.\d+$/.test(version)) {
    facts.dialect = 'unsupported';
    facts.unsupportedDiagnostics.push(`Unsupported AsyncAPI version: ${version || 'missing'}`);
    return facts;
  }
  const makeProjector = () =>
    createReferenceProjector(
      api,
      uri,
      registry,
      facts.unsupportedDiagnostics,
      false,
      supportsSchemaFormat,
      { revision, eventSchemas: true, ensureCurrent, validity },
    );
  ensureCurrent();
  const operations: ContractOperation[] = [];
  for (const [operationId, authored] of Object.entries(object(api.operations))) {
    const { project, follow, schemaReferences } = makeProjector();
    const followed = await follow(authored);
    const authoredOperation = object(followed.value);
    const rawOperation = object(
      await project(
        followed.value,
        followed.base,
        followed.depth,
        followed.links,
        0,
        false,
        followed.pointer ? decodePointer(followed.pointer) : ['operations', operationId],
      ),
    );
    const identify = async (
      value: Parameters<typeof follow>[0],
      occurrence: string,
      base = followed.base,
      depth = followed.depth,
      links = followed.links,
      declarationRevision = followed.revision,
    ): Promise<ContractDeclarationIdentity> => {
      const resolved = await follow(value, base, depth, links, occurrence, declarationRevision);
      return {
        uri: resolved.base,
        pointer: resolved.pointer ?? occurrence,
        revision: resolved.revision,
        declaringURI: base,
        occurrence,
        authoredReference: string(object(value).$ref),
        status: resolved.status,
      };
    };
    const operationPath = followed.pointer ?? encodePointer(['operations', operationId]);
    const channelIdentity = await identify(authoredOperation.channel, `${operationPath}/channel`);
    const followedChannel = await follow(
      authoredOperation.channel,
      followed.base,
      followed.depth,
      followed.links,
      `${operationPath}/channel`,
      followed.revision,
    );
    const messageIdentities: ContractDeclarationIdentity[] = [];
    if (Array.isArray(authoredOperation.messages)) {
      for (const [index, value] of authoredOperation.messages.entries())
        messageIdentities.push(await identify(value, `${operationPath}/messages/${index}`));
    } else {
      for (const [name, value] of Object.entries(object(object(followedChannel.value).messages)))
        messageIdentities.push(
          await identify(
            value,
            `${followedChannel.pointer}/messages/${encodePointer([name]).slice(2)}`,
            followedChannel.base,
            followedChannel.depth,
            followedChannel.links,
            followedChannel.revision,
          ),
        );
    }
    const authoredChannelRef = string(object(authoredOperation.channel).$ref);
    const channelRef =
      authoredChannelRef && followed.base !== uri
        ? new URL(authoredChannelRef, followed.base).href
        : authoredChannelRef;
    let channelName = channelRef;
    if (channelRef?.startsWith('#/channels/')) {
      try {
        channelName = resolvePointer(channelRef, followed.base).tokens.slice(1).join('/');
      } catch {
        /* Reference projection already retained and diagnosed the malformed pointer. */
      }
    }
    const channel = object(rawOperation.channel);
    const action = string(rawOperation.action);
    if (action !== 'send' && action !== 'receive')
      facts.unsupportedDiagnostics.push(
        `Operation ${operationId} has no supported send/receive direction`,
      );
    const messages = Array.isArray(rawOperation.messages)
      ? rawOperation.messages
      : Object.values(object(channel.messages));
    operations.push({
      schemaReferences,
      channelIdentity,
      messageIdentities,
      operationId,
      pointer: encodePointer(['operations', operationId]),
      summary: string(rawOperation.summary),
      action: action === 'send' || action === 'receive' ? action : undefined,
      channel: channelName,
      channelPointer: channelRef,
      address: channel.address,
      messages,
      parameters: [],
      servers: channel.servers ?? api.servers,
      security: rawOperation.security,
    });
  }
  ensureCurrent();
  facts.operations = indexOperations(operations);
  return facts;
}
