import type { PlainObject } from './types';
import { clone } from './snapshot';

// Both native restoration and generic inspection preserve every own occurrence field.
export function reusableOccurrenceFields(occurrence: PlainObject): PlainObject {
  const { reference: _reference, ...fields } = occurrence;
  return clone(fields);
}
