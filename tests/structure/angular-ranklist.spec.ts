import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('angular ranklist implementation', () => {
  it('uses OnPush change detection for heavy ranklist rendering', () => {
    const source = readFileSync(join(process.cwd(), 'packages/angular/src/lib/ranklist/ranklist.component.ts'), 'utf8');

    expect(source).toMatch(/\bChangeDetectionStrategy\b/);
    expect(source).toMatch(/changeDetection:\s*ChangeDetectionStrategy\.OnPush/);
  });

  it('reuses shared core ranklist helpers instead of duplicating implementations', () => {
    const source = readFileSync(join(process.cwd(), 'packages/angular/src/lib/ranklist/ranklist-utils.ts'), 'utf8');
    const sharedHelpers = [
      'resolveSrkAssetUrl',
      'getAcceptedStatusDetails',
      'getSolutionResultMeta',
      'getSolutionModalTitle',
      'formatSolutionTimestamp',
      'getProblemHeaderBackgroundImage',
      'getMarkerPresentation',
      'shouldShowTimeColumn',
    ];

    expect(source).toContain("from '@algoux/standard-ranklist-renderer-component-core'");
    for (const helper of sharedHelpers) {
      expect(source).not.toMatch(new RegExp(`export function ${helper}\\b`));
    }
    expect(source).not.toContain('function withAlpha');
  });

  it('reuses shared core progress helpers instead of duplicating implementations', () => {
    const source = readFileSync(join(process.cwd(), 'packages/angular/src/lib/progress/progress-utils.ts'), 'utf8');
    const sharedHelpers = [
      'getProgressDurationMinutes',
      'getProgressMaxAvailableMinutes',
      'isProgressEnded',
      'getProgressMetrics',
    ];

    expect(source).toContain("from '@algoux/standard-ranklist-renderer-component-core'");
    for (const helper of sharedHelpers) {
      expect(source).not.toMatch(new RegExp(`export function ${helper}\\b`));
    }
    expect(source).not.toMatch(/export interface ProgressMetrics\b/);
  });

  it('reuses shared core ranklist public types instead of duplicating interfaces', () => {
    const source = readFileSync(join(process.cwd(), 'packages/angular/src/lib/types.ts'), 'utf8');

    expect(source).toContain("from '@algoux/standard-ranklist-renderer-component-core'");
    expect(source).not.toMatch(/export interface RankValue\b/);
    expect(source).not.toMatch(/export type StaticRanklist\b/);
    expect(source).not.toMatch(/export interface UserClickPayload\b/);
    expect(source).not.toMatch(/export interface SolutionClickPayload\b/);
  });
});
