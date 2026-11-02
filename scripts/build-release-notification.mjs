import { randomUUID } from 'node:crypto';
import { appendFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const packageNamePattern = /^(?:@[a-z0-9][a-z0-9._~-]*\/)?[a-z0-9][a-z0-9._~-]*$/;
const versionPattern = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;

function escapeMarkdownLabel(value) {
  return value.replace(/[\\`*_[\]]/g, '\\$&');
}

export function buildReleaseNotification({ publishedPackages, commit, repositoryUrl, runUrl }) {
  const packages = JSON.parse(publishedPackages);
  if (!Array.isArray(packages) || packages.length === 0) {
    throw new Error('Expected at least one published package.');
  }
  if (!/^[0-9a-f]{40}$/i.test(commit || '')) {
    throw new Error('Expected the released commit SHA.');
  }
  for (const url of [repositoryUrl, runUrl]) {
    if (typeof url !== 'string' || !/^https:\/\//.test(url) || /[\s<>()[\]]/.test(url)) {
      throw new Error('Expected HTTPS repository and workflow URLs.');
    }
  }

  const lines = packages.map((pkg) => {
    if (
      !pkg ||
      typeof pkg.name !== 'string' ||
      !packageNamePattern.test(pkg.name) ||
      typeof pkg.version !== 'string' ||
      !versionPattern.test(pkg.version)
    ) {
      throw new Error('Published packages must contain valid names and versions.');
    }
    const name = pkg.name.split('/').map(encodeURIComponent).join('/').replace(/^%40/, '@');
    const url = `https://www.npmjs.com/package/${name}/v/${encodeURIComponent(pkg.version)}`;
    return `- [${escapeMarkdownLabel(`${pkg.name}@${pkg.version}`)}](${url})`;
  });
  const body = [
    '## Published packages',
    '',
    ...lines,
    '',
    `Commit: [${commit.slice(0, 7)}](${repositoryUrl.replace(/\/$/, '')}/commit/${commit})`,
    `[View workflow run](${runUrl})`,
  ].join('\n');
  if (body.length > 4000) {
    throw new Error('Release notification exceeds the 4000-character body limit.');
  }
  return body;
}

export function writeBodyOutput(outputPath, body) {
  const delimiter = `meowpush_${randomUUID()}`;
  appendFileSync(outputPath, `body<<${delimiter}\n${body}\n${delimiter}\n`);
}

function main() {
  const body = buildReleaseNotification({
    publishedPackages: process.env.PUBLISHED_PACKAGES,
    commit: process.env.RELEASE_COMMIT,
    repositoryUrl: process.env.REPOSITORY_URL,
    runUrl: process.env.WORKFLOW_RUN_URL,
  });
  if (!process.env.GITHUB_OUTPUT) {
    throw new Error('GITHUB_OUTPUT is required.');
  }
  writeBodyOutput(process.env.GITHUB_OUTPUT, body);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main();
}
