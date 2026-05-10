import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function read(...parts: string[]) {
  return readFileSync(join(root, ...parts), 'utf8');
}

function readMany(files: string[]) {
  return files.map((file) => read(...file.split('/'))).join('\n');
}

const devTargets = [
  {
    name: 'react',
    files: ['packages/react/dev/App.tsx'],
    styleFiles: ['packages/react/dev/index.css'],
    progress: /\bProgressBar\b/,
    userModal: /\bDefaultUserModal\b/,
    solutionModal: /\bDefaultSolutionModal\b/,
  },
  {
    name: 'vue',
    files: ['packages/vue/dev/App.vue'],
    styleFiles: ['packages/vue/dev/App.vue', 'packages/vue/dev/style.css'],
    progress: /\bProgressBar\b/,
    userModal: /\bDefaultUserModal\b/,
    solutionModal: /\bDefaultSolutionModal\b/,
  },
  {
    name: 'solid',
    files: ['packages/solid/dev/App.tsx'],
    styleFiles: ['packages/solid/dev/style.css'],
    progress: /\bProgressBar\b/,
    userModal: /\bDefaultUserModal\b/,
    solutionModal: /\bDefaultSolutionModal\b/,
  },
  {
    name: 'svelte',
    files: ['packages/svelte/dev/App.svelte'],
    styleFiles: ['packages/svelte/dev/App.svelte', 'packages/svelte/dev/style.css'],
    progress: /\bProgressBar\b/,
    userModal: /\bDefaultUserModal\b/,
    solutionModal: /\bDefaultSolutionModal\b/,
  },
  {
    name: 'angular',
    files: ['packages/angular/dev/app.component.ts'],
    styleFiles: ['packages/angular/dev/app.component.ts', 'packages/angular/dev/style.css'],
    progress: /srk-progress-bar|ProgressBarComponent/,
    userModal: /srk-default-user-modal|DefaultUserModalComponent/,
    solutionModal: /srk-default-solution-modal|DefaultSolutionModalComponent/,
  },
];

describe('framework dev previews', () => {
  it.each(devTargets)('$name preview shows progress and default modal interactions', (target) => {
    const source = readMany(target.files);

    expect(source).toMatch(target.progress);
    expect(source).toMatch(target.userModal);
    expect(source).toMatch(target.solutionModal);
  });

  it.each(devTargets)('$name preview forces a black page background in dark mode', (target) => {
    const source = readMany(target.styleFiles);

    expect(source).toMatch(/prefers-color-scheme:\s*dark/);
    expect(source).toMatch(/background(?:-color)?:\s*(?:#000\b|rgb\(0,\s*0,\s*0\))/);
  });

  it.each(devTargets)('$name preview derives its demo theme from prefers-color-scheme', (target) => {
    const source = readMany(target.files);

    expect(source).toMatch(/\bresolvePreferredTheme\b/);
    expect(source).toMatch(/matchMedia\(\s*['"`]\(prefers-color-scheme:\s*dark\)['"`]\s*\)/);
    expect(source).toMatch(/\b(?:Utils\.)?EnumTheme\.dark\b/);
    expect(source).toMatch(/\b(?:Utils\.)?EnumTheme\.light\b/);
    expect(source).toMatch(/\bpreferredTheme\b/);
  });

  it('angular preview imports from the package-local library entry', () => {
    expect(read('packages/angular/dev/app.component.ts')).toMatch(/from ['"]\.\.\/src\/lib\/index['"]/);
  });

  it('angular preview uses root bootstrap for interactive change detection', () => {
    const source = read('packages/angular/dev/main.ts');

    expect(source).toMatch(/\bbootstrapApplication\(AppComponent\)/);
    expect(source).not.toMatch(/\bcreateComponent\b/);
  });

  it('solid preview memoizes static ranklist conversion for responsive updates', () => {
    const source = read('packages/solid/dev/App.tsx');

    expect(source).toMatch(/import\s+{[^}]*createMemo[^}]*}\s+from ['"]solid-js['"]/s);
    expect(source).toMatch(/const\s+staticRanklist\s*=\s*createMemo/);
  });
});
