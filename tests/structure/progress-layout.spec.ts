import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('progress bar layout styles', () => {
  it('lays progress segments out without inline whitespace wrapping', () => {
    const source = readFileSync(join(process.cwd(), 'packages/styles/src/ProgressBar.less'), 'utf8');

    expect(source).toMatch(/\.srk-progress-bar-body\s*{[^{}]*display:\s*flex;/s);
    expect(source).toMatch(/\.srk-progress-bar-body\s*{[^{}]*width:\s*100%;/s);
  });
});
