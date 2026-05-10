import { existsSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const checkedExtensions = /\.(ts|tsx|vue|svelte|json|html|css|less)$/;
const ignoredSegments = new Set(['.git', 'node_modules', 'dist']);

function collectFiles(dir: string): string[] {
  const entries = require('node:fs').readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    if (ignoredSegments.has(entry.name)) {
      continue;
    }
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectFiles(path));
    } else if (checkedExtensions.test(entry.name)) {
      files.push(path);
    }
  }
  return files;
}

describe('package source layout', () => {
  it('does not keep the legacy root src directory', () => {
    expect(existsSync(join(root, 'src'))).toBe(false);
  });

  it('does not import implementation files from the legacy src path', () => {
    const offenders = collectFiles(root)
      .filter((file) => !relative(root, file).startsWith('docs/'))
      .filter((file) => relative(root, file) !== 'tests/structure/package-layout.spec.ts')
      .filter((file) => {
        const source = readFileSync(file, 'utf8');
        return /(?:^|["'\s])\/src\//.test(source) || /\.\.\/\.\.\/(?:\.\.\/)*src\//.test(source);
      });

    expect(offenders.map((file) => relative(root, file))).toEqual([]);
  });
});
