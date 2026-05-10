import semver from 'semver';

// @ts-ignore
export const srkSupportedVersions = SRK_SUPPORTED_VERSIONS;

export function caniuse(version: string): boolean {
  return semver.satisfies(version, srkSupportedVersions);
}
