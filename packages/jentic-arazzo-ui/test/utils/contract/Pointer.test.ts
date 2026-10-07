import { describe, expect, it } from 'vitest';

import {
  decodePointer,
  encodePointer,
  readPointer,
  resolvePointer,
} from '../../../src/utils/contract/pointer';

describe('JSON Pointer fragments', () => {
  it('decodes once before splitting tokens and preserves literal percent sequences', () => {
    expect(decodePointer('#%2Fitems%2F0')).toEqual(['items', '0']);
    expect(decodePointer('#/a%2520b')).toEqual(['a%20b']);
    expect(decodePointer('#/~01')).toEqual(['~1']);
    const names = ['a/b', 'a~b', 'a%20b', 'é雪', 'a#b', 'a b', ''];
    expect(decodePointer(encodePointer(names))).toEqual(names);
    expect(resolvePointer('../api#/x', 'https://test/dir/root')).toEqual({
      uri: 'https://test/api',
      tokens: ['x'],
      pointer: '#/x',
    });
  });
  it('reads own properties and valid array indices only', () => {
    const value = { items: ['first', 'second'] };
    expect(readPointer(value, ['items', '0'])).toBe('first');
    for (const key of ['01', '-1', '+1', '1e0', '-', 'length', 'constructor'])
      expect(readPointer(value, ['items', key])).toBeUndefined();
    expect(readPointer(value, ['toString'])).toBeUndefined();
    expect(readPointer({ '': false }, [''])).toBe(false);
  });
});
