import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import semver from 'semver';

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));
const packagesDir = resolve(rootDir, 'packages');

const args = process.argv.slice(2);
const jsonOutput = args.includes('--json');
const sinceIndex = args.indexOf('--since');
const sinceTag = sinceIndex >= 0 ? args[sinceIndex + 1] : null;

if (sinceIndex >= 0 && !sinceTag) {
  throw new Error('Missing value for --since');
}

function getPublishedPackages() {
  const packages = [];

  for (const dirName of readdirSync(packagesDir, { withFileTypes: true })) {
    if (!dirName.isDirectory()) {
      continue;
    }

    const packageRoot = join(packagesDir, dirName.name);
    const packageJsonPath = join(packageRoot, 'package.json');
    if (!existsSync(packageJsonPath)) {
      continue;
    }

    const pkg = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
    if (pkg.private === true) {
      continue;
    }

    packages.push({
      dirName: dirName.name,
      dirPath: `packages/${dirName.name}`,
      name: pkg.name,
    });
  }

  return packages.sort((left, right) => left.name.localeCompare(right.name));
}

function getLatestReleaseTag() {
  const tags = execFileSync('git', ['tag'], { cwd: rootDir, encoding: 'utf8' })
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((tag) => ({
      tag,
      version: semver.valid(tag) || semver.valid(tag.replace(/^v/, '')),
    }))
    .filter((entry) => entry.version);

  if (!tags.length) {
    return null;
  }

  tags.sort((left, right) => semver.rcompare(left.version, right.version));
  return tags[0].tag;
}

function getChangedFiles(baseTag) {
  if (!baseTag) {
    return execFileSync('git', ['ls-files'], { cwd: rootDir, encoding: 'utf8' })
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
  }

  return execFileSync('git', ['diff', '--name-only', `${baseTag}...HEAD`], { cwd: rootDir, encoding: 'utf8' })
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

function isRelevantSharedFile(filePath) {
  if (filePath.startsWith('.changeset/') && filePath.endsWith('.md')) {
    return false;
  }

  const exactFiles = new Set([
    '.changeset/config.json',
    '.npmrc',
    'README.md',
    'package.json',
    'pnpm-lock.yaml',
    'pnpm-workspace.yaml',
    'tsconfig.json',
    'tsconfig.node.json',
    'vitest.release.config.ts',
  ]);

  if (exactFiles.has(filePath)) {
    return true;
  }

  return filePath.startsWith('scripts/') || filePath.startsWith('tests/release/');
}

function getChangesetStatus() {
  const tempDir = mkdtempSync(join(tmpdir(), 'changeset-status-'));
  const outputPath = join(tempDir, 'status.json');

  try {
    const result = spawnSync('pnpm', ['exec', 'changeset', 'status', '--output', outputPath], {
      cwd: rootDir,
      encoding: 'utf8',
    });

    if (result.status !== 0 && !existsSync(outputPath)) {
      return { changesets: [], releases: [], status: result.status ?? 1, stderr: result.stderr || '' };
    }

    const json = existsSync(outputPath)
      ? JSON.parse(readFileSync(outputPath, 'utf8'))
      : { changesets: [], releases: [] };

    return {
      changesets: json.changesets || [],
      releases: json.releases || [],
      status: result.status ?? 0,
      stderr: result.stderr || '',
    };
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
}

const publishedPackages = getPublishedPackages();
const packageByDir = new Map(publishedPackages.map((pkg) => [pkg.dirPath, pkg]));
const baselineTag = sinceTag || getLatestReleaseTag();
const changedFiles = getChangedFiles(baselineTag);
const changedPackages = new Set();
const sharedChanges = [];

for (const filePath of changedFiles) {
  const matchingPackage = publishedPackages.find((pkg) => filePath === pkg.dirPath || filePath.startsWith(`${pkg.dirPath}/`));
  if (matchingPackage) {
    changedPackages.add(matchingPackage.name);
    continue;
  }

  if (isRelevantSharedFile(filePath)) {
    sharedChanges.push(filePath);
  }
}

const changesetStatus = getChangesetStatus();
const plannedReleases = changesetStatus.releases
  .filter((release) => packageByDir.size || release.name)
  .map((release) => ({
    name: release.name,
    type: release.type,
    oldVersion: release.oldVersion,
    newVersion: release.newVersion,
    changesets: release.changesets || [],
  }))
  .sort((left, right) => left.name.localeCompare(right.name));

const plannedPackageNames = new Set(plannedReleases.map((release) => release.name));
const missingFromPlan = [...changedPackages].filter((name) => !plannedPackageNames.has(name)).sort();
const plannedOnly = plannedReleases.filter((release) => !changedPackages.has(release.name));

const result = {
  baselineTag,
  changedPackages: [...changedPackages].sort(),
  plannedReleases,
  missingFromPlan,
  plannedOnly: plannedOnly.map((release) => release.name),
  sharedChanges,
};

if (jsonOutput) {
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
} else {
  console.log(`Release audit baseline: ${baselineTag || 'no release tag found'}`);
  console.log(`Changed published packages: ${result.changedPackages.length ? result.changedPackages.join(', ') : '(none)'}`);

  if (plannedReleases.length) {
    console.log('Pending changeset plan:');
    for (const release of plannedReleases) {
      console.log(`- ${release.name}: ${release.type} ${release.oldVersion} -> ${release.newVersion}`);
    }
  } else {
    console.log('Pending changeset plan: (none)');
  }

  if (missingFromPlan.length) {
    console.log(`Packages changed since ${baselineTag || 'the repository start'} but missing from the pending plan:`);
    for (const name of missingFromPlan) {
      console.log(`- ${name}`);
    }
  } else {
    console.log('All changed published packages are represented in the pending changeset plan.');
  }

  if (plannedOnly.length) {
    console.log('Packages planned for release without direct package-directory diffs:');
    for (const release of plannedOnly) {
      console.log(`- ${release.name}`);
    }
  }

  if (sharedChanges.length) {
    console.log('Repo-level release-affecting changes to review manually:');
    for (const filePath of sharedChanges) {
      console.log(`- ${filePath}`);
    }
  }
}

if (changesetStatus.status !== 0 && changesetStatus.status !== 1) {
  process.stderr.write(changesetStatus.stderr);
  process.exit(changesetStatus.status);
}

if (missingFromPlan.length) {
  process.exitCode = 1;
}