import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { buildReleaseNotification } from './build-release-notification.mjs';

const context = {
  publishedPackages: JSON.stringify([
    { name: '@algoux/renderer-core', version: '1.2.3' },
    { name: 'renderer_vue', version: '2.0.0-beta.1+build.2' },
  ]),
  commit: '1234567890abcdef1234567890abcdef12345678',
  repositoryUrl: 'https://github.com/algoux/standard-ranklist-renderer-component',
  runUrl: 'https://github.com/algoux/standard-ranklist-renderer-component/actions/runs/42',
};

test('lists every published package with its exact version and npm version URL', () => {
  const body = buildReleaseNotification(context);
  assert.match(body, /^## Published packages\n/);
  assert.ok(
    body.includes('- [@algoux/renderer-core@1.2.3](https://www.npmjs.com/package/@algoux/renderer-core/v/1.2.3)'),
  );
  assert.ok(
    body.includes(
      '- [renderer\\_vue@2.0.0-beta.1+build.2](https://www.npmjs.com/package/renderer_vue/v/2.0.0-beta.1%2Bbuild.2)',
    ),
  );
  assert.equal(body.split('\n').filter((line) => line.startsWith('- ')).length, 2);
  assert.ok(body.includes(`Commit: [1234567](${context.repositoryUrl}/commit/${context.commit})`));
  assert.ok(body.includes(`[View workflow run](${context.runUrl})`));
});

test('rejects malformed or empty published output instead of claiming a release', () => {
  for (const publishedPackages of [
    undefined,
    'bad json',
    '{}',
    '[]',
    '[null]',
    '[{}]',
    '[{"name":"pkg","version":null}]',
    '[{"name":"pkg](https://example.com)","version":"1.0.0"}]',
    '[{"name":"pkg","version":"1.0.0\nextra"}]',
  ]) {
    assert.throws(() => buildReleaseNotification({ ...context, publishedPackages }));
  }
});

test('rejects missing commit or unsafe context URLs', () => {
  assert.throws(() => buildReleaseNotification({ ...context, commit: undefined }), /commit SHA/);
  assert.throws(
    () =>
      buildReleaseNotification({
        ...context,
        repositoryUrl: 'https://example.com/)[injected](https://other.example)',
      }),
    /HTTPS/,
  );
});

test('allows exactly 4000 characters and rejects overflow without truncating the list', () => {
  const base = buildReleaseNotification(context);
  const runUrl = context.runUrl + 'a'.repeat(4000 - base.length);
  const body = buildReleaseNotification({ ...context, runUrl });
  assert.equal(body.length, 4000);
  assert.throws(() => buildReleaseNotification({ ...context, runUrl: runUrl + 'a' }), /4000-character/);
});

test('CLI writes a complete multiline body output with a unique safe delimiter', () => {
  const tempDir = mkdtempSync(join(tmpdir(), 'renderer-notification-'));
  const outputPath = join(tempDir, 'output');
  const script = fileURLToPath(new URL('./build-release-notification.mjs', import.meta.url));
  const env = {
    ...process.env,
    PUBLISHED_PACKAGES: context.publishedPackages,
    RELEASE_COMMIT: context.commit,
    REPOSITORY_URL: context.repositoryUrl,
    WORKFLOW_RUN_URL: context.runUrl,
    GITHUB_OUTPUT: outputPath,
  };
  try {
    execFileSync(process.execPath, [script], { env });
    const output = readFileSync(outputPath, 'utf8');
    const [header, ...remaining] = output.split('\n');
    const delimiter = header.replace(/^body<</, '');
    assert.match(delimiter, /^meowpush_[0-9a-f-]+$/);
    assert.equal(remaining.at(-2), delimiter);
    assert.equal(remaining.slice(0, -2).join('\n'), buildReleaseNotification(context));
    const result = spawnSync(process.execPath, [script], {
      env: { ...env, PUBLISHED_PACKAGES: '[]' },
      encoding: 'utf8',
    });
    assert.notEqual(result.status, 0);
    assert.equal(readFileSync(outputPath, 'utf8'), output, 'Invalid input must not emit a new successful output');
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});
