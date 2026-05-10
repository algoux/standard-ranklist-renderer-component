import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('solid ranklist implementation', () => {
  it('uses CSS property names that Solid applies for problem header backgrounds', () => {
    const source = readFileSync(join(process.cwd(), 'packages/solid/src/Ranklist.tsx'), 'utf8');

    expect(source).toMatch(/'background-image':\s*getProblemHeaderBackgroundImage/);
    expect(source).not.toMatch(/backgroundImage:\s*getProblemHeaderBackgroundImage/);
  });
});
