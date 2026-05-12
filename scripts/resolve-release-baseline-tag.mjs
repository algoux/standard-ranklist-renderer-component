import { execFileSync } from 'node:child_process';
import semver from 'semver';

function getPublishedVersions() {
  const rawPackages = process.env.PUBLISHED_PACKAGES || '[]';
  const packages = JSON.parse(rawPackages);

  return packages
    .map((pkg) => semver.valid(pkg.version))
    .filter(Boolean)
    .sort(semver.rcompare);
}

function getExistingSemverTags() {
  return execFileSync('git', ['tag'], { encoding: 'utf8' })
    .split('\n')
    .map((tag) => tag.trim())
    .filter(Boolean)
    .map((tag) => ({
      tag,
      version: semver.valid(tag) || semver.valid(tag.replace(/^v/, '')),
    }))
    .filter((entry) => entry.version)
    .sort((left, right) => semver.rcompare(left.version, right.version));
}

const [highestPublishedVersion] = getPublishedVersions();
const [latestReleaseTag] = getExistingSemverTags();

if (!highestPublishedVersion) {
  process.exit(0);
}

const nextTag =
  latestReleaseTag && semver.lte(highestPublishedVersion, latestReleaseTag.version)
    ? semver.inc(latestReleaseTag.version, 'patch')
    : highestPublishedVersion;

process.stdout.write(`${nextTag}\n`);
