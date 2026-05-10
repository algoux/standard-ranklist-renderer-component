import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('svelte ranklist implementation', () => {
  it('keeps default clickable cells aligned with the other framework targets', () => {
    const source = readFileSync(join(process.cwd(), 'packages/svelte/src/Ranklist.svelte'), 'utf8');

    expect(source).not.toContain('srk-clickable-cell');
    expect(source).not.toContain('srk-cell-button');
    expect(source).not.toContain('srk-user-cell-button');
    expect(source).not.toContain('<button');
  });
});
