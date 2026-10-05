import { ObjectElement, ParseResultElement } from '@speclynx/apidom-datamodel';

import type { DocumentSnapshot, PlainObject, PlainDocument } from './types';

let revision = 0;
export function clone<T>(value: T): T {
  return structuredClone(value);
}

// synchronous supplied-document consumers do not parse again or dereference.
export function createSnapshot(
  document: PlainObject,
  metadata: Partial<
    Pick<DocumentSnapshot, 'id' | 'retrievalURI' | 'baseURI' | 'trustedInternalIds'>
  > = {},
): DocumentSnapshot {
  const authoredDocument = clone(document) as PlainDocument;
  const plain = clone(document) as PlainDocument;
  const wrap = (value: PlainObject) => {
    const element = new ObjectElement(value);
    element.classes.push('result');
    element.classes.push('api');
    return new ParseResultElement([element]);
  };
  return {
    ...metadata,
    id: metadata.id ?? `supplied-document-${++revision}`,
    authored: wrap(authoredDocument),
    restored: wrap(plain),
    authoredDocument,
    document: plain,
    exactVersion: typeof document.arazzo === 'string' ? document.arazzo : '',
    self: typeof document.$self === 'string' ? document.$self : undefined,
  };
}
