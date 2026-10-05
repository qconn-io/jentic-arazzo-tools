// eslint-disable-next-line import/no-extraneous-dependencies
import * as yamlAdapter from '@speclynx/apidom-parser-adapter-yaml-1-2';
import {
  isObjectElement,
  isStringElement,
  Element,
} from '@speclynx/apidom-datamodel';

import { ContractDocumentFacts } from './types';
import { SourceRegistry } from '../source/SourceRegistry';

export async function projectAsyncAPI(
  content: string | object,
  uri: string,
  registry: SourceRegistry,
  revision?: string,
): Promise<ContractDocumentFacts> {
  const facts: ContractDocumentFacts = {
    version: '',
    dialect: 'asyncapi',
    uri,
    revision,
    operations: new Map(),
    rawContent: content,
    unsupportedDiagnostics: [],
  };

  let textContent = '';
  if (typeof content === 'string') {
    textContent = content;
  } else {
    textContent = JSON.stringify(content);
  }

  // Parse YAML/JSON using generic YAML adapter
  const parseResult = await yamlAdapter.parse(textContent, { sourceMap: true });

  const api = parseResult.result;
  if (!api || !isObjectElement(api)) {
    facts.dialect = 'unsupported';
    facts.unsupportedDiagnostics.push('No AsyncAPI object found');
    return facts;
  }

  const asyncapiElem = api.get('asyncapi');
  if (isStringElement(asyncapiElem)) {
    facts.version = String(asyncapiElem.toValue());
    if (!facts.version.startsWith('3.')) {
      facts.dialect = 'unsupported';
      facts.unsupportedDiagnostics.push(`Unsupported AsyncAPI version: ${facts.version}`);
      return facts;
    }
  } else {
    facts.dialect = 'unsupported';
    facts.unsupportedDiagnostics.push('Unknown or missing AsyncAPI version');
    return facts;
  }

  // Very basic local ref resolver for channels/messages
  const resolveLocalRef = (elem: Element | undefined): Element | undefined => {
    if (isObjectElement(elem)) {
      const ref = elem.get('$ref');
      if (isStringElement(ref)) {
        const refPath = String(ref.toValue());
        if (refPath.startsWith('#/')) {
          const parts = refPath.slice(2).split('/');
          let curr: any = api;
          for (const part of parts) {
            if (isObjectElement(curr)) curr = curr.get(part);
            else return undefined;
          }
          return curr;
        }
      }
    }
    return elem;
  };

  const operations = api.get('operations');
  if (isObjectElement(operations)) {
    operations.forEach((opItem: Element, opKey: Element) => {
      const opValue = resolveLocalRef(opItem);
      if (!isObjectElement(opValue)) return;

      const operationId = String(opKey.toValue());
      const actionElem = opValue.get('action');
      const action = isStringElement(actionElem) ? actionElem.toValue() : undefined;

      const channelElem = opValue.get('channel');
      let channelPath: string | undefined;
      if (isObjectElement(channelElem)) {
        const ref = channelElem.get('$ref');
        if (isStringElement(ref)) {
          const val = String(ref.toValue());
          if (val.startsWith('#/channels/')) {
            channelPath = val.slice('#/channels/'.length);
          }
        }
      }

      facts.operations.set(operationId, {
        operationId,
        action: action as 'send' | 'receive',
        channel: channelPath,
        parameters: [], // parameters from channel?
      });
    });
  }

  return facts;
}
