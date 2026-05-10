import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('angular ranklist implementation', () => {
  it('uses OnPush change detection for heavy ranklist rendering', () => {
    const source = readFileSync(join(process.cwd(), 'packages/angular/src/lib/ranklist/ranklist.component.ts'), 'utf8');

    expect(source).toMatch(/\bChangeDetectionStrategy\b/);
    expect(source).toMatch(/changeDetection:\s*ChangeDetectionStrategy\.OnPush/);
  });
});
