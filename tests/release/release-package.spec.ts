import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

const publishedPackages = {
  styles: {
    dir: 'packages/styles',
    name: '@algoux/standard-ranklist-renderer-component-styles',
    readme: 'README.md',
    entryFiles: ['dist/index.js', 'dist/index.browser.js', 'dist/index.cjs', 'dist/index.d.ts', 'dist/style.css'],
    packFiles: ['README.md', 'package.json', 'dist/index.js', 'dist/index.browser.js', 'dist/index.cjs', 'dist/index.d.ts', 'dist/style.css'],
  },
  core: {
    dir: 'packages/core',
    name: '@algoux/standard-ranklist-renderer-component-core',
    readme: 'README.md',
    entryFiles: ['dist/index.js', 'dist/index.cjs', 'dist/index.d.ts'],
    packFiles: ['README.md', 'package.json', 'dist/index.js', 'dist/index.cjs', 'dist/index.d.ts'],
    importFile: 'dist/index.js',
  },
  react: {
    dir: 'packages/react',
    name: '@algoux/standard-ranklist-renderer-component-react',
    readme: 'README.md',
    entryFiles: ['dist/index.js', 'dist/index.cjs', 'dist/index.d.ts'],
    packFiles: ['README.md', 'package.json', 'dist/index.js', 'dist/index.cjs', 'dist/index.d.ts'],
    importFile: 'dist/index.js',
  },
  vue: {
    dir: 'packages/vue',
    name: '@algoux/standard-ranklist-renderer-component-vue',
    readme: 'README.md',
    entryFiles: ['dist/index.js', 'dist/index.cjs', 'dist/index.d.ts', 'dist/types.d.ts'],
    packFiles: ['README.md', 'package.json', 'dist/index.js', 'dist/index.cjs', 'dist/index.d.ts', 'dist/types.d.ts'],
    importFile: 'dist/index.js',
  },
  solid: {
    dir: 'packages/solid',
    name: '@algoux/standard-ranklist-renderer-component-solid',
    readme: 'README.md',
    entryFiles: ['dist/index.js', 'dist/index.cjs', 'dist/index.d.ts', 'dist/index.server.es.js'],
    packFiles: ['README.md', 'package.json', 'dist/index.js', 'dist/index.cjs', 'dist/index.d.ts', 'dist/index.server.es.js'],
    importFile: 'dist/index.server.es.js',
  },
  svelte: {
    dir: 'packages/svelte',
    name: '@algoux/standard-ranklist-renderer-component-svelte',
    readme: 'README.md',
    entryFiles: [
      'dist/index.js',
      'dist/index.cjs',
      'dist/index.d.ts',
      'dist/types.d.ts',
      'dist/DefaultSolutionModal.svelte.d.ts',
      'dist/DefaultUserModal.svelte.d.ts',
      'dist/Modal.svelte.d.ts',
      'dist/ProgressBar.svelte.d.ts',
      'dist/Ranklist.svelte.d.ts',
    ],
    packFiles: [
      'README.md',
      'package.json',
      'dist/index.js',
      'dist/index.cjs',
      'dist/index.d.ts',
      'dist/types.d.ts',
      'dist/DefaultSolutionModal.svelte.d.ts',
      'dist/DefaultUserModal.svelte.d.ts',
      'dist/Modal.svelte.d.ts',
      'dist/ProgressBar.svelte.d.ts',
      'dist/Ranklist.svelte.d.ts',
    ],
    importFile: 'dist/index.js',
  },
  angular: {
    dir: 'packages/angular',
    name: '@algoux/standard-ranklist-renderer-component-angular',
    readme: 'README.md',
    entryFiles: ['dist/fesm2022/algoux-standard-ranklist-renderer-component-angular.mjs', 'dist/index.d.ts'],
    packFiles: ['README.md', 'package.json', 'dist/fesm2022/algoux-standard-ranklist-renderer-component-angular.mjs', 'dist/index.d.ts'],
  },
} as const;

const nodeImportPackages = ['core', 'react', 'vue', 'solid', 'svelte'] as const;

function readJson(path: string) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function collectExportTargets(value: unknown): string[] {
  if (typeof value === 'string') {
    return [value];
  }

  if (!value || typeof value !== 'object') {
    return [];
  }

  return Object.values(value).flatMap((entry) => collectExportTargets(entry));
}

function readPackFiles(packageRoot: string): string[] {
  const cacheDir = mkdtempSync(join(tmpdir(), 'srk-npm-pack-cache-'));

  try {
    const output = execFileSync('npm', ['pack', '--dry-run', '--json'], {
      cwd: packageRoot,
      encoding: 'utf8',
      env: {
        ...process.env,
        npm_config_cache: cacheDir,
      },
    });
    const parsed = JSON.parse(output) as Array<{ files?: Array<{ path: string }> }>;
    const fileEntries = parsed[0]?.files || [];

    return fileEntries.map((entry) => entry.path).sort();
  } finally {
    rmSync(cacheDir, { recursive: true, force: true });
  }
}

function declarationTargetExists(declarationPath: string, specifier: string): boolean {
  const target = join(dirname(declarationPath), specifier);
  return [
    target,
    `${target}.d.ts`,
  ].some((candidate) => existsSync(candidate));
}

describe('package publish contracts', () => {
  it('uses package-local dist artifacts and README files for every published package', () => {
    for (const publishedPackage of Object.values(publishedPackages)) {
      const packageRoot = join(root, publishedPackage.dir);
      const packageJsonPath = join(packageRoot, 'package.json');
      expect(existsSync(packageJsonPath)).toBe(true);

      const pkg = readJson(packageJsonPath);
      expect(pkg.name).toBe(publishedPackage.name);
      expect(pkg.license).toBe('MIT');
      expect(pkg.repository).toMatchObject({
        type: 'git',
        url: 'https://github.com/algoux/standard-ranklist-renderer-component',
      });
      expect(pkg.private).not.toBe(true);
      expect(pkg.files).toContain('dist');
      expect(existsSync(join(packageRoot, publishedPackage.readme))).toBe(true);

      if (pkg.main) {
        expect(existsSync(join(packageRoot, pkg.main.replace(/^\.\//, '')))).toBe(true);
      }
      if (pkg.module) {
        expect(existsSync(join(packageRoot, pkg.module.replace(/^\.\//, '')))).toBe(true);
      }
      if (pkg.types) {
        expect(existsSync(join(packageRoot, pkg.types.replace(/^\.\//, '')))).toBe(true);
      }
      if (pkg.exports) {
        for (const target of collectExportTargets(pkg.exports)) {
          if (target.endsWith('package.json')) {
            continue;
          }
          expect(existsSync(join(packageRoot, target.replace(/^\.\//, '')))).toBe(true);
        }
      }

      for (const file of publishedPackage.entryFiles) {
        expect(existsSync(join(packageRoot, file))).toBe(true);
      }
    }
  });

  it('keeps release declarations pointed at publishable package names instead of source files', () => {
    const declarationFiles = [
      join(root, 'packages/react/dist/index.d.ts'),
      join(root, 'packages/vue/dist/index.d.ts'),
      join(root, 'packages/solid/dist/index.d.ts'),
      join(root, 'packages/svelte/dist/index.d.ts'),
      join(root, 'packages/core/dist/index.d.ts'),
    ];

    for (const file of declarationFiles) {
      const source = readFileSync(file, 'utf8');
      expect(source).not.toMatch(/(?:^|["'])\.?\.?\/src\//m);
      expect(source).not.toContain('workspace:');
    }
  });

  it('keeps the styles browser entry wired to the published stylesheet', () => {
    const browserEntry = readFileSync(join(root, 'packages/styles/dist/index.browser.js'), 'utf8');

    expect(browserEntry).toContain("import './style.css';");
  });

  it('preserves the audited Vue public type exports in the package declarations', () => {
    const vueIndex = readFileSync(join(root, 'packages/vue/dist/index.d.ts'), 'utf8');
    const vueTypes = readFileSync(join(root, 'packages/vue/dist/types.d.ts'), 'utf8');

    expect(vueIndex).toContain('DefaultSolutionModalProps');
    expect(vueIndex).toContain('DefaultUserModalProps');
    expect(vueIndex).toContain('ModalCloseReason');
    expect(vueIndex).toContain('ModalEvents');
    expect(vueIndex).toContain('ModalProps');
    expect(vueIndex).toContain('ProgressBarEvents');
    expect(vueIndex).toContain('ProgressBarProps');
    expect(vueIndex).toContain('RanklistEvents');
    expect(vueIndex).toContain('StatusCellSlotProps');
    expect(vueIndex).toContain('UserCellSlotProps');
    expect(vueTypes).toContain('export interface DefaultSolutionModalProps');
    expect(vueTypes).toContain('export interface DefaultUserModalProps');
    expect(vueTypes).toContain('export interface ModalProps');
    expect(vueTypes).toContain('export interface ProgressBarProps');
    expect(vueTypes).toContain('export interface StatusCellSlotProps');
    expect(vueTypes).toContain('export interface UserCellSlotProps');
  });

  it('preserves the audited Solid public payload type exports in the package declarations', () => {
    const solidIndex = readFileSync(join(root, 'packages/solid/dist/index.d.ts'), 'utf8');

    expect(solidIndex).toContain('SolutionClickPayload');
    expect(solidIndex).toContain('StaticRanklist');
    expect(solidIndex).toContain('StaticRanklistRow');
    expect(solidIndex).toContain('UserClickPayload');
  });

  it('keeps the Angular source package exports aligned with APF dist entrypoints', () => {
    const angularRoot = join(root, 'packages/angular');
    const pkg = readJson(join(angularRoot, 'package.json'));

    expect(pkg.exports).toMatchObject({
      './package.json': {
        default: './package.json',
      },
      '.': {
        types: './dist/index.d.ts',
        esm2022: './dist/esm2022/algoux-standard-ranklist-renderer-component-angular.mjs',
        esm: './dist/esm2022/algoux-standard-ranklist-renderer-component-angular.mjs',
        default: './dist/fesm2022/algoux-standard-ranklist-renderer-component-angular.mjs',
      },
    });

    for (const target of collectExportTargets(pkg.exports)) {
      if (target.endsWith('package.json')) {
        continue;
      }
      expect(existsSync(join(angularRoot, target.replace(/^\.\//, '')))).toBe(true);
    }
  });

  it('builds the Angular package without ng-packagr export conflict warnings', () => {
    const output = execFileSync('pnpm', ['--filter', publishedPackages.angular.name, 'build'], {
      cwd: root,
      encoding: 'utf8',
      env: process.env,
    });

    expect(output).not.toContain('conflicting export condition');
  });

  it('keeps Svelte declaration re-exports pointed at published declaration files', () => {
    const declarationPath = join(root, 'packages/svelte/dist/index.d.ts');
    const svelteIndex = readFileSync(declarationPath, 'utf8');
    const relativeExports = [...svelteIndex.matchAll(/from ['"](\.[^'"]+)['"]/g)].map((match) => match[1]);

    expect(relativeExports).toContain('./Ranklist.svelte');
    for (const specifier of relativeExports) {
      expect(declarationTargetExists(declarationPath, specifier), `Missing declaration target for ${specifier}`).toBe(true);
    }
  });

  it('can import the published JavaScript entrypoints in Node', async () => {
    for (const packageKey of nodeImportPackages) {
      const mod = await import(pathToFileURL(join(root, publishedPackages[packageKey].dir, publishedPackages[packageKey].importFile)).href);
      expect(Object.keys(mod).length).toBeGreaterThan(0);
    }
  });

  it('packs the expected publishable files for every package', () => {
    for (const publishedPackage of Object.values(publishedPackages)) {
      const packageRoot = join(root, publishedPackage.dir);
      const packedFiles = readPackFiles(packageRoot);

      for (const expectedFile of publishedPackage.packFiles) {
        expect(packedFiles, `${publishedPackage.name} should pack ${expectedFile}`).toContain(expectedFile);
      }
    }
  });
});
