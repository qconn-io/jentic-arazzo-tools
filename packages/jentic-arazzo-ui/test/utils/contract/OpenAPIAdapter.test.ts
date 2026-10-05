import { describe, it, expect, vi, beforeEach } from 'vitest';
import { projectOpenAPI } from '../../../src/utils/contract/OpenAPIAdapter';
import { SourceRegistry } from '../../../src/utils/source/SourceRegistry';

describe('OpenAPIAdapter', () => {
  let registry: SourceRegistry;

  beforeEach(() => {
    registry = new SourceRegistry({
      maxConcurrent: 2,
      maxDocuments: 10,
      maxReferenceDepth: 2,
      maxSizeBytes: 1000,
    });
    vi.spyOn(registry, 'acquire').mockResolvedValue({
      uri: 'http://test/api.yaml',
      content: 'mock',
      format: 'text',
      sizeBytes: 4,
      version: undefined,
    });
  });

  it('extracts operations from OpenAPI 3 document', async () => {
    const content = `
openapi: 3.0.0
info:
  title: Test API
  version: 1.0.0
paths:
  /users:
    get:
      operationId: getUsers
      parameters:
        - name: limit
          in: query
          required: false
          schema:
            type: integer
    `;

    const facts = await projectOpenAPI(content, 'http://test/api.yaml', registry);

    expect(facts.dialect).toBe('openapi');
    expect(facts.version).toBe('3.0.0');
    expect(facts.operations.get('getUsers')).toBeDefined();
    const op = facts.operations.get('getUsers');
    expect(op?.method).toBe('GET');
    expect(op?.path).toBe('/users');
    expect(op?.parameters).toHaveLength(1);
    expect(op?.parameters[0].name).toBe('limit');
  });

  it('rejects OpenAPI 2.0 (Swagger)', async () => {
    const content = `
swagger: "2.0"
info:
  title: Test
  version: 1.0
paths: {}
    `;
    const facts = await projectOpenAPI(content, 'http://test/api.yaml', registry);

    expect(facts.dialect).toBe('unsupported');
    expect(facts.unsupportedDiagnostics).toContain('OpenAPI 2.0 (Swagger) is not fully supported');
  });

  it('gracefully degrades on malformed document', async () => {
    const content = `
openapi: 3.0.0
paths:
  /users:
    get:
      parameters:
        - name: limit
          # missing 'in' and schema
          required: "true"
    `;
    const facts = await projectOpenAPI(content, 'http://test/api.yaml', registry);
    expect(facts.dialect).toBe('openapi');
    // It should parse without throwing, just parameters might be empty or missing
  });

  it('does not make external network calls through default parser', async () => {
    const content = `
openapi: 3.0.0
info:
  title: Test
  version: 1.0
paths:
  /test:
    get:
      operationId: getTest
      parameters:
        - $ref: 'http://example.com/external.yaml#/components/parameters/Limit'
    `;

    // We mock acquire to throw to prove it goes through registry
    vi.spyOn(registry, 'acquire').mockRejectedValue(new Error('Network disabled'));

    try {
      await projectOpenAPI(content, 'http://test/api.yaml', registry);
    } catch (e: any) {
      // It should throw because we mocked acquire to reject.
    }
    
    expect(registry.acquire).toHaveBeenCalledWith('http://example.com/external.yaml', undefined, 'http://test/api.yaml');
  });
});
