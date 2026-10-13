/** JSON Pointer URI fragments, independent of contract parsers and acquisition. */
export function decodePointer(fragment: string): string[] {
  if (!fragment.startsWith('#')) throw new Error('JSON Pointer fragment is required');
  let pointer: string;
  try {
    pointer = decodeURIComponent(fragment.slice(1));
  } catch {
    throw new Error('Invalid JSON Pointer percent encoding');
  }
  if (pointer === '') return [];
  if (!pointer.startsWith('/')) throw new Error('Unsupported JSON Pointer fragment');
  return pointer
    .slice(1)
    .split('/')
    .map((token) => {
      if (/~(?:[^01]|$)/.test(token)) throw new Error('Invalid JSON Pointer escape');
      return token.replace(/~1/g, '/').replace(/~0/g, '~');
    });
}

export function encodePointer(tokens: readonly string[]): string {
  return tokens.length === 0
    ? '#'
    : `#/${tokens
        .map((token) => encodeURIComponent(token.replace(/~/g, '~0').replace(/\//g, '~1')))
        .join('/')}`;
}

export function resolvePointer(locator: string, base: string) {
  const url = new URL(locator, base);
  const tokens = decodePointer(url.hash || '#');
  url.hash = '';
  return { uri: url.href, tokens, pointer: encodePointer(tokens) };
}

export function pointerMatches(locator: string, pointer: string, base: string): boolean {
  const left = resolvePointer(locator, base);
  const right = resolvePointer(pointer, base);
  return left.uri === right.uri && left.pointer === right.pointer;
}

export function readPointer(root: unknown, tokens: readonly string[]): unknown {
  let value = root;
  for (const token of tokens) {
    if (value === null || typeof value !== 'object') return undefined;
    if (Array.isArray(value) && !/^(0|[1-9][0-9]*)$/.test(token)) return undefined;
    if (!Object.hasOwn(value, token)) return undefined;
    value = (value as Record<string, unknown>)[token];
  }
  return value;
}
